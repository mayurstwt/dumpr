import { useAnonymousAuth } from '@/hooks/useAnonymousAuth';
import { Feed } from '@/components/Feed';
import { AppBackground } from '@/components/AppBackground';
import { Loader2 } from 'lucide-react';
import { useWeekendCountdown } from '@/hooks/useWeekendCountdown';
import { useEffect } from 'react';

const Index = () => {
  const { userId, loading } = useAnonymousAuth();
  const { mode } = useWeekendCountdown();

  // Apply mode class to <html> so CSS variables switch automatically
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('mode-weekday', 'mode-weekend');
    root.classList.add(`mode-${mode}`);
  }, [mode]);

  if (loading) {
    return (
      <AppBackground centered>
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </AppBackground>
    );
  }

  if (!userId) {
    return (
      <AppBackground centered>
        <p className="text-muted-foreground">Failed to authenticate. Refresh to try again.</p>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <Feed userId={userId} />
    </AppBackground>
  );
};

export default Index;
