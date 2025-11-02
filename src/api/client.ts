const API_BASE = (import.meta as any).env?.VITE_API_BASE || "http://localhost:8000";

export type CreateSessionPayload = {
  roleCategory: string;
  roleSubType?: string;
  experienceYears: number;
  experienceMonths: number;
  modes: string[];
  questionCount: number;
  durationLimit: number;
  language: string;
  accentPreference?: string;
  difficulty: "easy" | "medium" | "hard" | "adaptive";
  jobDescription?: string;
  resumeFileRef?: string;
  companyTargets: string[];
  includeCuratedQuestions: boolean;
  allowAIGenerated: boolean;
  enableMCQ?: boolean;
  enableFIB?: boolean;
  consentRecording: boolean;
  consentAntiCheat: boolean;
  consentTimestamp: string;
};

export async function login(email: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error("login_failed");
  return (await res.json()) as { token: string };
}

export async function createSession(userJwt: string, payload: CreateSessionPayload) {
  const res = await fetch(`${API_BASE}/interview/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${userJwt}` },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("create_session_failed");
  return (await res.json()) as { sessionId: string; ist: string; nextStep: string };
}

export async function issueAcet(sessionId: string) {
  const res = await fetch(`${API_BASE}/interview/${sessionId}/token/acet`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("issue_acet_failed");
  return (await res.json()) as { acet: string };
}

export async function submitPrecheck(sessionId: string, acet: string, checks: any, events: any[]) {
  const res = await fetch(`${API_BASE}/interview/${sessionId}/precheck`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${acet}` },
    body: JSON.stringify({ sessionId, checks, events }),
  });
  if (!res.ok) throw new Error("precheck_failed");
  return (await res.json()) as { precheckId: string; overallStatus: string; canProceed: boolean };
}

export async function startInterview(sessionId: string) {
  const res = await fetch(`${API_BASE}/interview/${sessionId}/start`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("start_failed");
  return (await res.json()) as { wst: string; aipt: string; upt: string };
}

export async function nextQuestion(sessionId: string, aipt: string) {
  const res = await fetch(`${API_BASE}/interview/${sessionId}/next-question`, {
    method: "POST",
    headers: { Authorization: `Bearer ${aipt}` },
  });
  if (!res.ok) throw new Error("next_question_failed");
  return (await res.json()) as {
    questionId: string;
    questionNumber: number;
    totalQuestions: number;
    type: string;
    text: string;
    metadata: any;
  };
}

export async function getAntiCheatTail(sessionId: string, userJwt: string) {
  const res = await fetch(`${API_BASE}/interview/${sessionId}/anti-cheat/tail`, {
    method: "GET",
    headers: { Authorization: `Bearer ${userJwt}` },
  });
  if (!res.ok) throw new Error("acet_tail_failed");
  return (await res.json()) as { seq: number; hash: string };
}

export async function emitAntiCheat(sessionId: string, acet: string, events: Array<{ sessionId: string; seq: number; type: string; details: any; ts: string; prevHash: string }>) {
  const res = await fetch(`${API_BASE}/interview/${sessionId}/anti-cheat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${acet}` },
    body: JSON.stringify({ sessionId, checks: {}, events }),
  });
  if (!res.ok) throw new Error("acet_emit_failed");
  return (await res.json()) as { tailSeq: number; tailHash: string };
}

export async function getSummary(sessionId: string, userJwt: string) {
  const res = await fetch(`${API_BASE}/interview/${sessionId}/summary`, {
    method: "GET",
    headers: { Authorization: `Bearer ${userJwt}` },
  });
  if (!res.ok) throw new Error("summary_fetch_failed");
  return (await res.json()) as { sessionId: string; rubric: any; strengths: string[]; gaps: string[]; scoreBreakdown: any };
}

export async function getReview(sessionId: string, userJwt: string) {
  const res = await fetch(`${API_BASE}/interview/${sessionId}/review`, {
    method: "GET",
    headers: { Authorization: `Bearer ${userJwt}` },
  });
  if (!res.ok) throw new Error("review_fetch_failed");
  return (await res.json()) as { items: Array<{ questionId: string; number: number; type: string; text: string; yourAnswer?: string | null; answers: any[] }> };
}

export async function codeEval(sessionId: string, ist: string, payload: { code: string; functionName: string; tests: any[] }) {
  const res = await fetch(`${API_BASE}/interview/${sessionId}/code-eval`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ist}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("code_eval_failed");
  return (await res.json()) as { results: Array<{ input: any; expected: any; actual?: any; pass: boolean; error?: string }>; passed: number; total: number };
}

export async function submitAnswer(sessionId: string, ist: string, payload: {
  questionId: string;
  answerType: "voice" | "text" | "code" | "mcq" | "fib";
  responseText?: string;
  audioRef?: string;
  codeRef?: string;
  mcqSelected?: string[];
  fibEntries?: any[];
  transcripts?: { speaker: string; text: string; timestamp: string }[];
  timeSpent?: number;
}) {
  const res = await fetch(`${API_BASE}/interview/${sessionId}/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ist}` },
    body: JSON.stringify({ sessionId, ...payload }),
  });
  if (!res.ok) throw new Error("submit_answer_failed");
  return (await res.json()) as { status: string; immediateFeedback?: { score?: number; feedback?: string; modelAnswer?: string } };
}

export async function finalize(sessionId: string, ist: string) {
  const res = await fetch(`${API_BASE}/interview/${sessionId}/finalize`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ist}` },
  });
  if (!res.ok) throw new Error("finalize_failed");
  return (await res.json()) as { summaryId: string; status: string };
}

export function wsUrlFor(path: string) {
  const u = new URL(API_BASE);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  u.pathname = path;
  return u.toString();
}

export { API_BASE };

export async function refreshTokens(sessionId: string) {
  const res = await fetch(`${API_BASE}/interview/${sessionId}/token/refresh`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("refresh_failed");
  return (await res.json()) as { ist?: string; wst?: string };
}

export async function issueAipt(sessionId: string) {
  const res = await fetch(`${API_BASE}/interview/${sessionId}/token/aipt`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("aipt_failed");
  return (await res.json()) as { aipt: string };
}

export async function getState(sessionId: string, userJwt: string) {
  const res = await fetch(`${API_BASE}/interview/${sessionId}/state`, {
    method: "GET",
    headers: { Authorization: `Bearer ${userJwt}` },
    credentials: "include",
  });
  if (!res.ok) throw new Error("state_failed");
  return (await res.json()) as { state: string; askedCount: number };
}
