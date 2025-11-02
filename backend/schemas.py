from typing import List, Optional, Any, Literal
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    email: str
    name: Optional[str] = None


class UserJWT(BaseModel):
    token: str


class CreateSessionRequest(BaseModel):
    userId: Optional[str] = None
    roleCategory: str
    roleSubType: Optional[str] = None
    experienceYears: int
    experienceMonths: int
    modes: List[str]
    questionCount: int
    durationLimit: int
    language: str
    accentPreference: Optional[str] = None
    difficulty: Literal["easy", "medium", "hard", "adaptive"]
    jobDescription: Optional[str] = None
    resumeFileRef: Optional[str] = None
    companyTargets: List[str] = []
    includeCuratedQuestions: bool = True
    allowAIGenerated: bool = True
    enableMCQ: Optional[bool] = None
    enableFIB: Optional[bool] = None
    consentRecording: bool
    consentAntiCheat: bool
    consentTimestamp: str


class CreateSessionResponse(BaseModel):
    sessionId: str
    ist: str
    nextStep: Literal["precheck"]


class AntiCheatEvent(BaseModel):
    sessionId: str
    seq: int
    type: str
    details: Any
    ts: str
    prevHash: str


class PrecheckPayload(BaseModel):
    sessionId: str
    checks: dict
    events: List[AntiCheatEvent] = []


class PrecheckResponse(BaseModel):
    precheckId: str
    sessionId: str
    overallStatus: Literal["pass", "warning", "fail"]
    canProceed: bool


class StartResponse(BaseModel):
    wst: str
    aipt: str
    upt: str
    nextStep: Literal["interview"]


class NextQuestionResponse(BaseModel):
    questionId: str
    questionNumber: int
    totalQuestions: int
    type: str
    text: str
    metadata: dict = {}


class SubmitAnswerRequest(BaseModel):
    sessionId: str
    questionId: str
    answerType: Literal["voice", "text", "code", "mcq", "fib"]
    responseText: Optional[str] = None
    audioRef: Optional[str] = None
    codeRef: Optional[str] = None
    mcqSelected: Optional[List[str]] = None
    fibEntries: Optional[List[dict]] = None
    transcripts: Optional[List[dict]] = None
    timeSpent: Optional[int] = None
    codeTests: Optional[List[dict]] = None


class SubmitAnswerResponse(BaseModel):
  status: Literal["submitted"]
  immediateFeedback: Optional[dict] = None


class CodeEvalRequest(BaseModel):
    code: str
    functionName: str
    tests: List[dict]


class CodeEvalResponse(BaseModel):
    results: List[dict]
    passed: int
    total: int


class FinalizeResponse(BaseModel):
    summaryId: str
    status: Literal["Completed", "Ended"]


class SummaryResponse(BaseModel):
    sessionId: str
    rubric: Any
    strengths: List[str]
    gaps: List[str]
    scoreBreakdown: Any


class TokenRefreshResponse(BaseModel):
    ist: Optional[str] = None
    wst: Optional[str] = None
