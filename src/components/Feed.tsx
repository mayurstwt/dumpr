import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PostCard } from './PostCard';
import { PostForm } from './PostForm';
import { Loader2, ArrowUp, Briefcase, Beer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { useWeekendCountdown } from '@/hooks/useWeekendCountdown';
import { ProductHuntBadge } from './ProductHuntBadge';
import { getCurrentPeriodStart } from '@/lib/weekend';

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
  const { mode, nextLabel, timeLeft } = useWeekendCountdown();
  const PAGE_SIZE = 20;

  const { ref, entry } = useIntersectionObserver<HTMLDivElement>({
    threshold: 0.1,
    rootMargin: '200px',
  });

  const fetchData = useCallback(async (pageNum: number, isInitial = false) => {
    if (isInitial) setLoading(true);
    else setLoadingMore(true);

    const start = pageNum * PAGE_SIZE;
    const end = start + PAGE_SIZE - 1;

    const [postsRes, reactionsRes] = await Promise.all([
      supabase
        .from('posts')
        .select('*')
        .gte('created_at', getCurrentPeriodStart().toISOString())
        .order('created_at', { ascending: false })
        .range(start, end),
      supabase.from('reactions').select('*'),
    ]);

    if (postsRes.data) {
      const filtered = postsRes.data.filter(p => !p.content.startsWith('>>['));
      if (isInitial) setPosts(filtered);
      else setPosts(prev => [...prev, ...filtered]);
      setHasMore(postsRes.data.length === PAGE_SIZE);
    }

    if (reactionsRes.data) setReactions(reactionsRes.data);
    setLoading(false);
    setLoadingMore(false);
  }, []);

  useEffect(() => { fetchData(0, true); }, [fetchData]);

  useEffect(() => {
    if (entry?.isIntersecting && hasMore && !loadingMore && !loading) {
      setPage(p => { const next = p + 1; fetchData(next); return next; });
    }
  }, [entry?.isIntersecting, hasMore, loadingMore, loading, fetchData]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 800);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('feed-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        const newPost = payload.new as Post;
        if (!newPost.content.startsWith('>>[')) {
          setPosts(prev => [newPost, ...prev]);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, async () => {
        const { data } = await supabase.from('reactions').select('*');
        if (data) setReactions(data);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleRefresh = useCallback(() => { setPage(0); fetchData(0, true); }, [fetchData]);

  const isWeekend = mode === 'weekend';

  return (
    <div className="relative mx-auto max-w-[1600px] px-3 py-6 md:px-5">

      {/* ── Header ── */}
      <div className="mx-auto mb-8 max-w-2xl text-center space-y-3">
        <div className="flex items-center justify-center gap-3">
          <h1 className={cn(
            'text-4xl md:text-5xl font-bold tracking-tight',
            isWeekend ? 'neon-text text-primary' : 'text-primary',
          )}>
            Dumpr
          </h1>
          {isWeekend
            ? <Beer className="w-8 h-8 text-primary" strokeWidth={1.5} />
            : <Briefcase className="w-8 h-8 text-primary" strokeWidth={1.5} />
          }
        </div>

        {/* Mode Badge */}
        <div className={cn(
          'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border backdrop-blur-sm mode-badge-pulse',
          isWeekend
            ? 'bg-primary/10 border-primary/30 text-primary'
            : 'bg-primary/10 border-primary/30 text-primary',
        )}>
          {isWeekend ? (
            <><Beer className="w-4 h-4" /> Weekend Chaos Mode</>
          ) : (
            <><Briefcase className="w-4 h-4" /> Corporate Dump Mode</>
          )}
        </div>

        <p className="text-muted-foreground text-sm">
          {isWeekend
            ? 'No accounts. No history. No trace.'
            : 'Office politics. Caffeine crashes. Watercooler tea.'}
        </p>

        {/* Countdown to mode switch */}
        {timeLeft && (
          <div className="inline-flex flex-col items-center gap-0.5 rounded-xl border border-border/50 bg-secondary/30 px-4 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {nextLabel} in
            </span>
            <span className="font-mono text-sm font-bold tracking-wider tabular-nums text-foreground">
              {timeLeft}
            </span>
          </div>
        )}
      </div>

      {/* ── Post Form ── */}
      <div className="mx-auto mb-10 max-w-2xl">
        <PostForm
          userId={userId}
          onPosted={() => { handleRefresh(); setReplyTo(null); }}
          replyTo={replyTo || undefined}
          onCancelReply={() => setReplyTo(null)}
        />
      </div>

      {/* ── Pinterest Masonry Grid ── */}
      <div className="w-full">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 space-y-2">
            <p className="text-4xl">{isWeekend ? '🍺' : '💼'}</p>
            <p className="text-muted-foreground text-lg font-medium">
              {isWeekend ? 'No dumps yet. Be the first.' : 'No corporate chaos yet. Dump yours.'}
            </p>
          </div>
        ) : (
          <div
            className="columns-2 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 masonry-grid"
            style={{ columnGap: '12px' }}
          >
            {posts.map((post) => (
              <div key={post.id} className="masonry-item">
                <PostCard
                  post={post}
                  userId={userId}
                  onRefresh={handleRefresh}
                  onReply={(p) => {
                    setReplyTo({ id: p.id, content: p.content });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  relatedPosts={posts.filter(p => p.id !== post.id).slice(0, 12)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Infinite scroll sentinel ── */}
      <div ref={ref} className="h-16 flex justify-center items-center mt-4">
        {loadingMore && <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />}
        {!hasMore && posts.length > 0 && (
          <p className="text-muted-foreground text-sm">
            {isWeekend ? "You've reached the end of the dump. 🍻" : "That's all the corporate chaos for now. ☕"}
          </p>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="mt-16 pb-8 border-t border-border/50 pt-8 max-w-2xl mx-auto">
        <ProductHuntBadge />
      </div>

      {/* ── Scroll to top ── */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-8 right-8 z-50 p-3 rounded-full bg-primary text-primary-foreground shadow-2xl animate-slide-up transition-all hover:scale-110 active:scale-95"
          title="Scroll to top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
