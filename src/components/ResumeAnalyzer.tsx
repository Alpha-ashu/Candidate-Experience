import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { AlertCircle, CheckCircle2, Upload, FileText, Download, Target, TrendingUp, AlertTriangle } from 'lucide-react';
import { ParticlesBackground } from './shared/ParticlesBackground';

interface ResumeAnalyzerProps {
  onNavigate: (page: string, data?: any) => void;
}

interface ResumeAnalysis {
  resumeId: string;
  parsedContent: any;
  atsScore: number;
  keywordMatches: string[];
  missingKeywords: string[];
  improvementSuggestions: string[];
  formatScore: number;
}

interface ResumeOptimization {
  resumeId: string;
  targetRole: string;
  optimizedContent: any;
  improvements: Array<{
    type: string;
    description: string;
    impact: string;
  }>;
  newAtsScore: number;
}

export function ResumeAnalyzer({ onNavigate }: ResumeAnalyzerProps) {
  const [activeTab, setActiveTab] = useState("upload");
  const [resumeAnalysis, setResumeAnalysis] = useState<ResumeAnalysis | null>(null);
  const [resumeOptimization, setResumeOptimization] = useState<ResumeOptimization | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetRole, setTargetRole] = useState("software_engineer");
  const [jobDescription, setJobDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
      if (allowedTypes.includes(file.type)) {
        setSelectedFile(file);
      } else {
        alert('Please upload a PDF, DOCX, or TXT file');
      }
    }
  };

  const uploadResume = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('target_role', targetRole);

      const response = await fetch('/api/career/resume/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const analysis: ResumeAnalysis = await response.json();
        setResumeAnalysis(analysis);
        setActiveTab("analysis");
      } else {
        const error = await response.json();
        alert(`Upload failed: ${error.detail}`);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const optimizeResume = async () => {
    if (!resumeAnalysis) return;

    setLoading(true);
    try {
      const response = await fetch('/api/career/resume/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume_id: resumeAnalysis.resumeId,
          target_role: targetRole,
          job_description: jobDescription || undefined
        })
      });

      if (response.ok) {
        const optimization: ResumeOptimization = await response.json();
        setResumeOptimization(optimization);
        setActiveTab("optimization");
      } else {
        const error = await response.json();
        alert(`Optimization failed: ${error.detail}`);
      }
    } catch (error) {
      console.error('Optimization failed:', error);
      alert('Optimization failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="relative min-h-screen">
      <ParticlesBackground id="resume-particles" />

      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2">Resume Analyzer & ATS Optimizer</h1>
          <p className="text-slate-600">Optimize your resume for job applications with AI-powered analysis</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="analysis" disabled={!resumeAnalysis}>Analysis</TabsTrigger>
            <TabsTrigger value="optimization" disabled={!resumeOptimization}>Optimization</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Your Resume
                </CardTitle>
                <CardDescription>
                  Upload your resume in PDF, DOCX, or TXT format for ATS analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* File Upload */}
                <div>
                  <Label htmlFor="resume-upload">Select Resume File</Label>
                  <div className="mt-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.txt"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      {selectedFile ? selectedFile.name : 'Choose File'}
                    </Button>
                  </div>
                </div>

                {/* Target Role Selection */}
                <div>
                  <Label htmlFor="target-role">Target Role</Label>
                  <Select value={targetRole} onValueChange={setTargetRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="software_engineer">Software Engineer</SelectItem>
                      <SelectItem value="qa_engineer">QA Engineer</SelectItem>
                      <SelectItem value="product_manager">Product Manager</SelectItem>
                      <SelectItem value="data_scientist">Data Scientist</SelectItem>
                      <SelectItem value="devops_engineer">DevOps Engineer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Job Description (Optional) */}
                <div>
                  <Label htmlFor="job-description">Job Description (Optional)</Label>
                  <Textarea
                    id="job-description"
                    placeholder="Paste the job description here for better optimization..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    rows={4}
                  />
                </div>

                {/* Upload Button */}
                <Button
                  onClick={uploadResume}
                  disabled={!selectedFile || uploading}
                  className="w-full"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Analyzing Resume...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Analyze Resume
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resume Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Quantify Achievements</p>
                      <p className="text-xs text-slate-600">Use numbers and metrics to show impact</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Use Action Verbs</p>
                      <p className="text-xs text-slate-600">Start bullet points with strong verbs</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Tailor to Job</p>
                      <p className="text-xs text-slate-600">Match keywords from job description</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Keep it Concise</p>
                      <p className="text-xs text-slate-600">Aim for 1-2 pages maximum</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            {resumeAnalysis && (
              <>
                {/* Score Overview */}
                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        ATS Score
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center">
                        <div className={`text-4xl font-bold mb-2 ${getScoreColor(resumeAnalysis.atsScore)}`}>
                          {resumeAnalysis.atsScore}%
                        </div>
                        <Progress value={resumeAnalysis.atsScore} className="w-full mb-2" />
                        <Badge variant={getScoreBadgeVariant(resumeAnalysis.atsScore)}>
                          {resumeAnalysis.atsScore >= 80 ? 'Excellent' :
                           resumeAnalysis.atsScore >= 60 ? 'Good' : 'Needs Improvement'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Format Score
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center">
                        <div className={`text-4xl font-bold mb-2 ${getScoreColor(resumeAnalysis.formatScore)}`}>
                          {resumeAnalysis.formatScore}%
                        </div>
                        <Progress value={resumeAnalysis.formatScore} className="w-full mb-2" />
                        <Badge variant={getScoreBadgeVariant(resumeAnalysis.formatScore)}>
                          {resumeAnalysis.formatScore >= 80 ? 'Well Formatted' :
                           resumeAnalysis.formatScore >= 60 ? 'Acceptable' : 'Poor Format'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Keywords Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle>Keyword Analysis</CardTitle>
                    <CardDescription>Match against job-relevant keywords</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium mb-3 text-green-700">Found Keywords ({resumeAnalysis.keywordMatches.length})</h4>
                        <div className="flex flex-wrap gap-2">
                          {resumeAnalysis.keywordMatches.map((keyword, idx) => (
                            <Badge key={idx} variant="default" className="bg-green-100 text-green-800">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-3 text-red-700">Missing Keywords ({resumeAnalysis.missingKeywords.length})</h4>
                        <div className="flex flex-wrap gap-2">
                          {resumeAnalysis.missingKeywords.slice(0, 10).map((keyword, idx) => (
                            <Badge key={idx} variant="outline" className="border-red-200 text-red-700">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {keyword}
                            </Badge>
                          ))}
                          {resumeAnalysis.missingKeywords.length > 10 && (
                            <Badge variant="outline">
                              +{resumeAnalysis.missingKeywords.length - 10} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Improvement Suggestions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Improvement Suggestions
                    </CardTitle>
                    <CardDescription>AI-powered recommendations to enhance your resume</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {resumeAnalysis.improvementSuggestions.map((suggestion, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                          <p className="text-sm">{suggestion}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <Button onClick={optimizeResume} disabled={loading}>
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Optimizing...
                      </>
                    ) : (
                      <>
                        <Target className="h-4 w-4 mr-2" />
                        Optimize Resume
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Different Resume
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="optimization" className="space-y-6">
            {resumeOptimization && (
              <>
                {/* Optimization Results */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Optimization Results
                    </CardTitle>
                    <CardDescription>
                      Your resume has been optimized for the {resumeOptimization.targetRole} role
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <h4 className="font-medium mb-2">Original ATS Score</h4>
                        <div className={`text-3xl font-bold ${getScoreColor(resumeAnalysis?.atsScore || 0)}`}>
                          {resumeAnalysis?.atsScore || 0}%
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">New ATS Score</h4>
                        <div className={`text-3xl font-bold ${getScoreColor(resumeOptimization.newAtsScore)}`}>
                          {resumeOptimization.newAtsScore}%
                        </div>
                        <div className="text-green-600 font-medium">
                          +{resumeOptimization.newAtsScore - (resumeAnalysis?.atsScore || 0)}% improvement
                        </div>
                      </div>
                    </div>

                    <h4 className="font-medium mb-3">Improvements Made:</h4>
                    <div className="space-y-2">
                      {resumeOptimization.improvements.map((improvement, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-sm">{improvement.description}</p>
                            <Badge variant="outline" className="mt-1">
                              Impact: {improvement.impact}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Download Options */}
                <Card>
                  <CardHeader>
                    <CardTitle>Download Optimized Resume</CardTitle>
                    <CardDescription>Choose your preferred format</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-4">
                      <Button variant="outline" className="h-auto flex-col gap-2">
                        <Download className="h-6 w-6" />
                        <span>Download PDF</span>
                      </Button>
                      <Button variant="outline" className="h-auto flex-col gap-2">
                        <Download className="h-6 w-6" />
                        <span>Download DOCX</span>
                      </Button>
                      <Button variant="outline" className="h-auto flex-col gap-2">
                        <Download className="h-6 w-6" />
                        <span>Download TXT</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Resume Templates</CardTitle>
                <CardDescription>Choose from professional templates optimized for ATS</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                    <div className="aspect-video bg-slate-100 rounded-t-lg"></div>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">Modern Clean</h4>
                      <p className="text-sm text-slate-600 mb-3">Clean, professional template suitable for most industries</p>
                      <Button variant="outline" size="sm" className="w-full">Use Template</Button>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                    <div className="aspect-video bg-slate-100 rounded-t-lg"></div>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">Technical Professional</h4>
                      <p className="text-sm text-slate-600 mb-3">Optimized for technical roles with skills section</p>
                      <Button variant="outline" size="sm" className="w-full">Use Template</Button>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                    <div className="aspect-video bg-slate-100 rounded-t-lg"></div>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">Executive</h4>
                      <p className="text-sm text-slate-600 mb-3">Template for senior-level positions and executives</p>
                      <Button variant="outline" size="sm" className="w-full">Use Template</Button>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}