import * as React from 'react';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PostCard } from './PostCard';
import { PostForm } from './PostForm';
import { Loader2, ArrowUp, Briefcase, Beer, Plus, History, Twitter, Github, Globe, Info, Skull } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TopWeeklyRecap } from './TopWeeklyRecap';
import { useWeekendCountdown } from '@/hooks/useWeekendCountdown';
import { ProductHuntBadge } from './ProductHuntBadge';
import { getCurrentPeriodStart, getPreviousPeriodRange } from '@/lib/weekend';
import { SkeletonFeed } from './SkeletonCard';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { fetchPostsList, type AppPost } from '@/lib/posts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface FeedProps {
  userId: string;
}

type Post = AppPost;

interface Reaction {
  id: string;
  post_id: string;
  user_id: string;
  reaction_type?: string | null;
}

export function Feed({ userId }: FeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<'new' | 'hot' | 'unanswered'>('new');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [replyTo, setReplyTo] = useState<{ id: string; content: string } | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isArchiveView, setIsArchiveView] = useState(false);
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [globalSafeSearch, setGlobalSafeSearch] = useState(true);
  const [streak, setStreak] = useState(0);
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
      fetchPostsList({
        enhanced: (columns) => {
          let query = supabase
            .from('posts')
            .select(columns)
            .order('created_at', { ascending: false })
            .range(start, end);

          if (isArchiveView) {
            const { start: rangeStart, end: rangeEnd } = getPreviousPeriodRange();
            query = query
              .gte('created_at', rangeStart.toISOString())
              .lte('created_at', rangeEnd.toISOString());
          } else {
            query = query.gte('created_at', getCurrentPeriodStart().toISOString());
          }

          return query;
        },
        legacy: (columns) => {
          let query = supabase
            .from('posts')
            .select(columns)
            .order('created_at', { ascending: false })
            .range(start, end);

          if (isArchiveView) {
            const { start: rangeStart, end: rangeEnd } = getPreviousPeriodRange();
            query = query
              .gte('created_at', rangeStart.toISOString())
              .lte('created_at', rangeEnd.toISOString());
          } else {
            query = query.gte('created_at', getCurrentPeriodStart().toISOString());
          }

          return query;
        },
      }),
      supabase.from('reactions').select('*'),
    ]);

    if (postsRes.data) {
      const filtered = postsRes.data.filter((p) => !p.content.startsWith('>>['));
      if (isInitial) setPosts(filtered);
      else setPosts(prev => [...prev, ...filtered]);
      setHasMore(postsRes.data.length === PAGE_SIZE);
    }

    if (reactionsRes.data) setReactions(reactionsRes.data);
    setLoading(false);
    setLoadingMore(false);
  }, [isArchiveView]);

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
    if (isArchiveView) return;

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
  }, [isArchiveView]);

  const handleRefresh = useCallback(() => { setPage(0); fetchData(0, true); }, [fetchData]);

  const incrementStreak = useCallback(() => {
    const newStreak = streak + 1;
    setStreak(newStreak);
    localStorage.setItem('dump_streak', newStreak.toString());
    localStorage.setItem('last_dump_date', new Date().toISOString());
  }, [streak]);

  const filteredPosts = React.useMemo(() => {
    let result = [...posts];
    const now = new Date().getTime();
    result = result.filter(p => isArchiveView || !p.expires_at || new Date(p.expires_at).getTime() > now);

    if (filterTag) {
      result = result.filter(p => p.content.includes(`#${filterTag}`));
    }

    if (channelFilter) {
      result = result.filter(p => p.channel === channelFilter.toLowerCase());
    }

    if (sortMode === 'hot') {
      result.sort((a, b) => {
        const getScore = (postObj: Post) => {
          const rs = reactions.filter(r => r.post_id === postObj.id).length;
          const ageHours = (now - new Date(postObj.created_at).getTime()) / (1000 * 60 * 60);
          return (rs * 3) / Math.pow(ageHours + 2, 1.5);
        };
        return getScore(b) - getScore(a);
      });
    } else if (sortMode === 'unanswered') {
      result = result.filter(p => !posts.some(r => r.parent_id === p.id));
    }

    return result;
  }, [posts, filterTag, channelFilter, sortMode, reactions]);

  const isWeekend = mode === 'weekend';

  const ritualInfo = useMemo(() => {
    const day = new Date().getDay();
    const rituals: Record<number, { name: string, emoji: string, description: string }> = {
      1: { name: "Monday Meltdown", emoji: "🧨", description: "The week just started and something already broke. Spill it." },
      2: { name: "Tuesday Turnover", emoji: "🔄", description: "Pivots, updates, and mid-week shifts. What's changing?" },
      3: { name: "Wednesday Watercooler", emoji: "☕", description: "Hump day gossip. What's the office whispering about?" },
      4: { name: "Thursday Thirst", emoji: "🍺", description: "Almost there. What are you craving or dreading?" },
      5: { name: "Friday Confession", emoji: "🙏", description: "The ritual of legends. Drop your biggest week-end dump." },
      6: { name: "Saturday Spill", emoji: "🌊", description: "Weekend vibes only. No work talk allowed." },
      0: { name: "Sunday Damage Report", emoji: "📉", description: "How much did you spend? How much did it hurt?" }
    };
    return rituals[day] || { name: "Daily Dump", emoji: "✨", description: "Keep the chaos flowing." };
  }, []);

  return (
    <div className="relative mx-auto max-w-[1600px] px-2 py-8 md:px-8 md:py-12">

      {/* ── Hero Section ── */}
      <div className="mx-auto mb-16 max-w-4xl text-center space-y-8 animate-in fade-in slide-in-from-top-4 duration-1000">
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-4 mb-2">
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-primary/60 border border-primary/20 px-3 py-1 rounded-full bg-primary/5">
              {isWeekend ? '🌙 Weekend Mode' : '💼 Corporate Mode'}
            </span>
            <div className="h-[1px] w-8 bg-border/40" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/40">
              {posts.length} Dumps
            </span>
          </div>

          <h1
            onClick={() => { setIsArchiveView(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={cn(
              'text-4xl sm:text-7xl md:text-9xl font-black tracking-tighter cursor-pointer hover:scale-[1.02] transition-all active:scale-95 leading-[0.85]',
              isWeekend ? 'neon-text text-primary' : 'text-primary'
            )}
          >
            {ritualInfo.name.split(' ')[0]}<br />
            <span className="italic opacity-90">{ritualInfo.name.split(' ').slice(1).join(' ')}</span>
          </h1>
        </div>

        <p className="text-muted-foreground text-lg md:text-xl font-bold max-w-xl mx-auto leading-tight opacity-70 tracking-tight">
          {ritualInfo.description}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">


          <button
            onClick={() => setIsArchiveView(!isArchiveView)}
            className={cn(
              'w-full sm:w-auto px-8 py-4 sm:py-5 rounded-2xl sm:rounded-[2rem] text-sm font-black uppercase tracking-widest border transition-all hover:scale-105 active:scale-95',
              isArchiveView
                ? 'bg-foreground text-background border-foreground shadow-2xl'
                : 'bg-card border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary'
            )}
          >
            <span className="flex items-center justify-center gap-3">
              <History className="w-4 h-4" />
              {isArchiveView ? 'Return to Live' : 'See Last Dump'}
            </span>
          </button>
        </div>

        {/* Discovery Bar */}
        <div className="pt-8 border-t border-border/20">
          <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            <div className="flex p-1 bg-secondary/30 rounded-2xl border border-border/30 shadow-inner">
              {['new', 'hot', 'unanswered'].map((m) => (
                <button
                  key={m}
                  onClick={() => setSortMode(m as any)}
                  className={cn(
                    "px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    sortMode === m
                      ? "bg-background text-primary shadow-xl scale-105"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>

            <button
              onClick={() => setGlobalSafeSearch(!globalSafeSearch)}
              className={cn(
                "p-3.5 rounded-2xl border transition-all shadow-xl active:scale-95 group relative",
                globalSafeSearch
                  ? "bg-secondary/30 border-border/40 text-muted-foreground hover:text-primary hover:border-primary/40"
                  : "bg-red-500/10 border-red-500/40 text-red-500 shadow-red-500/10"
              )}
              title={globalSafeSearch ? "Show NSFW Content" : "Hide NSFW Content"}
            >
              <Skull className={cn("w-5 h-5", !globalSafeSearch && "animate-pulse")} />
              {!globalSafeSearch && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />}
            </button>
          </div>
        </div>

        {/* Dynamic Countdown Pin */}
        {!isArchiveView && timeLeft && (
          <div className="absolute top-12 right-12 hidden 2xl:flex flex-col items-end gap-1 opacity-40 hover:opacity-100 transition-opacity text-right">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">{nextLabel}</span>
            <span className="text-2xl font-black font-mono tracking-tighter">{timeLeft}</span>
          </div>
        )}
      </div>

      <TopWeeklyRecap />

      {/* ── Pinterest Masonry Grid ── */}
      <div className="w-full">
        {loading ? (
          <SkeletonFeed />
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-32 space-y-8 animate-in fade-in zoom-in duration-700 max-w-lg mx-auto">
            <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
              <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl animate-pulse" />
              <div className="relative w-24 h-24 rounded-3xl bg-card border border-primary/20 flex items-center justify-center text-5xl shadow-2xl rotate-3">
                {isWeekend ? '🍺' : '💼'}
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-foreground font-black text-4xl tracking-tighter">
                {isArchiveView ? 'Silence in the Archive' : isWeekend ? 'The Weekend is Fresh.' : 'Corporate Silence'}
              </h3>
              <p className="text-muted-foreground text-lg leading-snug font-medium opacity-60">
                {isArchiveView
                  ? 'No digital ghosts found from the previous period. History starts with your next move.'
                  : isWeekend
                    ? 'No chaos logged yet. Be the legend who starts the dump. 🔥'
                    : 'Silicon Valley is quiet. Drop the first corporate confession and break the seal. 🕯️'}
              </p>
            </div>
            {!isArchiveView && (
              <Button
                onClick={() => setIsPostDialogOpen(true)}
                className="group rounded-[1.5rem] px-12 py-8 font-black text-xl shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95"
              >
                Start the Dump
              </Button>
            )}
          </div>
        ) : (
          <div
            className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 masonry-grid animate-in fade-in slide-in-from-bottom-4 duration-700"
            style={{ columnGap: '16px' }}
          >
            {filteredPosts.map((post) => (
              <div key={post.id} className="masonry-item mb-6">
                <PostCard
                  post={post}
                  userId={userId}
                  reactions={reactions}
                  onRefresh={handleRefresh}
                  onHashtagClick={(tag) => setFilterTag(tag)}
                  onReply={(p) => {
                    setReplyTo({ id: p.id, content: p.content });
                    setIsPostDialogOpen(true);
                  }}
                  relatedPosts={posts.filter(p => p.id !== post.id).slice(0, 12)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Infinite scroll sentinel ── */}
      <div ref={ref} className="h-24 flex flex-col justify-center items-center mt-8 gap-2">
        {loadingMore && <Loader2 className="w-8 h-8 animate-spin text-primary/50" />}
        {!hasMore && posts.length > 0 && (
          <div className="flex flex-col items-center gap-2 opacity-50">
            <div className="w-12 h-1 px-1 bg-border rounded-full" />
            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
              End of the line
            </p>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <footer className="mt-20 border-t border-border/40 pt-20 pb-20 bg-card/30">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-16">
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-primary font-black tracking-tighter text-3xl">
              DUMPR <Globe className="w-5 h-5 animate-spin-slow" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed font-bold">
              The digital watercooler for corporate chaos and weekend legends.
              No accounts. No cookies. No tracking. Just raw, unfiltered human experiences.
            </p>
          </div>

          <div className="space-y-6">
            <h4 className="text-xs font-black uppercase tracking-[0.3em] text-foreground/80 flex items-center gap-2">
              Connect
            </h4>
            <div className="flex flex-col gap-4">
              <a href="https://x.com/mayurstwt" target="_blank" rel="noreferrer" className="flex items-center gap-3 text-sm text-muted-foreground hover:text-primary transition-colors font-black group">
                <Twitter className="w-5 h-5 transition-transform group-hover:rotate-12" /> SHARE ON X
              </a>
              <a href="https://github.com" target="_blank" rel="noreferrer" className="flex items-center gap-3 text-sm text-muted-foreground hover:text-primary transition-colors font-black group">
                <Github className="w-5 h-5 transition-transform group-hover:rotate-12" /> SOURCE CODE
              </a>
            </div>
          </div>

          <div className="space-y-6 md:items-end flex flex-col">
            <h4 className="text-xs font-black uppercase tracking-[0.3em] text-foreground/80">
              Launch Day
            </h4>
            <div className="scale-110 origin-right">
              <ProductHuntBadge />
            </div>
          </div>
        </div>
      </footer>

      {/* Scroll to top */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-24 right-6 z-50 p-3.5 rounded-full bg-background border border-border text-foreground shadow-2xl animate-in fade-in slide-in-from-bottom-4 transition-all hover:scale-110 active:scale-95 group"
          title="Scroll to top"
        >
          <ArrowUp className="w-5 h-5 transition-transform group-hover:-translate-y-1" />
        </button>
      )}

      {/* Floating Post Button */}
      {!isArchiveView && (
        <Dialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
          <DialogTrigger asChild>
            <button
              className={cn(
                "fixed bottom-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all hover:scale-105 active:scale-95 group animate-in slide-in-from-bottom-10 duration-500",
                "bg-primary text-primary-foreground"
              )}
            >
              <Plus className="w-6 h-6 transition-transform group-hover:rotate-90" />
              <span className="font-extrabold text-sm tracking-tight whitespace-nowrap">Dump Chaos</span>
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[600px] p-4 sm:p-0 border-none bg-transparent shadow-none mx-auto">
            <DialogHeader className="sr-only">
              <DialogTitle>New Dump</DialogTitle>
              <DialogDescription>Share your corporate chaos or weekend vibes anonymously.</DialogDescription>
            </DialogHeader>
            <PostForm
              userId={userId}
              onPosted={() => {
                handleRefresh();
                setReplyTo(null);
                setIsPostDialogOpen(false);
                incrementStreak();
              }}
              replyTo={replyTo || undefined}
              onCancelReply={() => setReplyTo(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
