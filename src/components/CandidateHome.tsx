import { Video, Calendar, TrendingUp, FileText, Camera, Mic, Wifi, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { ParticlesBackground } from './shared/ParticlesBackground';

interface CandidateHomeProps {
  onNavigate: (page: string, data?: any) => void;
}

export function CandidateHome({ onNavigate }: CandidateHomeProps) {
  const mockData = {
    quickStats: {
      aiMockInterviewsDaily: 1,
      aiMockInterviewsWeekly: 3,
      aiMockInterviewsMonthly: 12,
      liveSessionsAttended: 2,
      companiesTracked: 5
    },
    preparingFor: [
      { company: 'TechCorp', role: 'Senior QA Engineer', targetDate: '2025-11-15', status: 'active' },
      { company: 'DataFlow Inc', role: 'QA Automation Lead', targetDate: '2025-11-20', status: 'active' },
    ],
    recentActivity: [
      {
        id: 1,
        type: 'AI Mock',
        mode: 'Behavioral + Coding',
        date: '2025-11-01',
        score: 85,
        compliance: 'Pass',
        duration: '45 min'
      },
      {
        id: 2,
        type: 'AI Mock',
        mode: 'Scenario-based',
        date: '2025-10-30',
        score: 78,
        compliance: 'Pass',
        duration: '30 min'
      },
      {
        id: 3,
        type: '1:1 Live',
        mode: 'Technical Deep Dive',
        date: '2025-10-28',
        score: 92,
        compliance: 'Pass',
        duration: '60 min'
      },
    ],
    systemHealth: {
      camera: 'pass',
      microphone: 'pass',
      network: 'warning',
      browser: 'pass'
    }
  };

  return (
    <div className="relative min-h-screen">
      <ParticlesBackground id="home-particles" />
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2">Welcome back, Alex!</h1>
          <p className="text-slate-600">Ready to practice for your next interview?</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Start your interview preparation</CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <Button
              variant="default"
              className="h-auto flex-col items-start p-6 gap-2"
              onClick={() => onNavigate('setup')}
            >
              <Video className="h-6 w-6 mb-2" />
              <span>Start AI Mock Interview</span>
              <span className="text-xs opacity-80">Practice with AI interviewer</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col items-start p-6 gap-2"
              disabled
            >
              <Calendar className="h-6 w-6 mb-2" />
              <span>Book 1:1 Live Session</span>
              <span className="text-xs opacity-60">Coming Soon</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col items-start p-6 gap-2"
              disabled
            >
              <TrendingUp className="h-6 w-6 mb-2" />
              <span>Plan Career Path</span>
              <span className="text-xs opacity-60">Coming Soon</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col items-start p-6 gap-2"
              disabled
            >
              <FileText className="h-6 w-6 mb-2" />
              <span>Check Resume & ATS</span>
              <span className="text-xs opacity-60">Coming Soon</span>
            </Button>
          </CardContent>
        </Card>

        {/* Interview Counters */}
        <Card>
          <CardHeader>
            <CardTitle>Interview Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">AI Mock Interviews</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-50 rounded p-2">
                  <div className="text-2xl">{mockData.quickStats.aiMockInterviewsDaily}</div>
                  <div className="text-xs text-slate-600">Today</div>
                </div>
                <div className="bg-slate-50 rounded p-2">
                  <div className="text-2xl">{mockData.quickStats.aiMockInterviewsWeekly}</div>
                  <div className="text-xs text-slate-600">This Week</div>
                </div>
                <div className="bg-slate-50 rounded p-2">
                  <div className="text-2xl">{mockData.quickStats.aiMockInterviewsMonthly}</div>
                  <div className="text-xs text-slate-600">This Month</div>
                </div>
              </div>
            </div>
            <div className="pt-2 border-t">
              <div className="flex justify-between">
                <span className="text-sm">1:1 Sessions</span>
                <span className="text-2xl">{mockData.quickStats.liveSessionsAttended}</span>
              </div>
            </div>
            <div className="pt-2 border-t">
              <div className="flex justify-between">
                <span className="text-sm">Companies Tracked</span>
                <span className="text-2xl">{mockData.quickStats.companiesTracked}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preparation Tracker */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Currently Preparing For</CardTitle>
            <CardDescription>Your upcoming interview targets</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockData.preparingFor.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span>{item.company}</span>
                    <Badge variant="outline" className="text-xs">{item.role}</Badge>
                  </div>
                  <p className="text-sm text-slate-600">Target: {item.targetDate}</p>
                </div>
                <Button variant="ghost" size="sm">View</Button>
              </div>
            ))}
            <Button variant="outline" className="w-full">
              + Add Company Target
            </Button>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>Pre-check status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                <span className="text-sm">Camera</span>
              </div>
              {mockData.systemHealth.camera === 'pass' ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4" />
                <span className="text-sm">Microphone</span>
              </div>
              {mockData.systemHealth.microphone === 'pass' ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4" />
                <span className="text-sm">Network</span>
              </div>
              {mockData.systemHealth.network === 'pass' ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : mockData.systemHealth.network === 'warning' ? (
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
            </div>
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => onNavigate('setup')}
            >
              Run Full Pre-Check
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your last 5 interview sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockData.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-lg gap-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span>{activity.type}</span>
                      <Badge variant="outline" className="text-xs">{activity.mode}</Badge>
                    </div>
                    <p className="text-sm text-slate-600">{activity.date} • {activity.duration}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-2xl">{activity.score}</div>
                      <div className="text-xs text-slate-600">Score</div>
                    </div>
                    <Badge variant={activity.compliance === 'Pass' ? 'default' : 'destructive'}>
                      {activity.compliance}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => onNavigate('summary', activity)}>
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => onNavigate('dashboard')}
            >
              View All Sessions
            </Button>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
