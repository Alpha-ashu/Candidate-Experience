import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Slider } from './ui/slider';
import { Alert, AlertDescription } from './ui/alert';
import { X, Upload, Info, Loader2 } from 'lucide-react';
import { createSession, login } from '../api/client';

interface SessionSetupProps {
  onNavigate: (page: string, data?: any) => void;
}

export function SessionSetup({ onNavigate }: SessionSetupProps) {
  const [roleCategory, setRoleCategory] = useState('');
  const [interviewModes, setInterviewModes] = useState<string[]>(['random']);
  const [questionCount, setQuestionCount] = useState([10]);
  const [duration, setDuration] = useState([45]);
  const [difficulty, setDifficulty] = useState('adaptive');
  const [companies, setCompanies] = useState<string[]>([]);
  const [newCompany, setNewCompany] = useState('');
  const [consentRecording, setConsentRecording] = useState(false);
  const [consentAntiCheat, setConsentAntiCheat] = useState(false);
  const [mcqEnabled, setMcqEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const roleCategories = [
    'QA / Quality Assurance',
    'Developer',
    'DevOps',
    'Frontend',
    'Backend',
    'Network Engineer',
    'Data',
    'Product',
    'SRE',
    'Security',
    'Others'
  ];

  const modes = [
    { id: 'behavioral', label: 'Behavioral', desc: 'Soft skills & STAR prompts' },
    { id: 'coding', label: 'Coding', desc: 'MCQ + challenges + fill-in-the-blank' },
    { id: 'scenario', label: 'Scenario-based', desc: 'Real projects & troubleshooting' },
    { id: 'random', label: 'Random (Real-Time AI Mix)', desc: 'System varies modes unpredictably' }
  ];

  const toggleMode = (modeId: string) => {
    if (modeId === 'random') {
      setInterviewModes(['random']);
    } else {
      const newModes = interviewModes.filter(m => m !== 'random');
      if (newModes.includes(modeId)) {
        setInterviewModes(newModes.filter(m => m !== modeId));
      } else {
        setInterviewModes([...newModes, modeId]);
      }
    }
  };

  const addCompany = () => {
    if (newCompany.trim() && !companies.includes(newCompany.trim())) {
      setCompanies([...companies, newCompany.trim()]);
      setNewCompany('');
    }
  };

  const removeCompany = (company: string) => {
    setCompanies(companies.filter(c => c !== company));
  };

  const canProceed = roleCategory && interviewModes.length > 0 && consentRecording && consentAntiCheat;

  const handleStartSession = async () => {
    if (!canProceed) return;

    setIsLoading(true);
    setError('');

    try {
      // Get experience values from the form
      const experienceYears = parseInt((document.getElementById('experience-years') as HTMLInputElement)?.value || '5');
      const experienceMonths = parseInt((document.getElementById('experience-months') as HTMLInputElement)?.value || '0');
      const language = (document.getElementById('language') as HTMLSelectElement)?.value || 'en-us';

      // First, ensure we have a user token
      let userJwt = localStorage.getItem('cxUserJwt');
      if (!userJwt) {
        // Auto-login with demo user
        const loginResponse = await login('demo@candidate.com');
        userJwt = loginResponse.token;
        localStorage.setItem('cxUserJwt', userJwt);
      }

      // Create session payload
      const sessionPayload = {
        roleCategory,
        experienceYears,
        experienceMonths,
        modes: interviewModes,
        questionCount: questionCount[0],
        durationLimit: duration[0],
        language,
        difficulty,
        jobDescription: (document.getElementById('job-description') as HTMLTextAreaElement)?.value || undefined,
        companyTargets: companies,
        includeCuratedQuestions: (document.getElementById('curated-questions') as HTMLInputElement)?.checked ?? true,
        allowAIGenerated: (document.getElementById('ai-generated') as HTMLInputElement)?.checked ?? true,
        enableMCQ: mcqEnabled,
        consentRecording,
        consentAntiCheat,
        consentTimestamp: new Date().toISOString(),
      };

      // Create the session
      const sessionResponse = await createSession(userJwt, sessionPayload);

      // Navigate to precheck with session data
      const sessionData = {
        ...sessionPayload,
        sessionId: sessionResponse.sessionId,
        ist: sessionResponse.ist,
        nextStep: sessionResponse.nextStep,
      };

      onNavigate('precheck', sessionData);
    } catch (error) {
      console.error('Failed to create session:', error);
      setError('Failed to create session. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="mb-2">AI Mock Interview Setup</h1>
        <p className="text-slate-600">Configure your interview session parameters</p>
      </div>

      {/* Error Display */}
      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            {error}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Role Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Role Selection</CardTitle>
            <CardDescription>What position are you preparing for?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="role-category">Role Category *</Label>
              <Select value={roleCategory} onValueChange={setRoleCategory}>
                <SelectTrigger id="role-category">
                  <SelectValue placeholder="Select a role category" />
                </SelectTrigger>
                <SelectContent>
                  {roleCategories.map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="experience-years">Years of Experience</Label>
                <Input id="experience-years" type="number" min="0" max="50" defaultValue="5" />
              </div>
              <div>
                <Label htmlFor="experience-months">Additional Months</Label>
                <Input id="experience-months" type="number" min="0" max="11" defaultValue="0" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interview Modes */}
        <Card>
          <CardHeader>
            <CardTitle>Interview Modes *</CardTitle>
            <CardDescription>Select one or more modes (Random will vary automatically)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-3">
              {modes.map(mode => (
                <div
                  key={mode.id}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    interviewModes.includes(mode.id)
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => toggleMode(mode.id)}
                >
                  <div className="flex items-start gap-2">
                    <Checkbox
                      checked={interviewModes.includes(mode.id)}
                      onCheckedChange={() => toggleMode(mode.id)}
                    />
                    <div className="flex-1">
                      <div className="mb-1">{mode.label}</div>
                      <p className="text-xs text-slate-600">{mode.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {interviewModes.includes('coding') && (
              <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="mcq-enabled"
                    checked={mcqEnabled}
                    onCheckedChange={(checked) => setMcqEnabled(checked as boolean)}
                  />
                  <Label htmlFor="mcq-enabled">Enable MCQ/Fill-in-the-blank mode</Label>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Session Parameters */}
        <Card>
          <CardHeader>
            <CardTitle>Session Parameters</CardTitle>
            <CardDescription>Customize your interview length and difficulty</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Number of Questions: {questionCount[0]}</Label>
              <Slider
                value={questionCount}
                onValueChange={setQuestionCount}
                min={5}
                max={20}
                step={1}
                className="mt-2"
              />
              <p className="text-xs text-slate-600 mt-1">Recommended: 8-12 questions</p>
            </div>
            <div>
              <Label>Session Duration: {duration[0]} minutes</Label>
              <Slider
                value={duration}
                onValueChange={setDuration}
                min={15}
                max={90}
                step={5}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="language">Language & Accent</Label>
              <Select defaultValue="en-us">
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en-us">English (US)</SelectItem>
                  <SelectItem value="en-uk">English (UK)</SelectItem>
                  <SelectItem value="en-in">English (India)</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="difficulty">Difficulty Level</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger id="difficulty">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                  <SelectItem value="adaptive">Adaptive (Recommended)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Context Inputs */}
        <Card>
          <CardHeader>
            <CardTitle>Context Inputs (Optional)</CardTitle>
            <CardDescription>Help tailor questions to your target role</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="job-description">Job Description</Label>
              <Textarea
                id="job-description"
                placeholder="Paste the job description here to get more relevant questions..."
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="resume">Resume Upload</Label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 cursor-pointer">
                <Upload className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                <p className="text-sm">Click to upload or drag and drop</p>
                <p className="text-xs text-slate-500">PDF, DOC, DOCX (max 5MB)</p>
              </div>
            </div>
            <div>
              <Label htmlFor="company-target">Company Targets</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  id="company-target"
                  placeholder="Add company name"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCompany()}
                />
                <Button type="button" onClick={addCompany}>Add</Button>
              </div>
              {companies.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {companies.map(company => (
                    <Badge key={company} variant="secondary" className="gap-1">
                      {company}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => removeCompany(company)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Question Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Question Sources</CardTitle>
            <CardDescription>Where should questions come from?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2">
              <Checkbox id="curated-questions" defaultChecked />
              <div className="flex-1">
                <Label htmlFor="curated-questions">Include curated market questions from public portals</Label>
                <Alert className="mt-2">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Questions sourced from publicly available interview databases with full compliance.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="ai-generated" defaultChecked />
              <Label htmlFor="ai-generated">Allow AI to generate new questions in real time</Label>
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Consent */}
        <Card>
          <CardHeader>
            <CardTitle>Privacy & Consent *</CardTitle>
            <CardDescription>Required to proceed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2">
              <Checkbox
                id="consent-recording"
                checked={consentRecording}
                onCheckedChange={(checked) => setConsentRecording(checked as boolean)}
              />
              <Label htmlFor="consent-recording" className="leading-snug">
                I consent to recording (audio, video, and screen) for this session
              </Label>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="consent-anticheat"
                checked={consentAntiCheat}
                onCheckedChange={(checked) => setConsentAntiCheat(checked as boolean)}
              />
              <Label htmlFor="consent-anticheat" className="leading-snug">
                I understand and agree to the anti-cheat rules
              </Label>
            </div>
            <Button variant="link" className="h-auto p-0 text-xs" onClick={() => onNavigate('policies')}>
              View Anti-Cheat Policy →
            </Button>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between pt-4">
          <Button variant="outline" onClick={() => onNavigate('home')}>
            Cancel
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" disabled>
              Save As Template
            </Button>
            <Button
              onClick={handleStartSession}
              disabled={!canProceed || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Session...
                </>
              ) : (
                'Run Pre-Check'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
