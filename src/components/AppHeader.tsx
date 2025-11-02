import { Home, Video, Calendar, TrendingUp, FileText, BarChart3, Menu } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { useState } from 'react';

interface AppHeaderProps {
  currentPage: string;
  onNavigate: (page: any) => void;
}

export function AppHeader({ currentPage, onNavigate }: AppHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'setup', label: 'AI Mock Interview', icon: Video },
    { id: 'dashboard', label: 'My Dashboard', icon: BarChart3 },
  ];

  const mockUser = {
    name: 'Alex Johnson',
    avatar: null,
    stats: {
      interviewsThisWeek: 3,
      strikeStatus: 'Good Standing'
    }
  };

  return (
    <header className="bg-white border-b sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white">FR</span>
            </div>
            <div className="hidden md:block">
              <h1>First Round AI</h1>
              <p className="text-xs text-slate-500">Candidate Portal</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <Button
                  key={item.id}
                  variant={isActive ? 'default' : 'ghost'}
                  onClick={() => onNavigate(item.id)}
                  className="gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              );
            })}
          </nav>

          {/* User Info */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-4">
              <div className="text-right text-sm">
                <div className="text-slate-600">This week: {mockUser.stats.interviewsThisWeek} interviews</div>
                <Badge variant="outline" className="text-xs">
                  {mockUser.stats.strikeStatus}
                </Badge>
              </div>
              <Avatar>
                <AvatarImage src={mockUser.avatar || undefined} />
                <AvatarFallback>AJ</AvatarFallback>
              </Avatar>
            </div>

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <div className="flex flex-col gap-6 mt-8">
                  <div className="flex items-center gap-3 pb-4 border-b">
                    <Avatar>
                      <AvatarImage src={mockUser.avatar || undefined} />
                      <AvatarFallback>AJ</AvatarFallback>
                    </Avatar>
                    <div>
                      <p>{mockUser.name}</p>
                      <p className="text-sm text-slate-600">{mockUser.stats.interviewsThisWeek} interviews this week</p>
                    </div>
                  </div>
                  <nav className="flex flex-col gap-2">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentPage === item.id;
                      return (
                        <Button
                          key={item.id}
                          variant={isActive ? 'default' : 'ghost'}
                          className="justify-start gap-2"
                          onClick={() => {
                            onNavigate(item.id);
                            setMobileMenuOpen(false);
                          }}
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </Button>
                      );
                    })}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
