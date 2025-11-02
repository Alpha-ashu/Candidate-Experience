import { useEffect, useState } from 'react';
import { CandidateHome } from './components/CandidateHome';
import { SessionSetup } from './components/SessionSetup';
import { PreCheck } from './components/PreCheck';
import { InterviewRoom } from './components/InterviewRoom';
import { SessionSummary } from './components/SessionSummary';
import { MyDashboard } from './components/MyDashboard';
import { UserFlows } from './components/UserFlows';
import { APIContracts } from './components/APIContracts';
import { ComponentLibrary } from './components/ComponentLibrary';
import { Policies } from './components/Policies';
import { AppHeader } from './components/AppHeader';
import { CircleHelp } from 'lucide-react';
import { Button } from './components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './components/ui/sheet';
import { Toaster } from './components/ui/sonner';
import { login, createSession, issueAcet, refreshTokens, issueAipt, getState } from './api/client';

type Page = 
  | 'home' 
  | 'setup' 
  | 'precheck' 
  | 'interview' 
  | 'summary' 
  | 'dashboard'
  | 'flows'
  | 'api'
  | 'components'
  | 'policies';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [sessionData, setSessionData] = useState<any>(null);

  // Tiny hash router so URLs like #/setup work and refresh keeps context
  useEffect(() => {
    const parse = () => {
      const h = window.location.hash.replace(/^#\/?/, '');
      const valid: Page[] = ['home','setup','precheck','interview','summary','dashboard','flows','api','components','policies'];
      if (valid.includes(h as Page)) {
        setCurrentPage(h as Page);
      }
    };
    parse();
    const onHash = () => parse();
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Auto-login for demo/dev. In production, replace with real auth flow.
  useEffect(() => {
    (async () => {
      try {
        const { token } = await login('alex@example.com');
        const next = (prev: any) => ({ ...(prev || {}), userJwt: token });
        setSessionData(next as any);
        // Rehydrate from localStorage if a session exists
        const raw = localStorage.getItem('cxSession');
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved?.sessionId) {
            const state = await getState(saved.sessionId, token);
            let merged = { ...saved, userJwt: token };
            if (state.state === 'Active') {
              const r = await refreshTokens(saved.sessionId);
              if (r.ist) merged.ist = r.ist;
              if (r.wst) merged.wst = r.wst;
              try {
                const a = await issueAipt(saved.sessionId);
                merged.aipt = a.aipt;
              } catch {}
              setSessionData(merged);
              setCurrentPage('interview');
              return;
            } else if (state.state === 'Ready' || state.state === 'PendingPrecheck' || state.state === 'Paused') {
              // Ensure ACET exists
              try {
                const a = await issueAcet(saved.sessionId);
                merged.acet = a.acet;
              } catch {}
              setSessionData(merged);
              setCurrentPage('precheck');
              return;
            } else if (state.state === 'Completed' || state.state === 'Ended') {
              setSessionData(merged);
              setCurrentPage('summary');
              return;
            }
          }
        }
      } catch (e) {
        console.error('Login failed', e);
      }
    })();
  }, []);

  const handleNavigate = async (page: Page, data?: any) => {
    // Intercept transition to precheck to create a backend session and ACET
    if (page === 'precheck' && data) {
      try {
        const userJwt = (sessionData && sessionData.userJwt) || null;
        if (!userJwt) {
          console.warn('User not logged in yet');
          return;
        }
        const payload = {
          roleCategory: data.roleCategory,
          roleSubType: undefined,
          experienceYears: 5,
          experienceMonths: 0,
          modes: data.interviewModes || data.modes || ['behavioral'],
          questionCount: Number(data.questionCount || 10),
          durationLimit: Number(data.duration || 45),
          language: 'en-us',
          accentPreference: undefined,
          difficulty: (data.difficulty || 'adaptive') as any,
          jobDescription: data.jobDescription || undefined,
          resumeFileRef: undefined,
          companyTargets: data.companies || [],
          includeCuratedQuestions: true,
          allowAIGenerated: true,
          enableMCQ: !!data.mcqEnabled,
          enableFIB: undefined,
          consentRecording: !!data.consentRecording,
          consentAntiCheat: !!data.consentAntiCheat,
          consentTimestamp: new Date().toISOString(),
        };
        const created = await createSession(userJwt, payload);
        const acet = await issueAcet(created.sessionId);
        const merged = {
          ...(data || {}),
          sessionId: created.sessionId,
          ist: created.ist,
          acet: acet.acet,
          userJwt,
        };
        setSessionData(merged);
        localStorage.setItem('cxSession', JSON.stringify(merged));
      } catch (e) {
        console.error('Failed to create session', e);
        return;
      }
    } else if (data) {
      setSessionData(data);
      localStorage.setItem('cxSession', JSON.stringify({ ...(sessionData || {}), ...(data || {}) }));
    }
    setCurrentPage(page);
    try { window.location.hash = `/${page}`; } catch {}
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster richColors />
      <AppHeader currentPage={currentPage} onNavigate={handleNavigate} />
      
      {/* Help Sheet */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
          >
            <CircleHelp className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Help & Resources</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div>
              <h3 className="mb-2">Documentation</h3>
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handleNavigate('flows')}
                >
                  User Flows
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handleNavigate('components')}
                >
                  Component Library
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handleNavigate('api')}
                >
                  API Contracts
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handleNavigate('policies')}
                >
                  Anti-Cheat Policies
                </Button>
              </div>
            </div>
            <div className="pt-4 border-t">
              <h3 className="mb-2">Need Help?</h3>
              <p className="text-sm text-slate-600 mb-4">
                Contact support or check our FAQ for common questions.
              </p>
              <Button variant="outline" className="w-full">
                Report an Issue
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Page Content */}
      <main>
        {currentPage === 'home' && (
          <CandidateHome onNavigate={handleNavigate} />
        )}
        {currentPage === 'setup' && (
          <SessionSetup onNavigate={handleNavigate} />
        )}
        {currentPage === 'precheck' && (
          <PreCheck onNavigate={handleNavigate} sessionData={sessionData} />
        )}
        {currentPage === 'interview' && (
          <InterviewRoom onNavigate={handleNavigate} sessionData={sessionData} />
        )}
        {currentPage === 'summary' && (
          <SessionSummary onNavigate={handleNavigate} sessionData={sessionData} />
        )}
        {currentPage === 'dashboard' && (
          <MyDashboard onNavigate={handleNavigate} />
        )}
        {currentPage === 'flows' && (
          <UserFlows onNavigate={handleNavigate} />
        )}
        {currentPage === 'api' && (
          <APIContracts onNavigate={handleNavigate} />
        )}
        {currentPage === 'components' && (
          <ComponentLibrary onNavigate={handleNavigate} />
        )}
        {currentPage === 'policies' && (
          <Policies onNavigate={handleNavigate} />
        )}
      </main>
    </div>
  );
}
