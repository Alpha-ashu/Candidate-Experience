import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';

interface APIContractsProps {
  onNavigate: (page: string) => void;
}

export function APIContracts({ onNavigate }: APIContractsProps) {
  const contracts = [
    {
      id: 'create-session',
      name: 'Create Session',
      method: 'POST',
      endpoint: '/api/sessions',
      description: 'Initialize a new interview session with configuration',
      request: `{
  "userId": "string",
  "roleCategory": "string",
  "roleSubType": "string (optional)",
  "experienceYears": "number",
  "experienceMonths": "number",
  "modes": ["behavioral", "coding", "scenario", "random"],
  "questionCount": "number (5-20)",
  "durationLimit": "number (minutes)",
  "language": "string (en-us, en-uk, etc.)",
  "accentPreference": "string (optional)",
  "difficulty": "easy | medium | hard | adaptive",
  "jobDescription": "string (optional)",
  "resumeFileRef": "string (optional)",
  "companyTargets": ["string"],
  "includeCuratedQuestions": "boolean",
  "allowAIGenerated": "boolean",
  "enableMCQ": "boolean",
  "enableFIB": "boolean",
  "consentRecording": "boolean (required)",
  "consentAntiCheat": "boolean (required)",
  "consentTimestamp": "ISO 8601 datetime"
}`,
      response: `{
  "sessionId": "string (UUID)",
  "status": "created",
  "createdAt": "ISO 8601 datetime",
  "expiresAt": "ISO 8601 datetime",
  "message": "Session created successfully"
}`
    },
    {
      id: 'run-precheck',
      name: 'Run Pre-Check',
      method: 'POST',
      endpoint: '/api/sessions/{sessionId}/precheck',
      description: 'Execute environment validation tests',
      request: `{
  "sessionId": "string",
  "cameraTest": {
    "faceDetected": "boolean",
    "faceCentered": "boolean",
    "lightingAdequate": "boolean"
  },
  "microphoneTest": {
    "signalLevel": "number (dB)",
    "backgroundNoise": "number (dB)"
  },
  "speakersTest": {
    "playbackSuccessful": "boolean"
  },
  "networkTest": {
    "ping": "number (ms)",
    "jitter": "number (ms)",
    "packetLoss": "number (percentage)",
    "uploadSpeed": "number (Mbps)",
    "downloadSpeed": "number (Mbps)"
  },
  "browserIntegrity": {
    "singleTabEnforced": "boolean",
    "extensionsBlocked": "boolean",
    "screenshotBlocked": "boolean",
    "fullScreenReady": "boolean"
  },
  "faceBaseline": {
    "embeddingCaptured": "boolean",
    "localStorageOnly": "boolean"
  }
}`,
      response: `{
  "precheckId": "string (UUID)",
  "sessionId": "string",
  "overallStatus": "pass | warning | fail",
  "checks": [
    {
      "checkType": "camera | microphone | speakers | network | browser | faceBaseline",
      "status": "pass | warning | fail",
      "message": "string",
      "details": "object"
    }
  ],
  "canProceed": "boolean",
  "timestamp": "ISO 8601 datetime"
}`
    },
    {
      id: 'start-interview',
      name: 'Start Interview',
      method: 'POST',
      endpoint: '/api/sessions/{sessionId}/start',
      description: 'Begin the interview session and initiate recording',
      request: `{
  "sessionId": "string",
  "precheckId": "string",
  "fullScreenConfirmed": "boolean",
  "recordingStarted": "ISO 8601 datetime"
}`,
      response: `{
  "sessionId": "string",
  "status": "active",
  "startedAt": "ISO 8601 datetime",
  "firstQuestion": {
    "questionId": "string",
    "type": "behavioral | coding | scenario | mcq | fib",
    "text": "string",
    "metadata": {
      "difficulty": "easy | medium | hard",
      "tags": ["string"],
      "hintAvailable": "boolean"
    }
  },
  "recordingRefs": {
    "audioStreamId": "string",
    "videoStreamId": "string",
    "transcriptStreamId": "string"
  }
}`
    },
    {
      id: 'get-question',
      name: 'Get Next Question',
      method: 'GET',
      endpoint: '/api/sessions/{sessionId}/questions/next',
      description: 'Retrieve the next question in the sequence',
      request: 'N/A (GET request)',
      response: `{
  "questionId": "string",
  "questionNumber": "number",
  "totalQuestions": "number",
  "type": "behavioral | coding | scenario | mcq | fib",
  "text": "string",
  "metadata": {
    "difficulty": "string",
    "tags": ["string"],
    "timeLimit": "number (seconds, optional)",
    "hintAvailable": "boolean"
  },
  "options": ["string"] // only for MCQ,
  "codeTemplate": "string" // only for coding,
  "fillSlots": ["string"] // only for FIB
}`
    },
    {
      id: 'submit-answer',
      name: 'Submit Answer',
      method: 'POST',
      endpoint: '/api/sessions/{sessionId}/answers',
      description: 'Submit candidate response to a question',
      request: `{
  "sessionId": "string",
  "questionId": "string",
  "answerType": "voice | text | code | mcq | fib",
  "responseText": "string (optional)",
  "audioRef": "string (optional)",
  "codeRef": "string (optional)",
  "mcqSelected": ["string"] // optional, array for multi-select,
  "fibEntries": [
    {
      "slotId": "string",
      "value": "string"
    }
  ], // optional
  "transcripts": [
    {
      "speaker": "candidate | ai",
      "text": "string",
      "timestamp": "ISO 8601 datetime"
    }
  ],
  "timeSpent": "number (seconds)"
}`,
      response: `{
  "answerId": "string (UUID)",
  "questionId": "string",
  "status": "submitted",
  "immediateFeedback": {
    "score": "number (0-100, optional)",
    "hint": "string (optional)"
  },
  "nextQuestionAvailable": "boolean",
  "submittedAt": "ISO 8601 datetime"
}`
    },
    {
      id: 'emit-strike',
      name: 'Emit Strike',
      method: 'POST',
      endpoint: '/api/sessions/{sessionId}/strikes',
      description: 'Log an anti-cheat violation event',
      request: `{
  "sessionId": "string",
  "strikeType": "face_missing | fullscreen_exit | tab_switch | screenshot_attempt | background_voice | blur_detected | focus_lost | other",
  "severity": "minor | major",
  "details": "string",
  "autoAction": "none | pause | warning | end",
  "timestamp": "ISO 8601 datetime"
}`,
      response: `{
  "strikeId": "string (UUID)",
  "sessionId": "string",
  "strikeCount": "number",
  "currentStatus": "pass | warning | fail",
  "actionTaken": "none | paused | ended",
  "message": "string",
  "timestamp": "ISO 8601 datetime"
}`
    },
    {
      id: 'end-interview',
      name: 'End Interview',
      method: 'POST',
      endpoint: '/api/sessions/{sessionId}/end',
      description: 'Finalize the interview session',
      request: `{
  "sessionId": "string",
  "endReason": "completed | candidate_exit | violation | timeout | error",
  "finalAnswer": "object (optional, last answer if not submitted)",
  "endedAt": "ISO 8601 datetime"
}`,
      response: `{
  "sessionId": "string",
  "status": "ended",
  "startedAt": "ISO 8601 datetime",
  "endedAt": "ISO 8601 datetime",
  "totalDuration": "number (seconds)",
  "questionsAnswered": "number",
  "totalQuestions": "number",
  "recordingRefs": {
    "audioUrl": "string",
    "videoUrl": "string",
    "transcriptUrl": "string",
    "logsUrl": "string"
  },
  "summaryGenerated": "boolean",
  "summaryId": "string (UUID)"
}`
    },
    {
      id: 'fetch-summary',
      name: 'Fetch Session Summary',
      method: 'GET',
      endpoint: '/api/sessions/{sessionId}/summary',
      description: 'Retrieve detailed performance analysis and feedback',
      request: 'N/A (GET request)',
      response: `{
  "summaryId": "string",
  "sessionId": "string",
  "overallScore": "number (0-100)",
  "scoresByMode": {
    "behavioral": "number",
    "coding": "number",
    "scenario": "number"
  },
  "strengths": ["string"],
  "gaps": ["string"],
  "questionReviews": [
    {
      "questionId": "string",
      "questionText": "string",
      "candidateAnswer": "string",
      "score": "number",
      "feedback": "string",
      "modelAnswer": "string",
      "codeDiff": "string (optional)"
    }
  ],
  "antiCheatReport": {
    "finalStatus": "pass | warning | failed",
    "strikeTimeline": [
      {
        "type": "string",
        "severity": "minor | major",
        "timestamp": "ISO 8601 datetime",
        "details": "string"
      }
    ],
    "verdict": "string"
  },
  "nextSteps": ["string"],
  "generatedAt": "ISO 8601 datetime"
}`
    },
    {
      id: 'update-tracker',
      name: 'Update Company Tracker',
      method: 'POST',
      endpoint: '/api/users/{userId}/companies',
      description: 'Add or update a company in preparation tracker',
      request: `{
  "userId": "string",
  "companyName": "string",
  "roleTitle": "string",
  "status": "preparing | interviewed | offer | rejected",
  "targetDate": "ISO 8601 date (optional)",
  "notes": "string (optional)"
}`,
      response: `{
  "trackerId": "string (UUID)",
  "userId": "string",
  "companyName": "string",
  "roleTitle": "string",
  "status": "string",
  "createdAt": "ISO 8601 datetime",
  "updatedAt": "ISO 8601 datetime"
}`
    },
    {
      id: 'get-analytics',
      name: 'Get Analytics',
      method: 'GET',
      endpoint: '/api/users/{userId}/analytics',
      description: 'Retrieve dashboard analytics and metrics',
      request: `Query Parameters:
  - dateRange: 7days | 30days | 90days | all
  - modeFilter: all | behavioral | coding | scenario | random
  - roleFilter: all | qa | developer | devops | etc.`,
      response: `{
  "userId": "string",
  "dateRange": "string",
  "stats": {
    "totalInterviews": "number",
    "averageScore": "number",
    "complianceRate": "number (percentage)",
    "companiesTracked": "number"
  },
  "scoreTrend": [
    {
      "date": "ISO 8601 date",
      "score": "number",
      "complianceRate": "number"
    }
  ],
  "performanceByMode": [
    {
      "mode": "string",
      "sessionCount": "number",
      "averageScore": "number"
    }
  ],
  "sessionHistory": [
    {
      "sessionId": "string",
      "date": "ISO 8601 datetime",
      "company": "string",
      "role": "string",
      "mode": "string",
      "score": "number",
      "compliance": "pass | warning | fail",
      "duration": "number (minutes)"
    }
  ]
}`
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <Button variant="ghost" onClick={() => onNavigate('home')}>
          ← Back to Home
        </Button>
      </div>

      <div className="mb-8">
        <h1 className="mb-2">API Contracts</h1>
        <p className="text-slate-600">
          Request and response schemas for all platform endpoints
        </p>
      </div>

      <div className="space-y-6">
        {contracts.map((contract) => (
          <Card key={contract.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-3">
                    {contract.name}
                    <Badge
                      variant={contract.method === 'GET' ? 'outline' : 'default'}
                      className={
                        contract.method === 'POST' ? 'bg-green-600' :
                        contract.method === 'GET' ? 'bg-blue-600' :
                        contract.method === 'PUT' ? 'bg-yellow-600' :
                        'bg-red-600'
                      }
                    >
                      {contract.method}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="mt-2">
                    <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                      {contract.endpoint}
                    </code>
                  </CardDescription>
                </div>
              </div>
              <p className="text-sm text-slate-600 mt-2">{contract.description}</p>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="request">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="request">Request</TabsTrigger>
                  <TabsTrigger value="response">Response</TabsTrigger>
                </TabsList>
                <TabsContent value="request" className="mt-4">
                  <ScrollArea className="h-[300px] w-full rounded border">
                    <pre className="p-4 text-xs">
                      <code>{contract.request}</code>
                    </pre>
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="response" className="mt-4">
                  <ScrollArea className="h-[300px] w-full rounded border">
                    <pre className="p-4 text-xs">
                      <code>{contract.response}</code>
                    </pre>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Integration Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <strong>Authentication:</strong> All requests require secure authentication with role-based access control.
            Candidate role has access to own sessions only.
          </div>
          <div>
            <strong>Real-Time Events:</strong> Interview room uses duplex connection for live transcription, strikes,
            and timer updates. WebSocket or Server-Sent Events recommended.
          </div>
          <div>
            <strong>Media Streaming:</strong> Audio/video captured via browser media APIs and streamed to storage service.
            References returned as URLs for playback.
          </div>
          <div>
            <strong>Speech Processing:</strong> Live speech-to-text for transcription; text-to-speech for AI voice output.
            Language and accent preferences applied from session config.
          </div>
          <div>
            <strong>Question Generation:</strong> Connector to curated public question database + AI generator using
            JD/resume context. Both sources respect compliance and legal requirements.
          </div>
          <div>
            <strong>Error Handling:</strong> Standard HTTP status codes. 4xx for client errors, 5xx for server errors.
            Error responses include message and details fields.
          </div>
          <div>
            <strong>Rate Limiting:</strong> Implemented per user to prevent abuse. Limits displayed in response headers.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
