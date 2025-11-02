from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
import multiprocessing as mp

from ..db import get_database
from ..security.jwt import mint_jwt
from ..security.deps import auth_user, auth_ist, auth_ai_proxy, auth_acet, auth_session_cookie
from ..schemas import (
    CreateSessionRequest,
    CreateSessionResponse,
    PrecheckPayload,
    PrecheckResponse,
    StartResponse,
    NextQuestionResponse,
    SubmitAnswerRequest,
    FinalizeResponse,
    SummaryResponse,
    TokenRefreshResponse,
    CodeEvalRequest,
    CodeEvalResponse,
)
from ..utils.ids import new_id
import hashlib, json
from ..config import settings
from ..utils.broadcast import broker
from ..ai.proxy import generate_question, summarize_session, analyze_qa


router = APIRouter(prefix="/interview", tags=["interview"])


@router.post("/sessions", response_model=CreateSessionResponse)
async def create_session(req: CreateSessionRequest, user=Depends(auth_user)):
    if not req.consentRecording or not req.consentAntiCheat:
        raise HTTPException(status_code=400, detail="consent_required")
    db = get_database()
    session_id = new_id()
    now = datetime.utcnow().isoformat()
    doc = {
        "_id": session_id,
        "userId": user["sub"],
        "state": "PendingPrecheck",
        "config": req.model_dump(),
        "createdAt": now,
        "askedCount": 0,
        "awaitingAnswer": False,
    }
    await db["sessions"].insert_one(doc)

    ist = mint_jwt(
        sub=user["sub"],
        role="candidate",
        scopes=[f"interview:session:{session_id}"],
        aud="interview-api",
        session_id=session_id,
        ttl_seconds=settings.ttl_ist,
        extra={"remainingQuestions": req.questionCount},
    )
    return CreateSessionResponse(sessionId=session_id, ist=ist, nextStep="precheck")


@router.post("/{session_id}/precheck", response_model=PrecheckResponse)
async def submit_precheck(session_id: str, payload: PrecheckPayload, _=Depends(auth_acet)):
    db = get_database()
    sess = await db["sessions"].find_one({"_id": session_id})
    if not sess:
        raise HTTPException(status_code=404, detail="session_not_found")
    if sess["state"] not in ["PendingPrecheck", "Paused"]:
        raise HTTPException(status_code=409, detail="invalid_state")

    # Persist anti-cheat events append-only with chain verification
    events = [e.model_dump() for e in (payload.events or [])]
    if events:
        # Load current tail
        last = await db["anti_cheat_events"].find({"sessionId": session_id}).sort("seq", -1).limit(1).to_list(1)
        last_seq = last[0]["seq"] if last else 0
        last_hash = last[0].get("hash") if last else ""

        # Validate sequence strictly increasing
        events_sorted = sorted(events, key=lambda x: x["seq"])
        if events_sorted[0]["seq"] <= last_seq:
            raise HTTPException(status_code=400, detail="event_seq_replay_or_out_of_order")
        # Validate chain
        prior_hash = last_hash
        enriched = []
        for ev in events_sorted:
            if ev.get("prevHash") != prior_hash:
                raise HTTPException(status_code=400, detail="event_chain_broken")
            digest = hashlib.sha256()
            digest.update(str(ev.get("sessionId")).encode())
            digest.update(str(ev.get("seq")).encode())
            digest.update(str(ev.get("type")).encode())
            digest.update(str(ev.get("ts")).encode())
            digest.update(json.dumps(ev.get("details"), sort_keys=True).encode())
            digest.update(str(prior_hash).encode())
            ev_hash = digest.hexdigest()
            prior_hash = ev_hash

            ev_record = {
                **ev,
                "_id": new_id(),
                "hash": ev_hash,
                "createdAt": datetime.utcnow().isoformat(),
            }
            enriched.append(ev_record)

        if enriched:
            await db["anti_cheat_events"].insert_many(enriched)

    # Very simple policy: if network warnings present -> warning else pass
    checks = payload.checks or {}
    overall = "pass"
    net = checks.get("network", {})
    if isinstance(net, dict) and net.get("status") == "warning":
        overall = "warning"

    await db["sessions"].update_one({"_id": session_id}, {"$set": {"state": "Ready", "precheck": checks}})

    return PrecheckResponse(
        precheckId=new_id(), sessionId=session_id, overallStatus=overall, canProceed=True
    )


