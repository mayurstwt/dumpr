import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PostCard } from './PostCard';
import { PostForm } from './PostForm';
import { Loader2, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { useWeekendCountdown } from '@/hooks/useWeekendCountdown';


interface FeedProps {
  userId: string;
}

interface Post {
  id: string;
  content: string;
  media_url: string | null;
  location_tag: string;
  created_at: string;
  user_id: string;
}

interface Reaction {
  id: string;
  post_id: string;
  user_id: string;
}


export function Feed({ userId }: FeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [replyTo, setReplyTo] = useState<{ id: string; content: string } | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const { isWeekend, timeLeft } = useWeekendCountdown();
  const PAGE_SIZE = 12;

  const { ref, entry } = useIntersectionObserver<HTMLDivElement>({
    threshold: 0.1,
    rootMargin: '100px',
  });

  const fetchData = useCallback(async (pageNum: number, isInitial = false) => {
    if (isInitial) setLoading(true);
    else setLoadingMore(true);

    const start = pageNum * PAGE_SIZE;
    const end = start + PAGE_SIZE - 1;

    let query = supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .range(start, end);

    const [postsRes, reactionsRes] = await Promise.all([
      query,
      supabase.from('reactions').select('*'),
    ]);

    if (postsRes.data) {
      const filteredPosts = postsRes.data.filter(p => !p.content.startsWith('>>['));
      if (isInitial) {
        setPosts(filteredPosts);
      } else {
        setPosts((prev) => [...prev, ...filteredPosts]);
      }
      setHasMore(postsRes.data.length === PAGE_SIZE);
    }

    if (reactionsRes.data) setReactions(reactionsRes.data);
    setLoading(false);
    setLoadingMore(false);
  }, []);

  useEffect(() => {
    fetchData(0, true);
  }, [fetchData]);

  useEffect(() => {
    if (entry?.isIntersecting && hasMore && !loadingMore && !loading) {
      setPage((p) => {
        const next = p + 1;
        fetchData(next);
        return next;
      });
    }
  }, [entry?.isIntersecting, hasMore, loadingMore, loading, fetchData]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 1000);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('feed-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        (payload) => {
          setPosts((prev) => [payload.new as Post, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reactions' },
        async () => {
          const { data } = await supabase.from('reactions').select('*');
          if (data) setReactions(data);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRefresh = useCallback(() => {
    setPage(0);
    fetchData(0, true);
  }, [fetchData]);

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-6 md:px-6">
      <div className="mx-auto mb-6 max-w-2xl text-center">
        {isWeekend ? (
          <>
            <h1 className="text-3xl md:text-4xl font-bold neon-text text-primary">
              Dumpr 🍺
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              No accounts. No history. No trace.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              Dumpr 💼
            </h1>
            <div className="mt-2 inline-flex flex-col items-center justify-center space-y-1 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">Weekend Countdown</span>
              <span className="font-mono text-sm tracking-wider tabular-nums text-foreground">{timeLeft}</span>
            </div>
            <p className="text-muted-foreground text-xs mt-3">
              Office politics. Caffeine crashes. Watercooler tea.
            </p>
          </>
        )}
      </div>

      <div className="mx-auto mb-10 max-w-2xl">
        <PostForm
          userId={userId}
          onPosted={() => { handleRefresh(); setReplyTo(null); }}
          replyTo={replyTo || undefined}
          onCancelReply={() => setReplyTo(null)}
        />
      </div>

      <div className="w-full">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              No dumps yet. Be the first. 🎯
            </p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6">
            {posts.map((post) => (
              <div
                key={post.id}
                className="break-inside-avoid"
              >
                <PostCard
                  post={post}
                  userId={userId}
                  onRefresh={handleRefresh}
                  onReply={(p) => { setReplyTo({ id: p.id, content: p.content }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="mb-0"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div ref={ref} className="h-10 flex justify-center items-center mt-8">
        {loadingMore && <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />}
        {!hasMore && posts.length > 0 && (
          <p className="text-muted-foreground text-sm">You've reached the end of the dump. 🍻</p>
        )}
      </div>

      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-8 right-8 z-50 p-3 rounded-full bg-primary text-primary-foreground shadow-2xl animate-in fade-in slide-in-from-bottom-4 transition-all hover:scale-110 active:scale-95"
          title="Scroll to top"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
