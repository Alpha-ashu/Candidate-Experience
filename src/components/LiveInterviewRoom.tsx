import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  MessageSquare,
  Share,
  Monitor,
  Settings,
  Users,
  Clock
} from 'lucide-react';
import { ParticlesBackground } from './shared/ParticlesBackground';

interface LiveInterviewRoomProps {
  onNavigate: (page: string, data?: any) => void;
  sessionId?: string;
}

interface InterviewSession {
  sessionId: string;
  candidateId: string;
  recruiterId?: string;
  scheduledTime: string;
  duration: number;
  status: string;
  meetingLink: string;
  recordingEnabled: boolean;
}

export function LiveInterviewRoom({ onNavigate, sessionId }: LiveInterviewRoomProps) {
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [localVideo, setLocalVideo] = useState(false);
  const [localAudio, setLocalAudio] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showSchedule, setShowSchedule] = useState(!sessionId);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sessionId) {
      loadSession();
      startTimer();
    }
  }, [sessionId]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const loadSession = async () => {
    try {
      const response = await fetch(`/api/live-interview/session/${sessionId}`);
      if (response.ok) {
        const sessionData = await response.json();
        setSession(sessionData);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    } finally {
      setLoading(false);
    }
  };

  const startTimer = () => {
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleVideo = () => {
    setLocalVideo(!localVideo);
    // In a real implementation, this would toggle the video track
  };

  const toggleAudio = () => {
    setLocalAudio(!localAudio);
    // In a real implementation, this would toggle the audio track
  };

  const toggleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing);
    // In a real implementation, this would start/stop screen sharing
  };

  const endCall = () => {
    // In a real implementation, this would end the WebRTC call
    setIsConnected(false);
    onNavigate('home');
  };

  const sendMessage = () => {
    if (newMessage.trim()) {
      const message = {
        id: Date.now(),
        text: newMessage,
        sender: 'You',
        timestamp: new Date().toISOString()
      };
      setChatMessages([...chatMessages, message]);
      setNewMessage('');

      // In a real implementation, this would send via WebSocket
    }
  };

  const scheduleSession = async (formData: any) => {
    try {
      const response = await fetch('/api/live-interview/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const newSession = await response.json();
        setSession(newSession);
        setShowSchedule(false);
      }
    } catch (error) {
      console.error('Failed to schedule session:', error);
    }
  };

  if (loading) {
    return (
      <div className="relative min-h-screen">
        <ParticlesBackground id="live-interview-particles" />
        <div className="relative z-10 container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading interview session...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showSchedule) {
    return <ScheduleInterviewForm onSchedule={scheduleSession} onNavigate={onNavigate} />;
  }

  return (
    <div className="relative min-h-screen bg-slate-900">
      <ParticlesBackground id="live-interview-particles" />

      <div className="relative z-10 h-screen flex flex-col">
        {/* Header */}
        <div className="bg-slate-800 border-b border-slate-700 p-4">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-white font-medium">Live Interview Session</h2>
              <Badge variant={session?.status === 'in_progress' ? 'default' : 'secondary'}>
                {session?.status || 'Scheduled'}
              </Badge>
              <div className="flex items-center gap-2 text-slate-300">
                <Clock className="h-4 w-4" />
                <span className="font-mono">{formatTime(elapsedTime)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="text-white border-slate-600 hover:bg-slate-700">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 container mx-auto p-4 flex gap-4">
          {/* Video Area */}
          <div className="flex-1 flex flex-col gap-4">
            {/* Remote Video (Main) */}
            <Card className="flex-1 bg-slate-800 border-slate-700">
              <CardContent className="p-0 h-full relative">
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                  {isConnected ? (
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center text-slate-400">
                      <Video className="h-16 w-16 mx-auto mb-4" />
                      <p>Waiting for other participant to join...</p>
                      <Button
                        onClick={() => setIsConnected(true)}
                        className="mt-4"
                      >
                        Join Interview
                      </Button>
                    </div>
                  )}
                </div>

                {/* Local Video (Picture-in-Picture) */}
                <div className="absolute bottom-4 right-4 w-48 h-36 bg-slate-900 rounded-lg shadow-lg">
                  {localVideo ? (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500">
                      <VideoOff className="h-8 w-8" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Controls */}
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant={localVideo ? "default" : "destructive"}
                    size="lg"
                    onClick={toggleVideo}
                  >
                    {localVideo ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                  </Button>

                  <Button
                    variant={localAudio ? "default" : "destructive"}
                    size="lg"
                    onClick={toggleAudio}
                  >
                    {localAudio ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                  </Button>

                  <Button
                    variant={isScreenSharing ? "default" : "outline"}
                    size="lg"
                    onClick={toggleScreenShare}
                    className="text-white border-slate-600 hover:bg-slate-700"
                  >
                    <Monitor className="h-5 w-5" />
                  </Button>

                  <Button
                    variant="destructive"
                    size="lg"
                    onClick={endCall}
                  >
                    <Phone className="h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chat Panel */}
          <Card className="w-80 bg-slate-800 border-slate-700 flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Interview Chat
              </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-4 pt-0">
              {/* Messages */}
              <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto mb-4 space-y-3 min-h-[200px] max-h-[400px]"
              >
                {chatMessages.length === 0 ? (
                  <div className="text-center text-slate-500 py-8">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-2 rounded-lg ${
                        message.sender === 'You'
                          ? 'bg-blue-600 text-white ml-auto'
                          : 'bg-slate-700 text-white'
                      } max-w-[80%]`}
                    >
                      <p className="text-sm">{message.text}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Message Input */}
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                />
                <Button onClick={sendMessage} size="sm">
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ScheduleInterviewForm({ onSchedule, onNavigate }: { onSchedule: any; onNavigate: any }) {
  const [formData, setFormData] = useState({
    candidate_id: 'demo-candidate',
    scheduled_time: '',
    duration: 60,
    recording_enabled: true,
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSchedule(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      <ParticlesBackground id="schedule-particles" />

      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="mb-2">Schedule Live Interview</h1>
            <p className="text-slate-600">Book a 1-on-1 session with a real interviewer</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Interview Details</CardTitle>
              <CardDescription>Fill in the details to schedule your session</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="scheduled-time">Scheduled Time</Label>
                  <Input
                    id="scheduled-time"
                    type="datetime-local"
                    value={formData.scheduled_time}
                    onChange={(e) => setFormData({...formData, scheduled_time: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <select
                    id="duration"
                    value={formData.duration}
                    onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value)})}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value={30}>30 minutes</option>
                    <option value={60}>60 minutes</option>
                    <option value={90}>90 minutes</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="notes">Additional Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Any specific topics or areas you'd like to focus on..."
                    rows={4}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="recording"
                    checked={formData.recording_enabled}
                    onChange={(e) => setFormData({...formData, recording_enabled: e.target.checked})}
                  />
                  <Label htmlFor="recording">Enable session recording</Label>
                </div>

                <div className="flex gap-4">
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? 'Scheduling...' : 'Schedule Interview'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onNavigate('home')}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}