@router.post("/{session_id}/start", response_model=StartResponse)
async def start_interview(session_id: str, _=Depends(auth_session_cookie)):
    if db is None:
        raise HTTPException(status_code=500, detail="database_not_connected")
    sess = await db["sessions"].find_one({"_id": session_id})
    if not sess:
        raise HTTPException(status_code=404, detail="session_not_found")
    if sess["state"] != "Ready":
        raise HTTPException(status_code=409, detail="invalid_state")

    # Issue WST/AIPT/UPT
    wst = mint_jwt(
        sub=sess["userId"],
        role="candidate",
        scopes=[f"ws:interview:{session_id}"],
        aud="interview-ws",
        session_id=session_id,
        ttl_seconds=settings.ttl_wst,
    )
    aipt = mint_jwt(
        sub=sess["userId"],
        role="candidate",
        scopes=["ai:ask"],
        aud="ai-proxy",
        session_id=session_id,
        ttl_seconds=settings.ttl_aupt,
        extra={
            "remainingQuestions": sess["config"]["questionCount"] - sess.get("askedCount", 0),
            "modes": sess["config"].get("modes", []),
            "difficulty": sess["config"].get("difficulty"),
        },
    )
    upt = mint_jwt(
        sub="media",
        role="system",
        scopes=[f"upload:session:{session_id}"],
        aud="upload",
        session_id=session_id,
        ttl_seconds=settings.ttl_upt,
    )
    await db["sessions"].update_one({"_id": session_id}, {"$set": {"state": "Active"}})
    return StartResponse(wst=wst, aipt=aipt, upt=upt, nextStep="interview")


@router.post("/{session_id}/next-question", response_model=NextQuestionResponse)
async def next_question(session_id: str, claims=Depends(auth_ai_proxy)):
    if db is None:
        raise HTTPException(status_code=500, detail="database_not_connected")
    sess = await db["sessions"].find_one({"_id": session_id})
    if not sess:
        raise HTTPException(status_code=404, detail="session_not_found")
    if sess["state"] != "Active":
        raise HTTPException(status_code=409, detail="invalid_state")
    if sess.get("awaitingAnswer"):
        raise HTTPException(status_code=409, detail="answer_required")
    # Simple rate limit: one question every 5 seconds per session
    last_asked_at = sess.get("lastAskedAt")
    if last_asked_at:
        try:
            last_dt = datetime.fromisoformat(last_asked_at)
            if (datetime.utcnow() - last_dt).total_seconds() < 5:
                raise HTTPException(status_code=429, detail="rate_limited")
        except Exception:
            pass

    total = sess["config"]["questionCount"]
    asked = sess.get("askedCount", 0)
    if asked >= total:
        raise HTTPException(status_code=400, detail="no_questions_remaining")

    remaining = total - asked
    q = await generate_question(sess["config"], remaining=remaining, difficulty=sess["config"]["difficulty"])
    qid = new_id()
    rec = {
        "_id": qid,
        "sessionId": session_id,
        "number": asked + 1,
        "type": q.type,
        "text": q.text,
        "metadata": q.metadata,
        "createdAt": datetime.utcnow().isoformat(),
    }
    await db["questions"].insert_one(rec)
    await db["sessions"].update_one(
        {"_id": session_id}, {"$set": {"awaitingAnswer": True, "lastAskedAt": datetime.utcnow().isoformat()}, "$inc": {"askedCount": 1}}
    )

    await broker.emit(
        f"session:{session_id}",
        {"type": "QUESTION_CREATED", "questionId": qid, "qtype": q.type, "number": asked + 1},
    )

    return NextQuestionResponse(
        questionId=qid,
        questionNumber=asked + 1,
        totalQuestions=total,
        type=q.type,
        text=q.text,
        metadata=q.metadata,
    )


@router.post("/{session_id}/answer")
async def submit_answer(session_id: str, req: SubmitAnswerRequest, _=Depends(auth_ist)):
    if db is None:
        raise HTTPException(status_code=500, detail="database_not_connected")
    sess = await db["sessions"].find_one({"_id": session_id})
    if not sess:
        raise HTTPException(status_code=404, detail="session_not_found")
    if sess["state"] != "Active":
        raise HTTPException(status_code=409, detail="invalid_state")

    ans = req.model_dump()
    ans["_id"] = new_id()
    ans["createdAt"] = datetime.utcnow().isoformat()
    await db["answers"].insert_one(ans)
    await db["sessions"].update_one({"_id": session_id}, {"$set": {"awaitingAnswer": False}})

    # Immediate per-question analysis (non-streaming)
    feedback = None
    try:
        qdoc = await db["questions"].find_one({"_id": req.questionId, "sessionId": session_id})
        if qdoc:
            feedback = await analyze_qa(qdoc, ans)
            await db["answers"].update_one({"_id": ans["_id"]}, {"$set": {"immediateFeedback": feedback}})
            await broker.emit(
                f"session:{session_id}",
                {"type": "FEEDBACK_CREATED", "questionId": req.questionId, "feedback": feedback},
            )
    except Exception:
        pass

    return {"status": "submitted", "immediateFeedback": feedback}


