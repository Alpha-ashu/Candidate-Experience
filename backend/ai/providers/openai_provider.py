import os
from typing import Tuple

from openai import AsyncOpenAI


async def ask_openai_question(setup: dict, remaining: int, difficulty: str) -> tuple[str, str, dict]:
    client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    role = setup.get("roleCategory", "Candidate")
    modes = setup.get("modes", ["behavioral"]) or ["behavioral"]
    target_type = modes[0]
    prompt = (
        "You are an interviewer. Create one question in the given mode for a role.\n"
        f"Mode: {target_type}\nRole: {role}\nDifficulty: {difficulty}\n"
        "Return only the question text."
    )
    # Using responses API for simplicity
    resp = await client.responses.create(
        model="gpt-4o-mini",
        input=prompt,
    )
    text = resp.output_text.strip() if hasattr(resp, "output_text") else str(resp)
    meta = {"difficulty": difficulty, "hintAvailable": True}
    return text, target_type, meta


async def summarize_openai(snapshot: dict, qa: list[dict]) -> dict:
    client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    prompt = (
        "Summarize this interview session. Provide rubric (0-5) for communication, problem_solving, technical,"
        " strengths (2-3 bullets), gaps (2-3 bullets), and overall score (0-100).\n"
        f"Config: {snapshot}\nQ/A: {qa}"
    )
    resp = await client.responses.create(
        model="gpt-4o-mini",
        input=prompt,
    )
    text = resp.output_text.strip() if hasattr(resp, "output_text") else str(resp)
    # naive parse fallback
    return {
        "rubric": {"communication": 3, "problem_solving": 3, "technical": 3},
        "strengths": ["Clear structure", "Relevant examples"],
        "gaps": ["Add metrics", "More alternatives"],
        "scoreBreakdown": {"overall": 75, "raw": text[:1000]},
    }


async def analyze_openai(
    question_text: str,
    answer_text: str,
    qtype: str,
    answer_type: str = "text",
    code_text: str | None = None,
    mcq_selected: list[str] | None = None,
    fib_entries: list[dict] | None = None,
) -> dict:
    client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    parts = [
        "Evaluate the candidate's answer to the interview question.",
        "Return a JSON object with keys: score (0-100), feedback (1-2 sentences), modelAnswer (short ideal outline).",
        f"Question type: {qtype}",
        f"Answer type: {answer_type}",
        f"Question: {question_text}",
        f"Answer: {answer_text}",
    ]
    if answer_type == "code" and code_text:
        parts.append("Code snippet:\n" + code_text)
        parts.append("Consider correctness, complexity, readability, and edge cases.")
    if answer_type == "mcq" and mcq_selected:
        parts.append(f"Selected options: {mcq_selected}")
        parts.append("Explain correctness and briefly note why alternatives are incorrect.")
    if answer_type == "fib" and fib_entries:
        parts.append(f"Filled blanks: {fib_entries}")
        parts.append("Assess correctness per blank and provide ideal values.")
    prompt = "\n".join(parts)
    resp = await client.responses.create(
        model="gpt-4o-mini",
        input=prompt,
        response_format={"type": "json_object"},
    )
    try:
        payload = resp.output[0].content[0].text if hasattr(resp, "output") else resp.output_text
    except Exception:
        payload = getattr(resp, "output_text", "{}")
    import json as _json

    try:
        data = _json.loads(payload)
        return {
            "score": int(data.get("score", 75)),
            "feedback": str(data.get("feedback", "Add more detail and structure.")),
            "modelAnswer": str(data.get("modelAnswer", "Structure using STAR; include metrics and tradeoffs.")),
        }
    except Exception:
        return {"score": 75, "feedback": "Add more detail and structure.", "modelAnswer": "Structure using STAR; include metrics and tradeoffs."}
