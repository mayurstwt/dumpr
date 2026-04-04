import { isWeekendOpen } from '@/lib/weekend';
import { useAnonymousAuth } from '@/hooks/useAnonymousAuth';
import { ClosedGate } from '@/components/ClosedGate';
import { Feed } from '@/components/Feed';
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
      <div className="dive-bar-gradient min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="dive-bar-gradient min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Failed to authenticate. Refresh to try again.</p>
      </div>
    );
  }

  return (
    <div className="dive-bar-gradient min-h-screen">
      <Feed userId={userId} />
    </div>
  );
};

export default Index;
