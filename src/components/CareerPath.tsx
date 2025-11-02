import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { AlertCircle, CheckCircle2, Clock, Target, TrendingUp, BookOpen, Award } from 'lucide-react';
import { ParticlesBackground } from './shared/ParticlesBackground';

interface CareerPathProps {
  onNavigate: (page: string, data?: any) => void;
}

interface CareerPath {
  userId: string;
  targetRole: string;
  currentSkills: string[];
  requiredSkills: string[];
  skillGaps: string[];
  learningResources: Array<{
    skill: string;
    title: string;
    type: string;
    duration: string;
    priority: string;
  }>;
  timelineMonths: number;
  milestones: Array<{
    id: string;
    title: string;
    targetMonth: number;
    skills: string[];
    deliverables: string[];
    successCriteria: string;
    completed: boolean;
  }>;
  createdAt: string;
}

interface SkillAssessment {
  userId: string;
  skillCategory: string;
  skillName: string;
  currentLevel: number;
  targetLevel: number;
  assessmentScore: number;
  improvementSuggestions: string[];
  lastAssessed: string;
}

export function CareerPath({ onNavigate }: CareerPathProps) {
  const [activeTab, setActiveTab] = useState("path");
  const [careerPaths, setCareerPaths] = useState<CareerPath[]>([]);
  const [skillAssessments, setSkillAssessments] = useState<SkillAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [marketInsights, setMarketInsights] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state for new career path
  const [formData, setFormData] = useState({
    targetRole: '',
    currentSkills: '',
    experienceLevel: 'entry',
    timelinePreference: 12
  });

  useEffect(() => {
    loadCareerData();
  }, []);

  const loadCareerData = async () => {
    try {
      setLoading(true);

      // Load career paths
      const pathsResponse = await fetch('/api/career/path');
      if (pathsResponse.ok) {
        const paths = await pathsResponse.json();
        setCareerPaths(paths);
      }

      // Load skill assessments
      const assessmentsResponse = await fetch('/api/career/skills');
      if (assessmentsResponse.ok) {
        const assessments = await assessmentsResponse.json();
        setSkillAssessments(assessments);
      }

      // Load market insights
      const insightsResponse = await fetch('/api/career/market-insights');
      if (insightsResponse.ok) {
        const insights = await insightsResponse.json();
        setMarketInsights(insights);
      }
    } catch (error) {
      console.error('Failed to load career data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCareerPath = async () => {
    try {
      const response = await fetch('/api/career/path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_role: formData.targetRole,
          current_skills: formData.currentSkills.split(',').map(s => s.trim()),
          experience_level: formData.experienceLevel,
          timeline_preference: formData.timelinePreference
        })
      });

      if (response.ok) {
        const newCareerPath = await response.json();
        setCareerPaths([newCareerPath, ...careerPaths]);
        setShowForm(false);
        setFormData({
          targetRole: '',
          currentSkills: '',
          experienceLevel: 'entry',
          timelinePreference: 12
        });
      }
    } catch (error) {
      console.error('Failed to generate career path:', error);
    }
  };

  const completeMilestone = async (milestoneId: string) => {
    try {
      const response = await fetch(`/api/career/milestone/${milestoneId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Completed milestone' })
      });

      if (response.ok) {
        loadCareerData(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to complete milestone:', error);
    }
  };

  const assessSkills = async () => {
    try {
      const response = await fetch('/api/career/skills/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          self_assessment: true,
          target_skills: careerPaths[0]?.requiredSkills || []
        })
      });

      if (response.ok) {
        const assessments = await response.json();
        setSkillAssessments(assessments);
      }
    } catch (error) {
      console.error('Failed to assess skills:', error);
    }
  };

  const currentPath = careerPaths[0];
  const progressPercentage = currentPath
    ? Math.round((currentPath.milestones.filter(m => m.completed).length / currentPath.milestones.length) * 100)
    : 0;

  if (loading) {
    return (
      <div className="relative min-h-screen">
        <ParticlesBackground id="career-particles" />
        <div className="relative z-10 container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading your career data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <ParticlesBackground id="career-particles" />

      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2">Career Path & Development</h1>
          <p className="text-slate-600">Plan your professional growth with AI-powered guidance</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="path">Career Path</TabsTrigger>
            <TabsTrigger value="skills">Skills Assessment</TabsTrigger>
            <TabsTrigger value="learning">Learning Resources</TabsTrigger>
            <TabsTrigger value="insights">Market Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="path" className="space-y-6">
            {currentPath ? (
              <>
                {/* Current Path Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      {currentPath.targetRole}
                    </CardTitle>
                    <CardDescription>
                      Timeline: {currentPath.timelineMonths} months •
                      Progress: {progressPercentage}%
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-medium">Overall Progress</span>
                          <span className="text-sm text-slate-600">{progressPercentage}%</span>
                        </div>
                        <Progress value={progressPercentage} className="w-full" />
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium mb-2">Current Skills</h4>
                          <div className="flex flex-wrap gap-1">
                            {currentPath.currentSkills.map((skill, idx) => (
                              <Badge key={idx} variant="default">{skill}</Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Skill Gaps</h4>
                          <div className="flex flex-wrap gap-1">
                            {currentPath.skillGaps.map((skill, idx) => (
                              <Badge key={idx} variant="outline">{skill}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Milestones */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Learning Milestones
                    </CardTitle>
                    <CardDescription>Track your progress through key achievements</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {currentPath.milestones.map((milestone, idx) => (
                        <div key={milestone.id} className={`p-4 rounded-lg border ${milestone.completed ? 'bg-green-50 border-green-200' : 'bg-slate-50'}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {milestone.completed ? (
                                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                                ) : (
                                  <div className="h-5 w-5 rounded-full border-2 border-slate-300" />
                                )}
                                <h4 className="font-medium">{milestone.title}</h4>
                                <Badge variant="outline" className="text-xs">
                                  Month {milestone.targetMonth}
                                </Badge>
                              </div>
                              <p className="text-sm text-slate-600 mb-2">{milestone.successCriteria}</p>
                              <div className="text-sm">
                                <strong>Skills:</strong> {milestone.skills.join(', ')}
                              </div>
                            </div>
                            {!milestone.completed && (
                              <Button
                                size="sm"
                                onClick={() => completeMilestone(milestone.id)}
                                className="ml-4"
                              >
                                Mark Complete
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Target className="h-16 w-16 mx-auto mb-4 text-slate-400" />
                  <h3 className="text-lg font-medium mb-2">No Career Path Yet</h3>
                  <p className="text-slate-600 mb-6">Create your first personalized career development plan</p>
                  <Button onClick={() => setShowForm(true)}>
                    Create Career Path
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="skills" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Skills Assessment</h3>
              <Button onClick={assessSkills} variant="outline">
                Reassess Skills
              </Button>
            </div>

            {skillAssessments.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {skillAssessments.map((assessment, idx) => (
                  <Card key={idx}>
                    <CardHeader>
                      <CardTitle className="text-base">{assessment.skillName}</CardTitle>
                      <CardDescription>{assessment.skillCategory}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">Skill Level</span>
                            <span className="text-sm font-medium">
                              {assessment.currentLevel}/10 → {assessment.targetLevel}/10
                            </span>
                          </div>
                          <Progress value={(assessment.currentLevel / 10) * 100} className="w-full" />
                        </div>

                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">Assessment Score</span>
                            <span className="text-sm font-medium">{assessment.assessmentScore.toFixed(1)}%</span>
                          </div>
                          <Progress value={assessment.assessmentScore} className="w-full" />
                        </div>

                        <div>
                          <h5 className="font-medium text-sm mb-2">Improvement Suggestions:</h5>
                          <ul className="text-sm text-slate-600 space-y-1">
                            {assessment.improvementSuggestions.slice(0, 3).map((suggestion, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-blue-600 mt-1">•</span>
                                {suggestion}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <TrendingUp className="h-16 w-16 mx-auto mb-4 text-slate-400" />
                  <h3 className="text-lg font-medium mb-2">No Skills Assessment Yet</h3>
                  <p className="text-slate-600 mb-6">Get personalized skill recommendations based on your interview performance</p>
                  <Button onClick={assessSkills}>
                    Assess My Skills
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="learning" className="space-y-6">
            <h3 className="text-lg font-medium">Recommended Learning Resources</h3>

            {currentPath?.learningResources ? (
              <div className="grid md:grid-cols-2 gap-4">
                {currentPath.learningResources.map((resource, idx) => (
                  <Card key={idx}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">{resource.title}</h4>
                        <Badge variant={resource.priority === 'high' ? 'default' : 'secondary'}>
                          {resource.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-3">
                        <BookOpen className="inline h-4 w-4 mr-1" />
                        {resource.type} • {resource.duration}
                      </p>
                      <p className="text-sm text-blue-600 font-medium">
                        Skill: {resource.skill}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <BookOpen className="h-16 w-16 mx-auto mb-4 text-slate-400" />
                  <h3 className="text-lg font-medium mb-2">Create a Career Path First</h3>
                  <p className="text-slate-600 mb-6">Get personalized learning recommendations based on your career goals</p>
                  <Button onClick={() => setActiveTab("path")}>
                    Create Career Path
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <h3 className="text-lg font-medium">Market Insights & Trends</h3>

            {marketInsights ? (
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Hot Skills</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {marketInsights.hot_skills?.map((skill: string, idx: number) => (
                        <Badge key={idx} variant="default">{skill}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Emerging Roles</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {marketInsights.emerging_roles?.map((role: string, idx: number) => (
                        <Badge key={idx} variant="outline">{role}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">Industry Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {marketInsights.industry_trends?.map((trend: any, idx: number) => (
                        <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                          <h5 className="font-medium mb-1">{trend.trend}</h5>
                          <p className="text-sm text-slate-600">{trend.relevance}</p>
                          <Badge variant="outline" className="mt-2">
                            Impact: {trend.impact}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <TrendingUp className="h-16 w-16 mx-auto mb-4 text-slate-400" />
                  <h3 className="text-lg font-medium mb-2">Loading Market Insights</h3>
                  <p className="text-slate-600">Fetching latest industry trends...</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Career Path Creation Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>Create Career Path</CardTitle>
                <CardDescription>Set your career goals and preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="targetRole">Target Role</Label>
                  <Input
                    id="targetRole"
                    placeholder="e.g., Senior Software Engineer"
                    value={formData.targetRole}
                    onChange={(e) => setFormData({...formData, targetRole: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="currentSkills">Current Skills</Label>
                  <Input
                    id="currentSkills"
                    placeholder="e.g., Python, JavaScript, React"
                    value={formData.currentSkills}
                    onChange={(e) => setFormData({...formData, currentSkills: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="experienceLevel">Experience Level</Label>
                  <Select value={formData.experienceLevel} onValueChange={(value) => setFormData({...formData, experienceLevel: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entry">Entry Level</SelectItem>
                      <SelectItem value="mid">Mid Level</SelectItem>
                      <SelectItem value="senior">Senior Level</SelectItem>
                      <SelectItem value="lead">Lead/Principal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="timeline">Timeline (months)</Label>
                  <Select value={formData.timelinePreference.toString()} onValueChange={(value) => setFormData({...formData, timelinePreference: parseInt(value)})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">6 months</SelectItem>
                      <SelectItem value="12">12 months</SelectItem>
                      <SelectItem value="18">18 months</SelectItem>
                      <SelectItem value="24">24 months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={generateCareerPath} className="flex-1">
                    Generate Path
                  </Button>
                  <Button variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}