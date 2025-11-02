import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import {
  Camera,
  Mic,
  Headphones,
  Wifi,
  Monitor,
  Eye,
  Shield,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Info
} from 'lucide-react';
import { submitPrecheck, startInterview } from '../api/client';
import { issueAcet } from '../api/client';

interface PreCheckProps {
  onNavigate: (page: string, data?: any) => void;
  sessionData: any;
}

type CheckStatus = 'pending' | 'running' | 'pass' | 'warning' | 'fail';

interface Check {
  id: string;
  label: string;
  description: string;
  icon: any;
  status: CheckStatus;
  message?: string;
}

export function PreCheck({ onNavigate, sessionData }: PreCheckProps) {
  const [checks, setChecks] = useState<Check[]>([
    {
      id: 'camera',
      label: 'Camera',
      description: 'Face detected, centered, adequate lighting',
      icon: Camera,
      status: 'pending'
    },
    {
      id: 'microphone',
      label: 'Microphone',
      description: 'Signal level test & background noise estimate',
      icon: Mic,
      status: 'pending'
    },
    {
      id: 'speakers',
      label: 'Speakers/Headphones',
      description: 'Playback test',
      icon: Headphones,
      status: 'pending'
    },
    {
      id: 'network',
      label: 'Network',
      description: 'Ping, jitter, packet loss, bandwidth',
      icon: Wifi,
      status: 'pending'
    },
    {
      id: 'browser',
      label: 'Browser Integrity',
      description: 'Single-tab enforcement, extensions check',
      icon: Monitor,
      status: 'pending'
    },
    {
      id: 'fullscreen',
      label: 'Full-screen Required',
      description: 'Must remain in full-screen mode',
      icon: Eye,
      status: 'pending'
    },
    {
      id: 'face-baseline',
      label: 'Face Continuity',
      description: 'Baseline face embedding for session validation',
      icon: Shield,
      status: 'pending'
    }
  ]);

  const [overallProgress, setOverallProgress] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const runCheck = (checkId: string) => {
    setChecks(prev => prev.map(c =>
      c.id === checkId ? { ...c, status: 'running' as CheckStatus } : c
    ));

    // Simulate async check
    setTimeout(() => {
      const mockResults: Record<string, { status: CheckStatus; message?: string }> = {
        camera: { status: 'pass', message: 'Face detected with good lighting' },
        microphone: { status: 'pass', message: 'Clear audio signal detected' },
        speakers: { status: 'pass', message: 'Playback working correctly' },
        network: { status: 'warning', message: 'Bandwidth adequate but jitter detected (12ms)' },
        browser: { status: 'pass', message: 'No conflicting extensions found' },
        fullscreen: { status: 'pass', message: 'Full-screen mode ready' },
        'face-baseline': { status: 'pass', message: 'Baseline face embedding captured' }
      };

      setChecks(prev => prev.map(c =>
        c.id === checkId ? { ...c, ...mockResults[checkId] } : c
      ));
    }, 1500);
  };

  const runAllChecks = () => {
    setIsRunning(true);
    checks.forEach((check, index) => {
      setTimeout(() => {
        runCheck(check.id);
        setOverallProgress(((index + 1) / checks.length) * 100);
        if (index === checks.length - 1) {
          setIsRunning(false);
        }
      }, index * 1600);
    });
  };

  useEffect(() => {
    // Auto-run checks on mount
    runAllChecks();
  }, []);

  const getStatusIcon = (status: CheckStatus) => {
    switch (status) {
      case 'pass':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'fail':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'running':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-slate-300" />;
    }
  };

  const allMandatoryPassed = checks.every(c =>
    c.status === 'pass' || c.status === 'warning'
  );

  const canProceed = allMandatoryPassed && !isRunning;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="mb-2">System Pre-Check</h1>
        <p className="text-slate-600">
          Validating your environment before entering the interview room
        </p>
      </div>
      {sessionData?.paused && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your session was paused due to compliance. Please re-run checks to resume.
          </AlertDescription>
        </Alert>
      )}

      {/* Overall Progress */}
      {isRunning && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Running system checks...</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Privacy Notice */}
      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Privacy Notice:</strong> We check camera, microphone, network, and browser settings to ensure
          interview quality. No recordings are made during the pre-check. Face baseline is stored locally for
          this session only and is not uploaded.
        </AlertDescription>
      </Alert>

      {/* Checks */}
      <div className="space-y-4 mb-6">
        {checks.map(check => {
          const Icon = check.icon;
          return (
            <Card key={check.id}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    <Icon className="h-6 w-6 text-slate-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3>{check.label}</h3>
                      {getStatusIcon(check.status)}
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{check.description}</p>
                    {check.message && (
                      <div className="flex items-start gap-2 mt-2 p-2 bg-slate-50 rounded text-sm">
                        {check.status === 'pass' && <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />}
                        {check.status === 'warning' && <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />}
                        {check.status === 'fail' && <XCircle className="h-4 w-4 text-red-600 mt-0.5" />}
                        <span>{check.message}</span>
                      </div>
                    )}
                    {check.status === 'fail' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => runCheck(check.id)}
                      >
                        Re-Test
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Warnings */}
      {checks.some(c => c.status === 'warning') && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Some checks passed with warnings. You can proceed, but interview quality may be affected.
            We recommend fixing warnings for the best experience.
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => onNavigate('setup')}>
            Back
          </Button>
          <Button variant="outline" onClick={runAllChecks} disabled={isRunning}>
            Re-run All Checks
          </Button>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" disabled>
            Troubleshoot
          </Button>
          <Button
            onClick={async () => {
              if (!canProceed) return;
              try {
                const checksObj: any = {};
                checks.forEach((c) => {
                  checksObj[c.id] = { status: c.status, message: c.message };
                });
                // minimal sample anti-cheat batch during pre-check
                const events = [
                  { sessionId: sessionData.sessionId, seq: 1, type: 'FULLSCREEN_READY', details: { ready: true }, ts: new Date().toISOString(), prevHash: '' },
                ];

                // Add some mock anti-cheat checks
                const mockChecks: any = {};
                checks.forEach((c) => {
                  mockChecks[c.id] = { status: c.status, message: c.message };
                });
                // Ensure ACET
                let acet = sessionData.acet;
                if (!acet) {
                  try {
                    const a = await issueAcet(sessionData.sessionId);
                    acet = a.acet;
                  } catch {}
                }
                const pre = await submitPrecheck(sessionData.sessionId, acet, checksObj, events);
                if (!pre.canProceed) return;
                const started = await startInterview(sessionData.sessionId);
                const merged = { ...sessionData, ...started };
                try { localStorage.setItem('cxSession', JSON.stringify(merged)); } catch {}
                onNavigate('interview', merged);
              } catch (e) {
                console.error('Precheck/start failed', e);
              }
            }}
            disabled={!canProceed}
          >
            {sessionData?.paused ? 'Resume Interview' : 'Proceed to Interview'}
          </Button>
        </div>
      </div>
    </div>
  );
}
