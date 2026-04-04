import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useAnonymousAuth() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        const { data } = await supabase.auth.signInAnonymously();
        setUserId(data.user?.id ?? null);
      } else {
        setUserId(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { userId, loading };
}