def _restricted_builtins():
    allowed = {
        "len": len,
        "range": range,
        "list": list,
        "dict": dict,
        "set": set,
        "sum": sum,
        "min": min,
        "max": max,
        "sorted": sorted,
        "enumerate": enumerate,
        "abs": abs,
        "all": all,
        "any": any,
    }
    return allowed


def _code_worker(code: str, fname: str, inp, expected, q: mp.Queue):
    try:
        globals_dict = {"__builtins__": _restricted_builtins()}
        locals_dict: dict[str, object] = {}
        exec(code, globals_dict, locals_dict)
        func = locals_dict.get(fname) or globals_dict.get(fname)
        if not callable(func):
            q.put({"error": "function_not_found"})
            return
        if isinstance(inp, list):
            actual = func(*inp)
        else:
            actual = func(inp)
        ok = actual == expected
        try:
            q.put({"actual": actual, "pass": ok})
        except Exception:
            # Fallback to string representation if not serializable
            q.put({"actual": repr(actual), "pass": ok})
    except Exception as e:
        q.put({"error": str(e)})


@router.post("/{session_id}/code-eval", response_model=CodeEvalResponse)
async def code_eval(session_id: str, body: CodeEvalRequest, _=Depends(auth_ist)):
    if db is None:
        raise HTTPException(status_code=500, detail="database_not_connected")
    # Minimal, non-production sandbox for Python code. No imports, limited builtins.
    code = body.code or ""
    fname = body.functionName or "solution"
    tests = body.tests or []
    # Disallow dangerous tokens quickly
    banned = ["import ", "__import__", "open(", "exec(", "eval(", "os.", "sys.", "subprocess", "socket", "thread", "fork", "spawn"]
    lowered = code.lower()
    for token in banned:
        if token in lowered:
            raise HTTPException(status_code=400, detail="disallowed_code")

    results: list[dict] = []
    passed = 0
    for t in tests:
        inp = t.get("input", [])
        exp = t.get("expected")
        q = mp.Queue()
        p = mp.Process(target=_code_worker, args=(code, fname, inp, exp, q))
        p.start()
        p.join(1.0)
        if p.is_alive():
            try:
                p.terminate()
            except Exception:
                pass
            results.append({"input": inp, "expected": exp, "pass": False, "error": "timeout"})
        else:
            try:
                res = q.get_nowait()
            except Exception:
                res = {"error": "no_result"}
            if res.get("error"):
                results.append({"input": inp, "expected": exp, "pass": False, "error": res.get("error")})
            else:
                ok = bool(res.get("pass"))
                if ok:
                    passed += 1
                results.append({"input": inp, "expected": exp, "actual": res.get("actual"), "pass": ok})

    return CodeEvalResponse(results=results, passed=passed, total=len(tests))


@router.post("/{session_id}/finalize", response_model=FinalizeResponse)
async def finalize(session_id: str, _=Depends(auth_ist)):
    if db is None:
        raise HTTPException(status_code=500, detail="database_not_connected")
    sess = await db["sessions"].find_one({"_id": session_id})
    if not sess:
        raise HTTPException(status_code=404, detail="session_not_found")

    qs_cursor = db["questions"].find({"sessionId": session_id}).sort("number", 1)
    ans_cursor = db["answers"].find({"sessionId": session_id})
    questions: list[dict] = []
    async for q in qs_cursor:
        questions.append(q)
    answers_map: dict[str, list[dict]] = {}
    async for a in ans_cursor:
        answers_map.setdefault(a["questionId"], []).append(a)

    # Build qa list for summary
    qa: list[dict] = []
    per_question: list[dict] = []
    for q in questions:
        qa.append({"q": {k: q[k] for k in ("number", "type", "text", "metadata")}})
        qid = q["_id"]
        lst = sorted(answers_map.get(qid, []), key=lambda x: x.get("createdAt", ""))
        last_answer = lst[-1] if lst else None
        try:
            analysis = await analyze_qa(q, last_answer)
        except Exception:
            analysis = {"score": 75, "feedback": "Add more detail and structure.", "modelAnswer": "Structure using STAR; include metrics and tradeoffs."}
        per_question.append({
            "questionId": qid,
            "number": q.get("number"),
            **analysis,
        })

    summary = await summarize_session(sess["config"], qa)
    sid = new_id()
    await db["summaries"].insert_one(
        {
            "_id": sid,
            "sessionId": session_id,
            "summary": summary,
            "perQuestion": per_question,
            "createdAt": datetime.utcnow().isoformat(),
        }
    )
    await db["sessions"].update_one({"_id": session_id}, {"$set": {"state": "Completed", "sealedAt": datetime.utcnow().isoformat()}})
    return FinalizeResponse(summaryId=sid, status="Completed")


