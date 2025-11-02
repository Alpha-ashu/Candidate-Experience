import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

interface UserFlowsProps {
  onNavigate: (page: string) => void;
}

export function UserFlows({ onNavigate }: UserFlowsProps) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <Button variant="ghost" onClick={() => onNavigate('home')}>
          ← Back to Home
        </Button>
      </div>

      <div className="mb-8">
        <h1 className="mb-2">User Flows & Journey Maps</h1>
        <p className="text-slate-600">
          Complete candidate journey through the First Round AI platform
        </p>
      </div>

      {/* Main Flow */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Primary Interview Flow</CardTitle>
          <CardDescription>End-to-end journey from login to summary</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                step: 1,
                title: 'Secure Login',
                description: 'User authenticates and is assigned Candidate role',
                screens: ['Login page', 'Role assignment']
              },
              {
                step: 2,
                title: 'Candidate Home',
                description: 'Dashboard overview with quick actions, stats, and health checks',
                screens: ['Quick Actions cards', 'Interview counters', 'Preparation tracker', 'Recent activity', 'System health status']
              },
              {
                step: 3,
                title: 'AI Mock Interview Setup',
                description: 'Configure session parameters and provide context',
                screens: ['Role selection form', 'Interview modes selector', 'Session parameters sliders', 'Context inputs (JD, resume, companies)', 'Question sources toggles', 'Privacy & consent checkboxes']
              },
              {
                step: 4,
                title: 'Anti-Cheat Pre-Check',
                description: 'Validate environment before entering interview room',
                screens: ['Camera test', 'Microphone test', 'Speakers/headphones test', 'Network diagnostics', 'Browser integrity check', 'Full-screen enforcement', 'Face baseline capture']
              },
              {
                step: 5,
                title: 'Interview Room',
                description: 'Live AI interview session with real-time monitoring',
                screens: ['Top bar (timer, status, recording indicator)', 'AI interviewer panel', 'Candidate response controls', 'Live transcription pane', 'Strikes feed sidebar', 'Notes & resources']
              },
              {
                step: 6,
                title: 'Post-Interview Summary',
                description: 'Detailed feedback and performance analysis',
                screens: ['Score overview', 'Strengths & gaps', 'Question-by-question review', 'Anti-cheat compliance report', 'Recommended next steps', 'Action buttons (download, share, schedule)']
              },
              {
                step: 7,
                title: 'My Dashboard',
                description: 'Analytics and session history',
                screens: ['Date/mode/role filters', 'Score trend chart', 'Performance by mode chart', 'Session history table', 'Companies tracked']
              }
            ].map((flowItem) => (
              <div key={flowItem.step} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center">
                  {flowItem.step}
                </div>
                <div className="flex-1 pb-8 border-l-2 border-slate-200 pl-6 ml-4 -mt-2">
                  <h3 className="mb-2">{flowItem.title}</h3>
                  <p className="text-sm text-slate-600 mb-3">{flowItem.description}</p>
                  <div className="space-y-1">
                    {flowItem.screens.map((screen, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span>{screen}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alternative Flows */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Error & Edge Case Flows</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <ArrowRight className="h-4 w-4 text-blue-600 mt-1" />
                <div>
                  <strong>Pre-check failure:</strong> Guide user through troubleshooting, allow retry, block proceed until fixed
                </div>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-4 w-4 text-blue-600 mt-1" />
                <div>
                  <strong>Low bandwidth during interview:</strong> Auto-switch to audio-only mode, warn user, log event
                </div>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-4 w-4 text-blue-600 mt-1" />
                <div>
                  <strong>Face lost beyond threshold:</strong> Auto-pause interview, show countdown to resume, issue strike
                </div>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-4 w-4 text-blue-600 mt-1" />
                <div>
                  <strong>Multiple violations:</strong> Show warning toast, escalate to red strike, optional auto-end session
                </div>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-4 w-4 text-blue-600 mt-1" />
                <div>
                  <strong>Browser crash mid-session:</strong> Resume logic with integrity check, warn user of interruption
                </div>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-4 w-4 text-blue-600 mt-1" />
                <div>
                  <strong>Screenshot attempt detected:</strong> Immediate strike + toast notification + optional auto-pause
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>State Transitions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <ArrowRight className="h-4 w-4 text-blue-600 mt-1" />
                <div>
                  <strong>Pending → Running:</strong> Pre-check tests execute sequentially with progress bar
                </div>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-4 w-4 text-blue-600 mt-1" />
                <div>
                  <strong>Running → Pass/Warning/Fail:</strong> Each check completes with status badge and message
                </div>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-4 w-4 text-blue-600 mt-1" />
                <div>
                  <strong>Interview active → Paused:</strong> Violation triggers auto-pause with countdown timer
                </div>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-4 w-4 text-blue-600 mt-1" />
                <div>
                  <strong>Paused → Resumed:</strong> User corrects issue, system validates, interview continues
                </div>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-4 w-4 text-blue-600 mt-1" />
                <div>
                  <strong>Active → Ended:</strong> User clicks "End Interview" or auto-end on severe violation
                </div>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-4 w-4 text-blue-600 mt-1" />
                <div>
                  <strong>Ended → Summary:</strong> Session finalized, recordings uploaded, feedback generated
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
