import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Alert, AlertDescription } from './ui/alert';
import { Shield, AlertTriangle, Info } from 'lucide-react';

interface PoliciesProps {
  onNavigate: (page: string) => void;
}

export function Policies({ onNavigate }: PoliciesProps) {
  const strikeTypes = [
    {
      type: 'Face Missing',
      detection: 'Face out of frame > 2 seconds',
      severity: 'Minor',
      firstOccurrence: 'Yellow warning',
      repeated: 'Auto-pause after 3 occurrences',
      autoAction: 'Pause with 10s countdown to resume'
    },
    {
      type: 'Fullscreen Exit',
      detection: 'User exits fullscreen mode',
      severity: 'Major',
      firstOccurrence: 'Red strike + immediate pause',
      repeated: 'Auto-end session after 2 occurrences',
      autoAction: 'Pause immediately, resume on re-enter'
    },
    {
      type: 'Tab Switch / Alt-Tab',
      detection: 'Browser loses focus or tab change detected',
      severity: 'Major',
      firstOccurrence: 'Red strike + warning toast',
      repeated: 'Auto-end session after 2 occurrences',
      autoAction: 'Log event, optional pause'
    },
    {
      type: 'Screenshot Attempt',
      detection: 'Screenshot key combination or API call',
      severity: 'Major',
      firstOccurrence: 'Red strike + immediate toast',
      repeated: 'Auto-end session after 1 occurrence',
      autoAction: 'Block screenshot, log event'
    },
    {
      type: 'Background Human Voice',
      detection: 'Multiple voice signatures detected via audio analysis',
      severity: 'Major',
      firstOccurrence: 'Yellow warning',
      repeated: 'Red strike after 2 occurrences, optional auto-end',
      autoAction: 'Warning first, escalate on repeat'
    },
    {
      type: 'Blur / Face Occlusion',
      detection: 'Face partially or fully obscured',
      severity: 'Minor',
      firstOccurrence: 'Yellow warning',
      repeated: 'Auto-pause after 3 occurrences',
      autoAction: 'Pause with guidance to clear occlusion'
    },
    {
      type: 'System Focus Lost',
      detection: 'App/window switch on desktop',
      severity: 'Major',
      firstOccurrence: 'Red strike',
      repeated: 'Auto-end after 2 occurrences',
      autoAction: 'Log and warn'
    },
    {
      type: 'Multiple Face Detection',
      detection: 'More than one face detected in frame',
      severity: 'Major',
      firstOccurrence: 'Red strike + immediate pause',
      repeated: 'Auto-end after 1 occurrence',
      autoAction: 'Pause until single face restored'
    }
  ];

  const thresholds = [
    { metric: 'Minor Strikes', threshold: '3 within session', action: 'Auto-pause with warning' },
    { metric: 'Major Strikes', threshold: '2 within session', action: 'Auto-end interview' },
    { metric: 'Face Missing Duration', threshold: '> 2 seconds continuous', action: 'Yellow warning issued' },
    { metric: 'Face Missing Total', threshold: '> 30 seconds cumulative', action: 'Session flagged for review' },
    { metric: 'Screenshot Attempts', threshold: '1 attempt', action: 'Immediate red strike + block' },
    { metric: 'Fullscreen Exits', threshold: '2 exits', action: 'Auto-end session' },
    { metric: 'Background Voice Events', threshold: '2 detections', action: 'Red strike, optional auto-end' }
  ];

  const recordingPolicy = [
    'Audio stream captured from candidate microphone throughout session',
    'Video stream captured from candidate camera throughout session (face only, not screen)',
    'Optional screen stream hash (for integrity check, not display)',
    'Live speech-to-text transcription for both candidate and AI',
    'Anti-cheat event logs with timestamps and severity',
    'All recordings stored securely with session-specific encryption',
    'Retention period: 90 days from session end, then auto-deleted unless flagged',
    'Candidate can request deletion within 30 days (compliance permitting)',
    'Access restricted to: Candidate (own sessions), Recruiter (assigned sessions), Admin (flagged sessions only)'
  ];

  const privacyPrinciples = [
    'Face baseline embedding stored locally in browser for session only; not uploaded',
    'No PII collected beyond what user provides (name, email, resume)',
    'Platform not intended for collecting sensitive personal data',
    'All media streams encrypted in transit and at rest',
    'No third-party tracking or analytics on candidate media',
    'Compliance with data protection regulations (GDPR, CCPA equivalent)',
    'Clear visual indicators when camera, mic, or recording are active'
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <Button variant="ghost" onClick={() => onNavigate('home')}>
          ← Back to Home
        </Button>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-8 w-8 text-blue-600" />
          <h1>Anti-Cheat Policies</h1>
        </div>
        <p className="text-slate-600">
          Comprehensive rules, thresholds, and actions for interview integrity
        </p>
      </div>

      {/* Overview Alert */}
      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Policy Objective:</strong> Ensure interview integrity while maintaining a fair and respectful
          candidate experience. Strikes are logged transparently, and candidates can review all violations in
          their session summary.
        </AlertDescription>
      </Alert>

      {/* Strike Types & Actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Strike Types & Automated Actions</CardTitle>
          <CardDescription>
            Comprehensive list of violations, detection methods, and system responses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Violation Type</TableHead>
                  <TableHead>Detection Method</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>First Occurrence</TableHead>
                  <TableHead>Repeated</TableHead>
                  <TableHead>Auto Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {strikeTypes.map((strike, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{strike.type}</TableCell>
                    <TableCell className="text-sm text-slate-600">{strike.detection}</TableCell>
                    <TableCell>
                      <Badge variant={strike.severity === 'Major' ? 'destructive' : 'secondary'}>
                        {strike.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{strike.firstOccurrence}</TableCell>
                    <TableCell className="text-sm">{strike.repeated}</TableCell>
                    <TableCell className="text-sm text-slate-600">{strike.autoAction}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Thresholds */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Threshold Rules</CardTitle>
          <CardDescription>Quantitative limits and automated enforcement</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead>Threshold</TableHead>
                <TableHead>Automated Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {thresholds.map((threshold, idx) => (
                <TableRow key={idx}>
                  <TableCell>{threshold.metric}</TableCell>
                  <TableCell>{threshold.threshold}</TableCell>
                  <TableCell className="text-sm text-slate-600">{threshold.action}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Auto-Pause Behavior */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Auto-Pause & Resume Flow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <strong>Trigger:</strong> Major strike or threshold exceeded (e.g., fullscreen exit, 3rd minor strike)
            </div>
          </div>
          <div className="pl-7">
            <strong>Action:</strong> Interview automatically pauses; timer stops; question remains on screen
          </div>
          <div className="pl-7">
            <strong>Notification:</strong> Modal or toast displays reason and instructions to candidate
          </div>
          <div className="pl-7">
            <strong>Countdown:</strong> 10-second countdown to resume (configurable per violation type)
          </div>
          <div className="pl-7">
            <strong>Resume:</strong> Once violation corrected (e.g., fullscreen re-entered, face visible), countdown
            completes and interview resumes
          </div>
          <div className="pl-7">
            <strong>Failure to Resume:</strong> If violation not corrected within countdown, session auto-ends
          </div>
        </CardContent>
      </Card>

      {/* Recording & Privacy */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Recording Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {recordingPolicy.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-600 mt-2" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Privacy by Design</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {privacyPrinciples.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-600 mt-2" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Candidate Rights */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Candidate Rights & Transparency</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-600 mt-2" />
            <span>
              <strong>Full Transparency:</strong> All strikes visible in real-time during interview and in post-session summary
            </span>
          </div>
          <div className="flex items-start gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-600 mt-2" />
            <span>
              <strong>Dispute Process:</strong> Candidates can flag strikes they believe were erroneous; reviewed by support team
            </span>
          </div>
          <div className="flex items-start gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-600 mt-2" />
            <span>
              <strong>Data Access:</strong> Candidates can download full session summary including strike timeline and recordings
            </span>
          </div>
          <div className="flex items-start gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-600 mt-2" />
            <span>
              <strong>Deletion Requests:</strong> Candidates can request session deletion within 30 days (subject to compliance)
            </span>
          </div>
          <div className="flex items-start gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-600 mt-2" />
            <span>
              <strong>No Surprise Rules:</strong> Anti-cheat policy linked and reviewable before consent checkbox
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Edge Cases */}
      <Card>
        <CardHeader>
          <CardTitle>Edge Cases & Exceptions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <strong>Technical Failures (network drop, browser crash):</strong> Session can be resumed if within
            5 minutes; integrity check performed; event logged but not counted as strike unless pattern detected.
          </div>
          <div>
            <strong>False Positives (lighting change, momentary face loss):</strong> Minor strikes under threshold
            do not affect compliance status; candidates can dispute; support reviews logs.
          </div>
          <div>
            <strong>Accessibility Accommodations:</strong> Candidates can request modifications (e.g., disable
            camera for visual impairment) via support before session; accommodations logged and approved.
          </div>
          <div>
            <strong>Appeals:</strong> Flagged sessions reviewed by human moderator; candidate notified of outcome;
            compliance status can be overridden if justified.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