@router.get("/{session_id}/summary", response_model=SummaryResponse)
async def get_summary(session_id: str, _=Depends(auth_user)):
    if db is None:
        raise HTTPException(status_code=500, detail="database_not_connected")
    doc = await db["summaries"].find_one({"sessionId": session_id})
    if not doc:
        raise HTTPException(status_code=404, detail="not_found")
    s = doc["summary"]
    return SummaryResponse(
        sessionId=session_id,
        rubric=s.get("rubric", {}),
        strengths=s.get("strengths", []),
        gaps=s.get("gaps", []),
        scoreBreakdown=s.get("scoreBreakdown", {}),
    )


@router.get("/{session_id}/review")
async def get_review(session_id: str, _=Depends(auth_user)):
    if db is None:
        raise HTTPException(status_code=500, detail="database_not_connected")
    # Collect questions and latest answer per question (if any)
    q_cursor = db["questions"].find({"sessionId": session_id}).sort("number", 1)
    a_cursor = db["answers"].find({"sessionId": session_id})
    answers_by_q: dict[str, list[dict]] = {}
    async for a in a_cursor:
        answers_by_q.setdefault(a.get("questionId"), []).append(a)

    items: list[dict] = []
    # Load per-question analysis from summary if available
    sdoc = await db["summaries"].find_one({"sessionId": session_id})
    perq = {str(p.get("questionId")): p for p in (sdoc.get("perQuestion", []) if sdoc else [])}
    async for q in q_cursor:
        qid = str(q.get("_id"))
        answers = answers_by_q.get(qid, [])
        latest_answer = None
        if answers:
            latest_answer = sorted(answers, key=lambda x: x.get("createdAt", ""))[-1]
        merged = perq.get(qid, {})
        items.append(
            {
                "questionId": qid,
                "number": q.get("number"),
                "type": q.get("type"),
                "text": q.get("text"),
                "metadata": q.get("metadata", {}),
                "yourAnswer": (latest_answer or {}).get("responseText", None),
                "answerType": (latest_answer or {}).get("answerType"),
                "mcqSelected": (latest_answer or {}).get("mcqSelected"),
                "fibEntries": (latest_answer or {}).get("fibEntries"),
                "codeTests": (latest_answer or {}).get("codeTests"),
                "answers": [
                    {
                        "id": a.get("_id"),
                        "answerType": a.get("answerType"),
                        "responseText": a.get("responseText"),
                        "createdAt": a.get("createdAt"),
                    }
                    for a in (answers or [])
                ],
                "score": merged.get("score"),
                "feedback": merged.get("feedback"),
                "modelAnswer": merged.get("modelAnswer"),
            }
        )

    return {"items": items}


@router.post("/{session_id}/token/refresh", response_model=TokenRefreshResponse)
async def refresh_tokens(session_id: str, sess_claims=Depends(auth_session_cookie)):
    if db is None:
        raise HTTPException(status_code=500, detail="database_not_connected")
    sess = await db["sessions"].find_one({"_id": session_id})
    if not sess:
        raise HTTPException(status_code=404, detail="session_not_found")

    ist = mint_jwt(
        sub=sess["userId"],
        role="candidate",
        scopes=[f"interview:session:{session_id}"],
        aud="interview-api",
        session_id=session_id,
        ttl_seconds=settings.ttl_ist,
    )
    wst = None
    if sess["state"] == "Active":
        wst = mint_jwt(
            sub=sess["userId"],
            role="candidate",
            scopes=[f"ws:interview:{session_id}"],
            aud="interview-ws",
            session_id=session_id,
            ttl_seconds=settings.ttl_wst,
        )
    return TokenRefreshResponse(ist=ist, wst=wst)


