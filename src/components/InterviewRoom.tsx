import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Progress } from './ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import {
  Mic,
  MicOff,
  Video,
  X,
  MessageSquare,
  AlertTriangle,
  StickyNote,
  FileText,
  Play,
  Pause,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { StatusLight } from './shared/StatusLight';
import { ParticlesBackground } from './shared/ParticlesBackground';
import { nextQuestion as apiNextQuestion, submitAnswer as apiSubmitAnswer, finalize as apiFinalize, wsUrlFor, getAntiCheatTail, emitAntiCheat, codeEval as apiCodeEval } from '../api/client';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { toast } from 'sonner@2.0.3';

interface InterviewRoomProps {
  onNavigate: (page: string, data?: any) => void;
  sessionData: any;
}

export function InterviewRoom({ onNavigate, sessionData }: InterviewRoomProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [sessionTime, setSessionTime] = useState(0);
  const [questionTime, setQuestionTime] = useState(0);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isRecording, setIsRecording] = useState(true);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [antiCheatStatus, setAntiCheatStatus] = useState<'pass' | 'warning' | 'fail'>('pass');
  const [answer, setAnswer] = useState('');
  const [notes, setNotes] = useState('');
  const [transcript, setTranscript] = useState<Array<{ speaker: string; text: string; time: string }>>([]);
  const [strikes, setStrikes] = useState<Array<{ type: string; severity: 'minor' | 'major'; time: string; details: string }>>([]);

  // Server-driven question state
  const [serverQuestion, setServerQuestion] = useState<null | { id: string; number: number; total: number; type: string; text: string; metadata: any }>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const hasRequestedRef = useRef(false);
  const acetSeqRef = useRef<number>(0);
  const acetHashRef = useRef<string>('');
  const lastEmitRef = useRef<Record<string, number>>({});
  const [feedbackMap, setFeedbackMap] = useState<Record<string, { score?: number; feedback?: string; modelAnswer?: string }>>({});
  const [showModel, setShowModel] = useState<Record<string, boolean>>({});
  const [questionNumbers, setQuestionNumbers] = useState<Record<string, number>>({});
  const [codeAnswer, setCodeAnswer] = useState('');
  const [mcqSelected, setMcqSelected] = useState<string[]>([]);
  const [fibMap, setFibMap] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [testResults, setTestResults] = useState<Array<{ input: any; expected: any; actual?: any; pass: boolean; error?: string }>>([]);
  const [testsError, setTestsError] = useState<string | null>(null);

  const mockQuestions = [
    {
      id: 1,
      type: 'behavioral',
      text: 'Tell me about a time when you had to deal with a critical bug in production. How did you handle it?',
      hint: 'Use the STAR method: Situation, Task, Action, Result'
    },
    {
      id: 2,
      type: 'coding',
      text: 'Write a function to find all duplicates in an array of integers.',
      hint: 'Consider using a hash map for O(n) time complexity'
    },
    {
      id: 3,
      type: 'scenario',
      text: 'Your automated test suite is taking 2 hours to run. How would you optimize it?',
      hint: 'Think about parallelization, test prioritization, and infrastructure'
    }
  ];

  const question = serverQuestion || mockQuestions[currentQuestion];

  // Simulate timers
  useEffect(() => {
    const sessionTimer = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);

    const questionTimer = setInterval(() => {
      setQuestionTime(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(sessionTimer);
      clearInterval(questionTimer);
    };
  }, []);

  // Open WebSocket if tokens exist
  useEffect(() => {
    if (!sessionData?.wst || !sessionData?.sessionId) return;
    try {
      const url = wsUrlFor(`/interview/${sessionData.sessionId}/stream?token=${sessionData.wst}`);
      const ws = new WebSocket(url);
      wsRef.current = ws;
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg?.type === 'QUESTION_CREATED') {
            // Optionally handle server events
          } else if (msg?.type === 'STRIKE_CREATED') {
            const sev = msg.severity === 'red' ? 'major' : 'minor';
            setStrikes((prev) => [...prev, { type: msg.type, severity: sev, time: new Date().toLocaleTimeString(), details: msg.details || '' }]);
            if (msg.severity === 'red') {
              setAntiCheatStatus('fail');
            } else if (antiCheatStatus === 'pass') {
              setAntiCheatStatus('warning');
            }
          } else if (msg?.type === 'SESSION_ENDED') {
            setAntiCheatStatus('fail');
            onNavigate('summary', { ...sessionData });
          } else if (msg?.type === 'SESSION_PAUSED') {
            setAntiCheatStatus('warning');
            // Navigate to Pre-Check to resume flow
            onNavigate('precheck', { ...sessionData, paused: true });
          } else if (msg?.type === 'FEEDBACK_CREATED' && msg.questionId && msg.feedback) {
            setFeedbackMap((prev) => ({ ...prev, [msg.questionId]: msg.feedback }));
            const score = msg.feedback?.score ?? '—';
            toast.info(`AI Feedback: ${score}/100`, { description: msg.feedback?.feedback || 'Answer received.' });
          }
        } catch {}
      };
      ws.onclose = () => {
        wsRef.current = null;
      };
    } catch (e) {
      console.error('WS error', e);
    }
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [sessionData?.wst, sessionData?.sessionId]);

  // Request first question once when AIPT available
  useEffect(() => {
    (async () => {
      if (!sessionData?.aipt || !sessionData?.sessionId) return;
      if (hasRequestedRef.current) return;
      try {
        const q = await apiNextQuestion(sessionData.sessionId, sessionData.aipt);
        setServerQuestion({ id: q.questionId, number: q.questionNumber, total: q.totalQuestions, type: q.type, text: q.text, metadata: q.metadata });
        setQuestionNumbers((prev) => ({ ...prev, [q.questionId]: q.questionNumber }));
        hasRequestedRef.current = true;
      } catch (e) {
        console.error('Failed to get first question', e);
      }
    })();
  }, [sessionData?.aipt, sessionData?.sessionId]);

  // Initialize anti-cheat tail (for chaining) and register simple detectors
  useEffect(() => {
    (async () => {
      if (!sessionData?.userJwt || !sessionData?.sessionId) return;
      try {
        const tail = await getAntiCheatTail(sessionData.sessionId, sessionData.userJwt);
        acetSeqRef.current = tail.seq;
        acetHashRef.current = tail.hash || '';
      } catch (e) {
        // ignore
      }
    })();

    const onVisibility = () => {
      if (!document.hidden) return;
      emitAc('TAB_SWITCH', { hidden: true });
    };
    const onFullscreen = () => {
      const fs = !!document.fullscreenElement;
      if (!fs) emitAc('FS_EXIT', {});
    };
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('fullscreenchange', onFullscreen);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('fullscreenchange', onFullscreen);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionData?.userJwt, sessionData?.sessionId, sessionData?.acet]);

  async function emitAc(type: string, details: any) {
    try {
      if (!sessionData?.acet || !sessionData?.sessionId) return;
      const now = Date.now();
      const last = lastEmitRef.current[type] || 0;
      if (now - last < 1500) return; // throttle
      lastEmitRef.current[type] = now;
      const nextSeq = acetSeqRef.current + 1;
      const prevHash = acetHashRef.current || '';
      const ev = { sessionId: sessionData.sessionId, seq: nextSeq, type, details, ts: new Date().toISOString(), prevHash };
      const resp = await emitAntiCheat(sessionData.sessionId, sessionData.acet, [ev]);
      acetSeqRef.current = resp.tailSeq;
      acetHashRef.current = resp.tailHash;
    } catch (e) {
      // swallow
    }
  }

  // Simulate occasional strike
  useEffect(() => {
    const strikeSimulator = setTimeout(() => {
      if (strikes.length === 0) {
        // Add a simulated minor strike
        addStrike('minor', 'Face detection', 'Face briefly out of frame (0.8s)');
      }
    }, 30000);

    return () => clearTimeout(strikeSimulator);
  }, []);

  const addStrike = (severity: 'minor' | 'major', type: string, details: string) => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    setStrikes(prev => [...prev, {
      type,
      severity,
      time: timeStr,
      details
    }]);

    if (severity === 'minor' && antiCheatStatus === 'pass') {
      setAntiCheatStatus('warning');
    } else if (severity === 'major') {
      setAntiCheatStatus('fail');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const submitForFeedback = async () => {
    try {
      if (!serverQuestion || !sessionData?.ist) return;
      if (submitting) return;
      setSubmitting(true);
      const timestamp = new Date().toISOString();
      const payload: any = {
        questionId: serverQuestion.id,
        transcripts: transcript.map(t => ({ speaker: t.speaker === 'AI' ? 'ai' : 'candidate', text: t.text, timestamp })),
        timeSpent: questionTime,
      };
      const qtype = (serverQuestion.type || 'behavioral').toLowerCase();
      if (qtype === 'coding' || qtype === 'code') {
        payload.answerType = 'code';
        payload.responseText = codeAnswer || '';
      } else if (qtype === 'mcq') {
        payload.answerType = 'mcq';
        payload.mcqSelected = mcqSelected;
        payload.responseText = '';
      } else if (qtype === 'fib' || qtype === 'fill') {
        payload.answerType = 'fib';
        payload.fibEntries = Object.entries(fibMap).map(([slotId, value]) => ({ slotId, value }));
        payload.responseText = '';
      } else {
        payload.answerType = 'text';
        payload.responseText = answer || '';
      }

      const tryOnce = async () => apiSubmitAnswer(sessionData.sessionId, sessionData.ist, payload);
      let resp;
      try {
        resp = await tryOnce();
      } catch (e1) {
        await new Promise(r => setTimeout(r, 800));
        try { resp = await tryOnce(); } catch (e2) { throw e2; }
      }

      if (payload.answerType === 'code' && testResults.length > 0) {
        payload.codeTests = testResults;
      }
      if ((payload.answerType === 'text' || payload.answerType === 'code') && (payload.responseText || '').trim()) {
        addToTranscript('You', payload.responseText);
      }
      if (resp?.immediateFeedback) {
        setFeedbackMap((prev) => ({ ...prev, [serverQuestion.id]: resp.immediateFeedback! }));
        const score = resp.immediateFeedback.score ?? '-';
        toast.success(`AI Feedback: ${score}/100`, { description: resp.immediateFeedback.feedback || 'Answer received.' });
      }
    } catch (e) {
      console.error('submit failed', e);
      toast.error('Failed to submit for feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextQuestion = async () => {
    try {
      // Clear UI state (after feedback acknowledged)
      setAnswer('');
      setQuestionTime(0);
      setCodeAnswer('');
      setMcqSelected([]);
      setFibMap({});

      // Fetch next or finalize
      if (serverQuestion && sessionData?.aipt) {
        if (serverQuestion.number >= serverQuestion.total) {
          await apiFinalize(sessionData.sessionId, sessionData.ist);
          onNavigate('summary', { ...sessionData });
          return;
        }
        let q;
        try {
          q = await apiNextQuestion(sessionData.sessionId, sessionData.aipt);
        } catch (e) {
          // Try refreshing tokens and AIPT then retry once
          try {
            const { refreshTokens, issueAipt } = await import('../api/client');
            const r = await refreshTokens(sessionData.sessionId);
            if (r.ist) sessionData.ist = r.ist;
            if (r.wst) sessionData.wst = r.wst;
            const a = await issueAipt(sessionData.sessionId);
            sessionData.aipt = a.aipt;
            q = await apiNextQuestion(sessionData.sessionId, sessionData.aipt);
          } catch {
            throw e;
          }
        }
        setServerQuestion({ id: q.questionId, number: q.questionNumber, total: q.totalQuestions, type: q.type, text: q.text, metadata: q.metadata });
        setQuestionNumbers((prev) => ({ ...prev, [q.questionId]: q.questionNumber }));
      } else {
        // Fallback to mock progression
        if (currentQuestion < mockQuestions.length - 1) {
          setCurrentQuestion(prev => prev + 1);
        } else {
          onNavigate('summary', { ...sessionData });
        }
      }
    } catch (e) {
      console.error('advance failed', e);
    }
  };

  const handleEndInterview = () => {
    setShowExitDialog(false);
    const results = {
      ...sessionData,
      duration: sessionTime,
      questionsAnswered: currentQuestion + 1,
      totalQuestions: mockQuestions.length,
      strikes: strikes.length,
      complianceStatus: antiCheatStatus === 'pass' ? 'Pass' : antiCheatStatus === 'warning' ? 'Warning' : 'Failed'
    };
    onNavigate('summary', results);
  };

  const addToTranscript = (speaker: string, text: string) => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    setTranscript(prev => [...prev, { speaker, text, time: timeStr }]);
  };

  const totalQs = serverQuestion ? serverQuestion.total : mockQuestions.length;
  const currentIdx = serverQuestion ? serverQuestion.number - 1 : currentQuestion;
  const progressPercent = ((currentIdx + 1) / totalQs) * 100;

  return (
    <div className="h-screen flex flex-col bg-slate-900 relative">
      {/* Particles Background */}
      <ParticlesBackground 
        id="interview-particles"
        config={{
          particles: {
            number: {
              value: 50,
              density: {
                enable: true,
                value_area: 800
              }
            },
            color: {
              value: ['#3b82f6', '#8b5cf6']
            },
            opacity: {
              value: 0.3
            },
            size: {
              value: 2
            },
            line_linked: {
              enable: true,
              distance: 150,
              color: '#3b82f6',
              opacity: 0.2,
              width: 1
            },
            move: {
              enable: true,
              speed: 1
            }
          },
          interactivity: {
            events: {
              onhover: {
                enable: false
              },
              onclick: {
                enable: false
              }
            }
          }
        }}
      />
      
      {/* Top Bar */}
      <div className="bg-slate-800/90 backdrop-blur-sm border-b border-slate-700 px-4 py-3 relative z-10">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="text-white">
              <span className="text-sm text-slate-400">Session Time:</span>
              <span className="ml-2">{formatTime(sessionTime)}</span>
            </div>
            <div className="text-white">
              <span className="text-sm text-slate-400">Question Time:</span>
              <span className="ml-2">{formatTime(questionTime)}</span>
            </div>
          </div>

          <StatusLight status={antiCheatStatus} label="Compliance" />

          <div className="flex items-center gap-4">
            {isRecording && (
              <Badge variant="destructive" className="gap-1">
                <div className="h-2 w-2 bg-white rounded-full animate-pulse" />
                Recording
              </Badge>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowExitDialog(true)}
            >
              <X className="h-4 w-4 mr-1" />
              Exit
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden relative z-10">
        <div className="h-full grid lg:grid-cols-[1fr_400px]">
          {/* Left Panel */}
          <div className="flex flex-col bg-white/95 backdrop-blur-sm">
            {/* Progress */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Question {serverQuestion ? serverQuestion.number : (currentQuestion + 1)} of {serverQuestion ? serverQuestion.total : mockQuestions.length}</span>
                <span className="text-sm text-slate-600">{Math.round(progressPercent)}% Complete</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>

            {/* AI Interviewer Panel */}
            <div className="p-6 border-b bg-slate-50">
              <div className="flex items-start gap-4 mb-4">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white">
                  AI
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3>AI Interviewer</h3>
                    <Badge variant="outline">{question.type}</Badge>
                  </div>
                  <p className="text-slate-600">{question.text}</p>
                  {question.hint && (
                    <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                      💡 Hint: {question.hint}
                    </div>
                  )}
                  {serverQuestion && feedbackMap[serverQuestion.id] && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                      <div className="font-medium">AI Feedback</div>
                      <div className="mt-1">Score: {feedbackMap[serverQuestion.id].score ?? '—'}/100</div>
                      {feedbackMap[serverQuestion.id].feedback && (
                        <div className="mt-1">{feedbackMap[serverQuestion.id].feedback}</div>
                      )}
                      {feedbackMap[serverQuestion.id].modelAnswer && (
                        <div className="mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowModel(prev => ({ ...prev, [serverQuestion.id]: !prev[serverQuestion.id] }))}
                          >
                            {showModel[serverQuestion.id] ? 'Hide Model Answer' : 'Show Model Answer'}
                          </Button>
                          {showModel[serverQuestion.id] && (
                            <div className="mt-2 p-2 bg-white/60 border border-green-200 rounded text-slate-800">
                              {feedbackMap[serverQuestion.id].modelAnswer}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Play className="h-4 w-4 mr-1" />
                  Play Question
                </Button>
                <Button variant="outline" size="sm">
                  Repeat Question
                </Button>
              </div>
            </div>

            {/* Answer Area */}
            <div className="flex-1 p-6 overflow-auto">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3>Your Answer</h3>
                  <div className="flex gap-2">
                    <Button
                      variant={isMicActive ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setIsMicActive(!isMicActive)}
                    >
                      {isMicActive ? (
                        <>
                          <Mic className="h-4 w-4 mr-1" />
                          Recording...
                        </>
                      ) : (
                        <>
                          <MicOff className="h-4 w-4 mr-1" />
                          Push to Talk
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                {(() => {
                  const qtype = (question.type || 'behavioral').toLowerCase();
                  const meta = (question as any).metadata || {};
                  if (qtype === 'coding' || qtype === 'code') {
                    return (
                      <Textarea
                        placeholder="Write your code here..."
                        rows={12}
                        value={codeAnswer}
                        onChange={(e) => setCodeAnswer(e.target.value)}
                        className="resize-none font-mono"
                      />
                    );
                  }
                  if (qtype === 'mcq') {
                    const options: string[] = meta.options || [];
                    if (options.length === 0) {
                      return <p className="text-sm text-slate-600">No options provided.</p>;
                    }
                    return (
                      <div className="space-y-2">
                        {options.map((opt) => (
                          <label key={opt} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={mcqSelected.includes(opt)}
                              onCheckedChange={(v: any) => {
                                setMcqSelected((prev) => v ? [...new Set([...prev, opt])] : prev.filter(x => x !== opt));
                              }}
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    );
                  }
                  if (qtype === 'fib' || qtype === 'fill') {
                    const slots: string[] = meta.fillSlots || [];
                    if (slots.length === 0) {
                      return <p className="text-sm text-slate-600">No blanks provided.</p>;
                    }
                    return (
                      <div className="space-y-3">
                        {slots.map((slot) => (
                          <div key={slot} className="grid gap-1">
                            <Label htmlFor={`fib-${slot}`}>{slot}</Label>
                            <Textarea id={`fib-${slot}`} rows={2} value={fibMap[slot] || ''} onChange={(e) => setFibMap((prev) => ({ ...prev, [slot]: e.target.value }))} />
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return (
                    <>
                      <Textarea
                        placeholder="Type your answer here or use voice..."
                        rows={12}
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        className="resize-none"
                      />
                      <p className="text-xs text-slate-600 mt-1">{answer.length} characters</p>
                    </>
                  );
                })()}
              </div>

              {((question.type || '').toLowerCase() === 'coding') && (question as any).metadata?.tests && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium">Tests</h4>
                    <div className="flex items-center gap-2">
                      {((question as any).metadata?.language || '').toLowerCase() !== 'python' && (
                        <Button variant="outline" size="sm" onClick={() => {
                      try {
                        setTestsError(null);
                        const meta: any = (question as any).metadata || {};
                        const fnName = meta.functionName || 'solution';
                        // eslint-disable-next-line no-new-func
                        const runner = new Function(`${codeAnswer}; return typeof ${fnName} === 'function' ? ${fnName} : null;`);
                        const fn = runner();
                        if (!fn) { setTestsError('Function not found. Define ' + fnName); setTestResults([]); return; }
                        const results: any[] = [];
                        (meta.tests || []).forEach((t: any) => {
                          try {
                            const actual = fn.apply(null, t.input);
                            const pass = JSON.stringify(actual) === JSON.stringify(t.expected);
                            results.push({ input: t.input, expected: t.expected, actual, pass });
                          } catch (err: any) {
                            results.push({ input: t.input, expected: t.expected, pass: false, error: String(err) });
                          }
                        });
                        setTestResults(results);
                      } catch (e: any) {
                        setTestsError(String(e));
                        setTestResults([]);
                      }
                    }}>Run Tests</Button>
                      )}
                      {((question as any).metadata?.language || '').toLowerCase() === 'python' && (
                        <Button variant="outline" size="sm" onClick={async () => {
                          try {
                            setTestsError(null);
                            const meta: any = (question as any).metadata || {};
                            const fnName = meta.functionName || 'solution';
                            const tests = meta.tests || [];
                            const resp = await apiCodeEval(sessionData.sessionId, sessionData.ist, { code: codeAnswer, functionName: fnName, tests });
                            setTestResults(resp.results);
                          } catch (e: any) {
                            setTestsError(String(e));
                            setTestResults([]);
                          }
                        }}>Run Server Tests</Button>
                      )}
                    </div>
                  </div>
                  {testsError && <p className="text-sm text-red-600">{testsError}</p>}
                  {testResults.length > 0 && (
                    <div className="space-y-2">
                      {testResults.map((r, idx) => (
                        <div key={idx} className={`text-sm p-2 rounded ${r.pass ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                          <div>Input: <code>{JSON.stringify(r.input)}</code></div>
                          <div>Expected: <code>{JSON.stringify(r.expected)}</code></div>
                          <div>Actual: <code>{JSON.stringify(r.actual)}</code></div>
                          {!r.pass && r.error && <div className="text-xs text-red-700">Error: {r.error}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="p-4 border-t bg-slate-50 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                  disabled={currentQuestion === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                {serverQuestion && !feedbackMap[serverQuestion.id] && (
                  <Button variant="secondary" onClick={submitForFeedback} disabled={(() => {
                    const qtype = (question.type || 'behavioral').toLowerCase();
                    if (qtype === 'coding' || qtype === 'code') return !codeAnswer.trim();
                    if (qtype === 'mcq') return mcqSelected.length === 0;
                    if (qtype === 'fib' || qtype === 'fill') return Object.keys(fibMap).length === 0;
                    return !answer.trim();
                  })() || submitting}>
                    Submit for Feedback
                  </Button>
                )}
              </div>
              <Button onClick={handleNextQuestion} disabled={!!(serverQuestion && !feedbackMap[serverQuestion.id])}>
                {(serverQuestion
                  ? serverQuestion.number < serverQuestion.total
                  : currentQuestion < mockQuestions.length - 1) ? (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                ) : (
                  'Finish Interview'
                )}
              </Button>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="bg-slate-50 border-l hidden lg:block">
            <Tabs defaultValue="transcript" className="h-full flex flex-col">
              <TabsList className="w-full rounded-none">
                <TabsTrigger value="transcript" className="flex-1">
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Transcript
                </TabsTrigger>
                <TabsTrigger value="feedback" className="flex-1">
                  <FileText className="h-4 w-4 mr-1" />
                  Feedback
                </TabsTrigger>
                <TabsTrigger value="strikes" className="flex-1">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Strikes
                  {strikes.length > 0 && (
                    <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                      {strikes.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="notes" className="flex-1">
                  <StickyNote className="h-4 w-4 mr-1" />
                  Notes
                </TabsTrigger>
              </TabsList>

              <TabsContent value="transcript" className="flex-1 overflow-hidden m-0">
                <ScrollArea className="h-full p-4">
                  {transcript.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center mt-8">
                      Live transcript will appear here
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {transcript.map((entry, idx) => (
                        <div key={idx} className="text-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <span>{entry.speaker}</span>
                            <span className="text-xs text-slate-500">{entry.time}</span>
                          </div>
                          <p className="text-slate-600">{entry.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="feedback" className="flex-1 overflow-hidden m-0">
                <ScrollArea className="h-full p-4">
                  {Object.keys(feedbackMap).length === 0 ? (
                    <p className="text-sm text-slate-500 text-center mt-8">No feedback yet. Submit an answer to see feedback.</p>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(feedbackMap).map(([qid, fb]) => (
                        <Card key={qid} className="border-green-200 bg-green-50">
                          <CardContent className="p-3 text-sm">
                            <div className="flex items-center justify-between mb-1">
                              <span>Question {questionNumbers[qid] ?? qid.slice(0, 6)}</span>
                              {typeof fb.score !== 'undefined' && (
                                <Badge variant="outline">Score: {fb.score}/100</Badge>
                              )}
                            </div>
                            {fb.feedback && <p className="text-slate-700">{fb.feedback}</p>}
                            {fb.modelAnswer && (
                              <div className="mt-2 p-2 bg-white/60 border border-green-200 rounded text-slate-800">
                                <div className="text-xs uppercase tracking-wide mb-1 text-slate-600">Model Answer</div>
                                {fb.modelAnswer}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="strikes" className="flex-1 overflow-hidden m-0">
                <ScrollArea className="h-full p-4">
                  {strikes.length === 0 ? (
                    <div className="text-center mt-8">
                      <div className="h-12 w-12 rounded-full bg-green-100 mx-auto mb-2 flex items-center justify-center">
                        <Video className="h-6 w-6 text-green-600" />
                      </div>
                      <p className="text-sm">No violations detected</p>
                      <p className="text-xs text-slate-500">Keep it up!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {strikes.map((strike, idx) => (
                        <Card key={idx} className={strike.severity === 'major' ? 'border-red-300 bg-red-50' : 'border-yellow-300 bg-yellow-50'}>
                          <CardContent className="p-3">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className={`h-4 w-4 mt-0.5 ${strike.severity === 'major' ? 'text-red-600' : 'text-yellow-600'}`} />
                              <div className="flex-1 text-sm">
                                <div className="flex items-center justify-between mb-1">
                                  <span>{strike.type}</span>
                                  <span className="text-xs text-slate-500">{strike.time}</span>
                                </div>
                                <p className="text-xs text-slate-600">{strike.details}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="notes" className="flex-1 overflow-hidden m-0">
                <div className="p-4 h-full flex flex-col">
                  <Textarea
                    placeholder="Your private notes..."
                    className="flex-1 resize-none"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Interview?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to end this interview session? Your progress will be saved and
              you'll receive a summary of your performance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Interview</AlertDialogCancel>
            <AlertDialogAction onClick={handleEndInterview}>
              Yes, End Interview
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

