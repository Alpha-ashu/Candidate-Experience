from typing import List, Optional, Any, Literal
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    email: str
    name: Optional[str] = None


class UserJWT(BaseModel):
    token: str
    refresh_token: Optional[str] = None
    device_id: Optional[str] = None
    mfa_required: Optional[bool] = False


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


# Live Interview Schemas
class LiveInterviewSession(BaseModel):
    sessionId: str
    candidateId: str
    recruiterId: Optional[str] = None
    scheduledTime: str
    duration: int
    status: Literal["scheduled", "in_progress", "completed", "cancelled"]
    meetingLink: Optional[str] = None
    recordingEnabled: bool = True
    notes: Optional[str] = None


class WebRTCCredentials(BaseModel):
    sessionId: str
    iceServers: List[Dict[str, Any]]
    signalingUrl: str
    accessToken: str


# Career Path Schemas
class CareerPath(BaseModel):
    userId: str
    targetRole: str
    currentSkills: List[str]
    requiredSkills: List[str]
    skillGaps: List[str]
    learningResources: List[Dict[str, str]]
    timelineMonths: int
    milestones: List[Dict[str, Any]]
    createdAt: str


class SkillAssessment(BaseModel):
    userId: str
    skillCategory: str
    skillName: str
    currentLevel: int  # 1-10
    targetLevel: int
    assessmentScore: float
    improvementSuggestions: List[str]
    lastAssessed: str


# Resume Analysis Schemas
class ResumeUploadResponse(BaseModel):
    resumeId: str
    parsedContent: Dict[str, Any]
    atsScore: float
    keywordMatches: List[str]
    missingKeywords: List[str]
    improvementSuggestions: List[str]
    formatScore: float


class ResumeOptimization(BaseModel):
    resumeId: str
    targetRole: str
    optimizedContent: Dict[str, Any]
    improvements: List[Dict[str, Any]]
    newAtsScore: float


# Analytics Schemas
class PerformanceMetrics(BaseModel):
    userId: str
    timeframe: Literal["week", "month", "quarter", "year"]
    totalInterviews: int
    averageScore: float
    scoreByCategory: Dict[str, float]
    improvementRate: float
    strengths: List[str]
    improvementAreas: List[str]
    peerComparison: Optional[Dict[str, float]] = None


class InterviewSession(BaseModel):
    sessionId: str
    userId: str
    sessionType: Literal["ai_mock", "live_interview"]
    roleCategory: str
    difficulty: str
    duration: int
    score: float
    feedback: Dict[str, Any]
    complianceScore: float
    timestamp: str


# Enhanced Anti-Cheat Schemas
class BehaviorAnalysis(BaseModel):
    sessionId: str
    userId: str
    behaviorMetrics: Dict[str, float]
    anomalyScore: float
    riskLevel: Literal["low", "medium", "high"]
    alerts: List[Dict[str, Any]]
    analysisTimestamp: str


class VoiceAnalysis(BaseModel):
    sessionId: str
    userId: str
    backgroundVoiceDetected: bool
    voiceStressMetrics: Dict[str, float]
    speakerCount: int
    confidenceScore: float


# Mentorship Schemas
class MentorshipRequest(BaseModel):
    menteeId: str
    targetRole: str
    specificGoals: List[str]
    experienceLevel: str
    availability: Dict[str, str]
    preferences: Dict[str, Any]


class MentorshipMatch(BaseModel):
    mentorId: str
    menteeId: str
    compatibilityScore: float
    matchReasons: List[str]
    suggestedTopics: List[str]
    status: Literal["pending", "active", "completed"]


# Device Management Schemas
class DeviceInfo(BaseModel):
    deviceId: str
    userId: str
    deviceName: str
    deviceType: str  # mobile, desktop, tablet
    userAgent: str
    lastActive: str
    ipAddress: str
    isTrusted: bool = False


class MFADevice(BaseModel):
    deviceId: str
    userId: str
    secretKey: str
    backupCodes: List[str]
    isEnabled: bool = False
    createdAt: str


# Security Audit Schemas
class SecurityEvent(BaseModel):
    eventId: str
    userId: Optional[str] = None
    eventType: str
    severity: Literal["low", "medium", "high", "critical"]
    description: str
    ipAddress: str
    userAgent: str
    timestamp: str
    resolved: bool = False


class ComplianceReport(BaseModel):
    reportId: str
    reportType: str
    timeframe: Dict[str, str]
    metrics: Dict[str, Any]
    violations: List[Dict[str, Any]]
    recommendations: List[str]
    generatedAt: str


# OAuth Provider Schemas
class OAuthProvider(BaseModel):
    providerId: str
    name: Literal["google", "microsoft", "github"]
    clientId: str
    enabled: bool = True
    config: Dict[str, Any]


class OAuthConnection(BaseModel):
    connectionId: str
    userId: str
    providerId: str
    providerUserId: str
    accessToken: str  # Encrypted
    refreshToken: Optional[str] = None  # Encrypted
    profileData: Dict[str, Any]
    expiresAt: Optional[str] = None
    createdAt: str