@router.get("/{session_id}/state")
async def get_state(session_id: str, _=Depends(auth_user)):
    if db is None:
        raise HTTPException(status_code=500, detail="database_not_connected")
    sess = await db["sessions"].find_one({"_id": session_id}, {"projection": {"_id": 0}})
    if not sess:
        raise HTTPException(status_code=404, detail="session_not_found")
    return {"state": sess["state"], "askedCount": sess.get("askedCount", 0)}


@router.post("/{session_id}/token/acet")
async def issue_acet(session_id: str, _=Depends(auth_session_cookie)):
    if db is None:
        raise HTTPException(status_code=500, detail="database_not_connected")
    sess = await db["sessions"].find_one({"_id": session_id})
    if not sess:
        raise HTTPException(status_code=404, detail="session_not_found")
    acet = mint_jwt(
        sub=sess["userId"],
        role="candidate",
        scopes=[f"anti-cheat:emit:{session_id}"],
        aud="anti-cheat",
        session_id=session_id,
        ttl_seconds=settings.ttl_ist,
    )
    return {"acet": acet}


@router.post("/{session_id}/token/aipt")
async def issue_aipt(session_id: str, _=Depends(auth_session_cookie)):
    if db is None:
        raise HTTPException(status_code=500, detail="database_not_connected")
    sess = await db["sessions"].find_one({"_id": session_id})
    if not sess:
        raise HTTPException(status_code=404, detail="session_not_found")
    if sess["state"] != "Active":
        raise HTTPException(status_code=409, detail="invalid_state")
    aipt = mint_jwt(
        sub=sess["userId"],
        role="candidate",
        scopes=["ai:ask"],
        aud="ai-proxy",
        session_id=session_id,
        ttl_seconds=settings.ttl_aupt,
        extra={
            "remainingQuestions": sess["config"]["questionCount"] - sess.get("askedCount", 0),
            "modes": sess["config"].get("modes", []),
            "difficulty": sess["config"].get("difficulty"),
        },
    )
    return {"aipt": aipt}


def _eval_strike(event: dict) -> dict | None:
    etype = event.get("type", "")
    ts = event.get("ts")
    # Minimal sample policy
    if etype == "SCREENSHOT_ATTEMPT":
        return {"type": etype, "severity": "red", "ts": ts, "details": event.get("details")}
    if etype == "FS_EXIT":
        return {"type": etype, "severity": "yellow", "ts": ts, "details": event.get("details")}
    if etype == "TAB_SWITCH":
        return {"type": etype, "severity": "yellow", "ts": ts, "details": event.get("details")}
    if etype == "FACE_MISSING":
        dur = 0
        try:
            dur = float(event.get("details", {}).get("duration", 0))
        except Exception:
            pass
        sev = "yellow" if dur <= 2 else "red"
        return {"type": etype, "severity": sev, "ts": ts, "details": event.get("details")}
    return None


@router.get("/{session_id}/anti-cheat/tail")
async def anti_cheat_tail(session_id: str, _=Depends(auth_user)):
    if db is None:
        raise HTTPException(status_code=500, detail="database_not_connected")
    last = await db["anti_cheat_events"].find({"sessionId": session_id}).sort("seq", -1).limit(1).to_list(1)
    if not last:
        return {"seq": 0, "hash": ""}
    return {"seq": last[0].get("seq", 0), "hash": last[0].get("hash", "")}


