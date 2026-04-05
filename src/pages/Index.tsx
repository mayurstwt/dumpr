import { isWeekendOpen } from '@/lib/weekend';
import { useAnonymousAuth } from '@/hooks/useAnonymousAuth';
import { ClosedGate } from '@/components/ClosedGate';
import { Feed } from '@/components/Feed';
import { AppBackground } from '@/components/AppBackground';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { userId, loading } = useAnonymousAuth();

  // Uncomment the line below to enforce weekend-only access:
  // if (!isWeekendOpen()) return <ClosedGate />;

  // For development, we keep it open. Toggle the above when going live.
  const open = isWeekendOpen();

  if (!open) return <ClosedGate />;

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
