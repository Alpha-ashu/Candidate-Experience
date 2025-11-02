import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { Slider } from './ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { StatusLight } from './shared/StatusLight';
import { ParticlesBackground } from './shared/ParticlesBackground';
import { CheckCircle2, AlertCircle, XCircle, Info, Camera, Mic } from 'lucide-react';

interface ComponentLibraryProps {
  onNavigate: (page: string) => void;
}

export function ComponentLibrary({ onNavigate }: ComponentLibraryProps) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <Button variant="ghost" onClick={() => onNavigate('home')}>
          ← Back to Home
        </Button>
      </div>

      <div className="mb-8">
        <h1 className="mb-2">Component Library</h1>
        <p className="text-slate-600">
          Reusable UI components with specifications and variants
        </p>
      </div>

      <div className="space-y-8">
        {/* Status Light */}
        <Card>
          <CardHeader>
            <CardTitle>Status Light</CardTitle>
            <CardDescription>
              Real-time anti-cheat compliance indicator
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-800 p-4 rounded">
              <div className="space-y-3">
                <StatusLight status="pass" label="Compliance" />
                <StatusLight status="warning" label="Compliance" />
                <StatusLight status="fail" label="Compliance" />
              </div>
            </div>
            <div className="text-sm text-slate-600">
              <strong>States:</strong> pass (green, good standing), warning (yellow, minor violations),
              fail (red, major violations)
            </div>
            <div className="text-sm text-slate-600">
              <strong>Behavior:</strong> Pulsing animation, updates in real-time based on strike events
            </div>
          </CardContent>
        </Card>

        {/* Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
            <CardDescription>Primary, secondary, outline, and destructive actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button disabled>Disabled</Button>
            </div>
            <Separator className="my-4" />
            <div className="flex flex-wrap gap-3">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon">
                <Camera className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Badges */}
        <Card>
          <CardHeader>
            <CardTitle>Badges</CardTitle>
            <CardDescription>Status indicators and labels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
            </div>
            <Separator className="my-4" />
            <div className="flex flex-wrap gap-3 text-sm">
              <Badge variant="default">Pass</Badge>
              <Badge variant="secondary">Warning</Badge>
              <Badge variant="destructive">Failed</Badge>
              <Badge variant="outline">Behavioral</Badge>
              <Badge variant="outline">Coding</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Form Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Form Controls</CardTitle>
            <CardDescription>Inputs, textareas, selects, and checkboxes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="demo-input">Text Input</Label>
              <Input id="demo-input" placeholder="Enter text..." />
            </div>
            <div>
              <Label htmlFor="demo-textarea">Textarea</Label>
              <Textarea id="demo-textarea" placeholder="Multi-line text..." rows={3} />
            </div>
            <div>
              <Label htmlFor="demo-select">Select Dropdown</Label>
              <Select>
                <SelectTrigger id="demo-select">
                  <SelectValue placeholder="Choose an option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Option 1</SelectItem>
                  <SelectItem value="2">Option 2</SelectItem>
                  <SelectItem value="3">Option 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="demo-checkbox" />
              <Label htmlFor="demo-checkbox">Checkbox with label</Label>
            </div>
          </CardContent>
        </Card>

        {/* Progress & Sliders */}
        <Card>
          <CardHeader>
            <CardTitle>Progress & Sliders</CardTitle>
            <CardDescription>Visual indicators for progress and value selection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Progress Bar</Label>
              <Progress value={65} className="mt-2" />
              <p className="text-xs text-slate-600 mt-1">65% complete</p>
            </div>
            <div>
              <Label>Slider Control</Label>
              <Slider defaultValue={[50]} min={0} max={100} step={1} className="mt-2" />
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Alerts & Notifications</CardTitle>
            <CardDescription>Informational, warning, and error messages</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Informational message with helpful context
              </AlertDescription>
            </Alert>
            <Alert className="border-yellow-300 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                Warning: Check your network connection
              </AlertDescription>
            </Alert>
            <Alert className="border-red-300 bg-red-50">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                Error: Failed to initialize camera
              </AlertDescription>
            </Alert>
            <Alert className="border-green-300 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Success: All checks passed
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Cards */}
        <Card>
          <CardHeader>
            <CardTitle>Cards</CardTitle>
            <CardDescription>Container component for grouped content</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Nested Card</CardTitle>
                  <CardDescription>With header and content</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">Card content goes here</p>
                </CardContent>
              </Card>
              <Card className="border-2 border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
                  <p className="text-sm">Highlighted card variant</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Compliance Checklist */}
        <Card>
          <CardHeader>
            <CardTitle>Compliance Checklist</CardTitle>
            <CardDescription>Pre-check status items with live updates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded">
              <div className="flex items-center gap-3">
                <Camera className="h-5 w-5" />
                <div>
                  <div className="text-sm">Camera</div>
                  <p className="text-xs text-slate-600">Face detected with good lighting</p>
                </div>
              </div>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <div className="flex items-center gap-3">
                <Mic className="h-5 w-5" />
                <div>
                  <div className="text-sm">Microphone</div>
                  <p className="text-xs text-slate-600">Background noise detected</p>
                </div>
              </div>
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        {/* Design Tokens */}
        <Card>
          <CardHeader>
            <CardTitle>Design Tokens</CardTitle>
            <CardDescription>Colors, spacing, and typography</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="mb-2">Colors</h4>
              <div className="grid grid-cols-5 gap-2">
                <div className="space-y-1">
                  <div className="h-12 rounded bg-blue-600"></div>
                  <p className="text-xs">Primary</p>
                </div>
                <div className="space-y-1">
                  <div className="h-12 rounded bg-green-600"></div>
                  <p className="text-xs">Success</p>
                </div>
                <div className="space-y-1">
                  <div className="h-12 rounded bg-yellow-600"></div>
                  <p className="text-xs">Warning</p>
                </div>
                <div className="space-y-1">
                  <div className="h-12 rounded bg-red-600"></div>
                  <p className="text-xs">Error</p>
                </div>
                <div className="space-y-1">
                  <div className="h-12 rounded bg-slate-600"></div>
                  <p className="text-xs">Neutral</p>
                </div>
              </div>
            </div>
            <Separator />
            <div>
              <h4 className="mb-2">Typography</h4>
              <div className="space-y-2">
                <h1>Heading 1</h1>
                <h2>Heading 2</h2>
                <h3>Heading 3</h3>
                <h4>Heading 4</h4>
                <p>Body text paragraph with normal weight and size</p>
                <p className="text-sm text-slate-600">Small text for captions and helpers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Particles Background */}
        <Card>
          <CardHeader>
            <CardTitle>Particles Background</CardTitle>
            <CardDescription>Animated particle effect for visual enhancement</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative h-64 rounded-lg overflow-hidden bg-gradient-to-br from-blue-600 to-purple-600">
              <ParticlesBackground 
                id="demo-particles"
                config={{
                  particles: {
                    number: {
                      value: 60,
                      density: {
                        enable: true,
                        value_area: 800
                      }
                    },
                    color: {
                      value: '#ffffff'
                    },
                    opacity: {
                      value: 0.5
                    },
                    size: {
                      value: 3
                    },
                    line_linked: {
                      enable: true,
                      distance: 150,
                      color: '#ffffff',
                      opacity: 0.4,
                      width: 1
                    },
                    move: {
                      enable: true,
                      speed: 2
                    }
                  },
                  interactivity: {
                    events: {
                      onhover: {
                        enable: true,
                        mode: 'grab'
                      }
                    },
                    modes: {
                      grab: {
                        distance: 140,
                        line_linked: {
                          opacity: 1
                        }
                      }
                    }
                  }
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="text-white text-center">
                  <h3 className="mb-2">Interactive Particles</h3>
                  <p className="text-sm opacity-90">Hover to interact</p>
                </div>
              </div>
            </div>
            <div className="text-sm text-slate-600">
              <strong>Usage:</strong> Used on Candidate Home and Interview Room for visual depth.
              Fully configurable with particle count, color, opacity, and interactivity settings.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
