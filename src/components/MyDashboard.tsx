import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, Filter, Download } from 'lucide-react';

interface MyDashboardProps {
  onNavigate: (page: string, data?: any) => void;
}

export function MyDashboard({ onNavigate }: MyDashboardProps) {
  const [dateRange, setDateRange] = useState('30days');
  const [modeFilter, setModeFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  const mockChartData = [
    { date: 'Oct 25', score: 72, compliance: 100 },
    { date: 'Oct 28', score: 78, compliance: 100 },
    { date: 'Oct 30', score: 75, compliance: 95 },
    { date: 'Nov 01', score: 82, compliance: 100 },
    { date: 'Nov 02', score: 85, compliance: 100 },
  ];

  const mockModeData = [
    { mode: 'Behavioral', count: 8, avgScore: 82 },
    { mode: 'Coding', count: 6, avgScore: 76 },
    { mode: 'Scenario', count: 4, avgScore: 80 },
    { mode: 'Random Mix', count: 5, avgScore: 79 },
  ];

  const mockSessions = [
    {
      id: 1,
      date: '2025-11-02',
      company: 'TechCorp',
      role: 'Senior QA',
      mode: 'Behavioral + Coding',
      score: 85,
      compliance: 'Pass',
      duration: '45 min'
    },
    {
      id: 2,
      date: '2025-11-01',
      company: 'DataFlow Inc',
      role: 'QA Lead',
      mode: 'Scenario',
      score: 82,
      compliance: 'Pass',
      duration: '30 min'
    },
    {
      id: 3,
      date: '2025-10-30',
      company: 'CloudTech',
      role: 'QA Engineer',
      mode: 'Coding',
      score: 75,
      compliance: 'Warning',
      duration: '40 min'
    },
    {
      id: 4,
      date: '2025-10-28',
      company: 'TechCorp',
      role: 'Senior QA',
      mode: 'Behavioral',
      score: 78,
      compliance: 'Pass',
      duration: '35 min'
    },
    {
      id: 5,
      date: '2025-10-25',
      company: 'StartupX',
      role: 'QA Automation',
      mode: 'Random Mix',
      score: 72,
      compliance: 'Pass',
      duration: '50 min'
    },
  ];

  const stats = {
    totalInterviews: 23,
    averageScore: 78.5,
    complianceRate: 96,
    companiesTracked: 5
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2">My Dashboard</h1>
        <p className="text-slate-600">Track your progress and performance analytics</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                  <SelectItem value="90days">Last 90 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select value={modeFilter} onValueChange={setModeFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All modes</SelectItem>
                  <SelectItem value="behavioral">Behavioral</SelectItem>
                  <SelectItem value="coding">Coding</SelectItem>
                  <SelectItem value="scenario">Scenario</SelectItem>
                  <SelectItem value="random">Random Mix</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="qa">QA / Testing</SelectItem>
                  <SelectItem value="developer">Developer</SelectItem>
                  <SelectItem value="devops">DevOps</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl mb-1">{stats.totalInterviews}</div>
            <p className="text-sm text-slate-600">Total Interviews</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl mb-1">{stats.averageScore}</div>
            <p className="text-sm text-slate-600">Average Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl mb-1">{stats.complianceRate}%</div>
            <p className="text-sm text-slate-600">Compliance Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl mb-1">{stats.companiesTracked}</div>
            <p className="text-sm text-slate-600">Companies Tracked</p>
          </CardContent>
        </Card>
      </div>

      {/* Score Trend Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Score Trend Over Time</CardTitle>
          <CardDescription>Your performance progression</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={mockChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} name="Score" />
              <Line type="monotone" dataKey="compliance" stroke="#10b981" strokeWidth={2} name="Compliance %" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Mode Performance */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Performance by Interview Mode</CardTitle>
          <CardDescription>How you perform in different question types</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockModeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mode" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#8b5cf6" name="Sessions" />
              <Bar dataKey="avgScore" fill="#3b82f6" name="Avg Score" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Session History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Session History</CardTitle>
          <CardDescription>All your interview sessions with detailed results</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Compliance</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockSessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>{session.date}</TableCell>
                  <TableCell>{session.company}</TableCell>
                  <TableCell>{session.role}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {session.mode}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={
                      session.score >= 80 ? 'text-green-600' :
                      session.score >= 60 ? 'text-yellow-600' :
                      'text-red-600'
                    }>
                      {session.score}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={session.compliance === 'Pass' ? 'default' : 'secondary'}>
                      {session.compliance}
                    </Badge>
                  </TableCell>
                  <TableCell>{session.duration}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onNavigate('summary', session)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
