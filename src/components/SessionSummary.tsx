import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  Download,
  Share2,
  Calendar,
  Target,
  Clock,
  BarChart3
} from 'lucide-react';

interface SessionSummaryProps {
  onNavigate: (page: string, data?: any) => void;
  sessionData: any;
}

export function SessionSummary({ onNavigate, sessionData }: SessionSummaryProps) {
  const [summary, setSummary] = useState<null | { rubric?: any; strengths: string[]; gaps: string[]; scoreBreakdown?: any }>(null);
  const [review, setReview] = useState<null | { items: Array<{ questionId: string; number: number; type: string; text: string; yourAnswer?: string | null }> }>(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { getSummary, getReview } = await import('../api/client');
        const s = await getSummary(sessionData.sessionId, sessionData.userJwt);
        if (!mounted) return;
        setSummary({ rubric: s.rubric, strengths: s.strengths || [], gaps: s.gaps || [], scoreBreakdown: s.scoreBreakdown || {} });
        try {
          const r = await getReview(sessionData.sessionId, sessionData.userJwt);
          if (mounted) setReview(r);
        } catch {}
      } catch {
        if (!mounted) return;
        setSummary({ rubric: {}, strengths: [], gaps: [], scoreBreakdown: {} });
      }
    })();
    return () => { mounted = false; };
  }, [sessionData?.sessionId, sessionData?.userJwt]);
  const mockSummary = {
    overallScore: 82,
    scores: {
      behavioral: 85,
      coding: 78,
      scenario: 84
    },
    strengths: [
      'Strong communication using STAR method',
      'Well-structured code with good time complexity',
      'Comprehensive understanding of system architecture',
      'Clear problem-solving approach'
    ],
    gaps: [
      'Consider edge cases earlier in coding problems',
      'Expand on metrics and measurement in behavioral answers',
      'Add more specific examples from recent experience'
    ],
    questions: [
      {
        id: 1,
        text: 'Tell me about a time when you had to deal with a critical bug in production.',
        yourAnswer: 'I once encountered a critical bug in our payment processing system...',
        score: 85,
        feedback: 'Excellent use of STAR method. Clear situation, task, action, and measurable result.',
        modelAnswer: 'A strong answer should include: specific situation, your role, actions taken, and quantified results.'
      },
      {
        id: 2,
        text: 'Write a function to find all duplicates in an array of integers.',
        yourAnswer: 'function findDuplicates(arr) { const seen = new Set(); const duplicates = []; ... }',
        score: 78,
        feedback: 'Good solution with O(n) time complexity. Consider handling edge cases like empty arrays.',
        modelAnswer: 'Multiple approaches possible: hash map O(n), sorting O(n log n), or array marking.'
      },
      {
        id: 3,
        text: 'Your automated test suite is taking 2 hours to run. How would you optimize it?',
        yourAnswer: 'I would analyze test execution times, implement parallelization...',
        score: 84,
        feedback: 'Comprehensive answer covering multiple optimization strategies.',
        modelAnswer: 'Key points: parallelization, test prioritization, infrastructure optimization, selective execution.'
      }
    ],
    antiCheat: {
      status: 'Pass',
      strikes: [
        {
          type: 'Face detection',
          severity: 'minor',
          time: '14:23:45',
          details: 'Face briefly out of frame (0.8s)'
        }
      ],
      verdict: 'Session completed with full compliance. One minor strike logged (acceptable threshold).'
    },
    nextSteps: [
      'Practice more coding problems on edge case handling',
      'Review system design patterns for scalability',
      'Prepare more quantified examples from past projects'
    ]
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-50 border-green-200';
    if (score >= 60) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="mb-2">Interview Summary</h1>
        <p className="text-slate-600">Detailed feedback and performance analysis</p>
      </div>

      {/* Score Overview */}
      <Card className={`mb-6 border-2 ${getScoreBg((summary?.scoreBreakdown?.overall ?? mockSummary.overallScore))}`}>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="text-center md:text-left">
              <p className="text-sm text-slate-600 mb-1">Overall Score</p>
              <div className={`text-6xl ${getScoreColor((summary?.scoreBreakdown?.overall ?? mockSummary.overallScore))}`}>
                {summary?.scoreBreakdown?.overall ?? mockSummary.overallScore}
              </div>
              <p className="text-sm text-slate-600 mt-1">Out of 100</p>
            </div>
            <Separator orientation="vertical" className="h-20 hidden md:block" />
            <div className="flex-1 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-slate-600 mb-1">Behavioral</p>
                <div className={`text-3xl ${getScoreColor((summary?.rubric?.communication ?? 85))}`}>
                  {summary?.rubric?.communication ?? 85}
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Coding</p>
                <div className={`text-3xl ${getScoreColor((summary?.rubric?.technical ?? 78))}`}>
                  {summary?.rubric?.technical ?? 78}
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Scenario</p>
                <div className={`text-3xl ${getScoreColor((summary?.rubric?.problem_solving ?? 84))}`}>
                  {summary?.rubric?.problem_solving ?? 84}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Strengths */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {(summary?.strengths?.length ? summary.strengths : mockSummary.strengths).map((strength, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Areas for Improvement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-amber-600" />
              Areas for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {(summary?.gaps?.length ? summary.gaps : mockSummary.gaps).map((gap, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{gap}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Question-by-Question Review */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Question-by-Question Review</CardTitle>
          <CardDescription>Detailed breakdown of each question and your response</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {(review?.items?.length ? review.items : mockSummary.questions).map((q: any, idx: number) => (
              <div key={q.id || q.questionId} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">Question {idx + 1}</Badge>
                      {q.score !== undefined && (
                        <span className={`${getScoreColor(q.score)}`}>
                          Score: {q.score}/100
                        </span>
                      )}
                    </div>
                    <p>{q.text}</p>
                  </div>
                </div>

                <Tabs defaultValue="your-answer" className="mt-4">
                  <TabsList>
                    <TabsTrigger value="your-answer">Your Answer</TabsTrigger>
                    {q.feedback && (<TabsTrigger value="feedback">Feedback</TabsTrigger>)}
                    {q.modelAnswer && (<TabsTrigger value="model-answer">Model Answer</TabsTrigger>)}
                    {q.codeTests && (<TabsTrigger value="tests">Tests</TabsTrigger>)}
                  </TabsList>
                  <TabsContent value="your-answer" className="mt-3">
                    {(() => {
                      if (q.answerType === 'mcq' && Array.isArray(q.mcqSelected)) {
                        return (
                          <div className="p-3 bg-slate-50 rounded text-sm">
                            <div className="text-xs text-slate-600 mb-1">Selected options</div>
                            <ul className="list-disc pl-5 space-y-1">
                              {q.mcqSelected.map((opt: string, i: number) => (<li key={i}>{opt}</li>))}
                            </ul>
                          </div>
                        );
                      }
                      if (q.answerType === 'fib' && Array.isArray(q.fibEntries)) {
                        return (
                          <div className="p-3 bg-slate-50 rounded text-sm">
                            <div className="text-xs text-slate-600 mb-1">Filled blanks</div>
                            <ul className="space-y-1">
                              {q.fibEntries.map((e: any, i: number) => (
                                <li key={i}><span className="text-slate-500">{e.slotId}:</span> {e.value}</li>
                              ))}
                            </ul>
                          </div>
                        );
                      }
                      return (
                        <div className="p-3 bg-slate-50 rounded text-sm">
                          {q.yourAnswer ?? '-'}
                        </div>
                      );
                    })()}
                  </TabsContent>
                  {q.feedback && (
                  <TabsContent value="feedback" className="mt-3">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                      {q.feedback}
                    </div>
                  </TabsContent>
                  )}
                  {q.modelAnswer && (
                  <TabsContent value="model-answer" className="mt-3">
                    <div className="p-3 bg-green-50 border border-green-200 rounded text-sm">
                      {q.modelAnswer}
                    </div>
                  </TabsContent>
                  )}
                  {q.codeTests && (
                  <TabsContent value="tests" className="mt-3">
                    <div className="space-y-2">
                      {q.codeTests.map((r: any, idx: number) => (
                        <div key={idx} className={`text-sm p-2 rounded ${r.pass ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                          <div>Input: <code>{JSON.stringify(r.input)}</code></div>
                          <div>Expected: <code>{JSON.stringify(r.expected)}</code></div>
                          <div>Actual: <code>{JSON.stringify(r.actual)}</code></div>
                          {!r.pass && r.error && <div className="text-xs text-red-700">Error: {r.error}</div>}
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  )}
                </Tabs>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Anti-Cheat Report */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Anti-Cheat Compliance Report</CardTitle>
          <CardDescription>Session integrity and violations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span>Final Compliance Status:</span>
              <Badge
                variant={mockSummary.antiCheat.status === 'Pass' ? 'default' : 'destructive'}
                className="text-base px-4 py-1"
              >
                {mockSummary.antiCheat.status}
              </Badge>
            </div>
            <p className="text-sm text-slate-600">{mockSummary.antiCheat.verdict}</p>
          </div>

          {mockSummary.antiCheat.strikes.length > 0 && (
            <>
              <Separator className="my-4" />
              <div>
                <h4 className="mb-3">Strike Timeline</h4>
                <div className="space-y-2">
                  {mockSummary.antiCheat.strikes.map((strike, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 bg-slate-50 rounded text-sm">
                      <span className="text-slate-500">{strike.time}</span>
                      <Badge variant="outline" className="text-xs">
                        {strike.severity}
                      </Badge>
                      <span>{strike.type}</span>
                      <span className="text-slate-600">— {strike.details}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Recommended Next Steps</CardTitle>
          <CardDescription>Personalized suggestions for improvement</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 mb-4">
            {mockSummary.nextSteps.map((step, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <Target className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{step}</span>
              </li>
            ))}
          </ul>
          <div className="grid sm:grid-cols-2 gap-3 mt-6">
            <Button variant="outline" disabled>
              <TrendingUp className="h-4 w-4 mr-2" />
              View Career Path
            </Button>
            <Button variant="outline" disabled>
              <BarChart3 className="h-4 w-4 mr-2" />
              Practice Similar Questions
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => onNavigate('home')}>
            Back to Home
          </Button>
          <Button variant="outline" onClick={() => onNavigate('dashboard')}>
            View Dashboard
          </Button>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          <Button variant="outline">
            <Share2 className="h-4 w-4 mr-2" />
            Share Link
          </Button>
          <Button onClick={() => onNavigate('setup')}>
            Start New Session
          </Button>
        </div>
      </div>
    </div>
  );
}