@router.post("/{session_id}/anti-cheat")
async def anti_cheat_emit(session_id: str, payload: PrecheckPayload, _=Depends(auth_acet)):
    if db is None:
        raise HTTPException(status_code=500, detail="database_not_connected")
    sess = await db["sessions"].find_one({"_id": session_id})
    if not sess:
        raise HTTPException(status_code=404, detail="session_not_found")

    # Chain verification and persistence (reuse logic similar to precheck)
    events = [e.model_dump() for e in (payload.events or [])]
    tail = await db["anti_cheat_events"].find({"sessionId": session_id}).sort("seq", -1).limit(1).to_list(1)
    last_seq = tail[0]["seq"] if tail else 0
    last_hash = tail[0].get("hash") if tail else ""

    if events:
        events_sorted = sorted(events, key=lambda x: x["seq"])
        if events_sorted[0]["seq"] <= last_seq:
            raise HTTPException(status_code=400, detail="event_seq_replay_or_out_of_order")

        prior_hash = last_hash
        enriched = []
        strikes_to_insert = []
        for ev in events_sorted:
            if ev.get("prevHash") != prior_hash:
                raise HTTPException(status_code=400, detail="event_chain_broken")
            digest = hashlib.sha256()
            digest.update(str(ev.get("sessionId")).encode())
            digest.update(str(ev.get("seq")).encode())
            digest.update(str(ev.get("type")).encode())
            digest.update(str(ev.get("ts")).encode())
            digest.update(json.dumps(ev.get("details"), sort_keys=True).encode())
            digest.update(str(prior_hash).encode())
            ev_hash = digest.hexdigest()
            prior_hash = ev_hash
            rec = {**ev, "_id": new_id(), "hash": ev_hash, "createdAt": datetime.utcnow().isoformat()}
            enriched.append(rec)

            strike = _eval_strike(ev)
            if strike:
                strikes_to_insert.append({
                    "_id": new_id(),
                    "sessionId": session_id,
                    **strike,
                    "createdAt": datetime.utcnow().isoformat(),
                })

        if enriched:
            await db["anti_cheat_events"].insert_many(enriched)

        session_updates = {}
        auto_end_reason = None
        auto_pause = False
        if strikes_to_insert:
            await db["strikes"].insert_many(strikes_to_insert)
            # Update counters for policy
            incs = {}
            for s in strikes_to_insert:
                await broker.emit(f"session:{session_id}", {"type": "STRIKE_CREATED", **s})
                key = f"policyCounters.{s['type']}"
                incs[key] = incs.get(key, 0) + 1
                # Immediate end for screenshot attempts
                if s["type"] == "SCREENSHOT_ATTEMPT" and s["severity"] == "red":
                    auto_end_reason = auto_end_reason or "screenshot_attempt"
            if incs:
                await db["sessions"].update_one({"_id": session_id}, {"$inc": incs})
            # Check thresholds
            sess = await db["sessions"].find_one({"_id": session_id}, {"projection": {"policyCounters": 1, "state": 1}})
            pc = (sess or {}).get("policyCounters", {})
            if (pc.get("FS_EXIT", 0) or 0) >= 2 and sess.get("state") == "Active":
                auto_pause = True
            if (pc.get("FS_EXIT", 0) or 0) >= 3:
                auto_end_reason = auto_end_reason or "fs_exit_excess"

        # Apply auto-pause or auto-end
        if auto_pause:
            await db["sessions"].update_one({"_id": session_id}, {"$set": {"state": "Paused", "pauseReason": "fs_exit"}})
            await broker.emit(f"session:{session_id}", {"type": "SESSION_PAUSED", "reason": "fs_exit"})
        if auto_end_reason:
            # generate summary stub and seal
            sess = await db["sessions"].find_one({"_id": session_id})
            qs = db["questions"].find({"sessionId": session_id}).sort("number", 1)
            qa: list[dict] = []
            async for q in qs:
                qa.append({"q": {k: q[k] for k in ("number", "type", "text", "metadata")}})
            # Per-question quick analysis
            per_question: list[dict] = []
            for item in qa:
                qinfo = item["q"]
                # Find last answer for this number
                q_doc = await db["questions"].find_one({"sessionId": session_id, "number": qinfo["number"]})
                last_answer = await db["answers"].find({"sessionId": session_id, "questionId": q_doc["_id"]}).sort("createdAt", 1).to_list(None)
                last = last_answer[-1] if last_answer else None
                try:
                    analysis = await analyze_qa({"text": qinfo["text"], "type": qinfo["type"]}, last)
                except Exception:
                    analysis = {"score": 75, "feedback": "Add more detail and structure.", "modelAnswer": "Structure using STAR; include metrics and tradeoffs."}
                per_question.append({"questionId": q_doc["_id"], "number": qinfo["number"], **analysis})

            summary = await summarize_session(sess["config"], qa)
            await db["summaries"].insert_one(
                {"_id": new_id(), "sessionId": session_id, "summary": summary, "perQuestion": per_question, "createdAt": datetime.utcnow().isoformat()}
            )
            await db["sessions"].update_one(
                {"_id": session_id},
                {"$set": {"state": "Ended", "sealedAt": datetime.utcnow().isoformat(), "endCode": auto_end_reason}},
            )
            await broker.emit(f"session:{session_id}", {"type": "SESSION_ENDED", "reason": auto_end_reason})

        last_seq = enriched[-1]["seq"]
        last_hash = enriched[-1]["hash"]

    return {"tailSeq": last_seq, "tailHash": last_hash}
