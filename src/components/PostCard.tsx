import { useState, useMemo, useEffect } from 'react';
import { Share2, MessageSquare, Sparkles, Plus, Twitter, Zap, Flame, Skull, MoreHorizontal, Flag } from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import { PostDetailModal } from './PostDetailModal';
import { getWeeklyPersona } from '@/lib/personas';

interface Post {
  id: string;
  content: string;
  media_url: string | null;
  location_tag: string;
  created_at: string;
  user_id: string;
  parent_id?: string | null;
  expires_at?: string | null;
  channel?: string | null;
  metadata?: any;
}

interface PostCardProps {
  post: Post;
  userId: string;
  onRefresh: () => void;
  onHashtagClick?: (hashtag: string) => void;
  onReply?: (post: Post) => void;
  className?: string;
  relatedPosts?: Post[];
  reactions?: { post_id: string; user_id: string; reaction_type?: string | null }[];
}

const renderContent = (content: string) => {
  const displayContent = content.startsWith('>>[')
    ? content.replace(/^>>\[.*?\]\s*/, '')
    : content;

  const escaped = displayContent
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  return escaped
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>')
    .replace(/#(\w+)/g, '<span class="text-primary hover:underline cursor-pointer font-bold hashtag" data-hashtag="$1">#$1</span>')
    .replace(/@(\w+)/g, '<span class="text-primary font-bold">@$1</span>');
};

const getReactionEmoji = (reactionType?: string | null) => {
  if (!reactionType || reactionType === 'fire') return '🔥';
  if (reactionType === 'real') return '💀';
  if (reactionType === 'unhinged') return '🤯';
  return reactionType;
};

export function PostCard({
  post,
  userId,
  onRefresh,
  onHashtagClick,
  onReply,
  className,
  relatedPosts = [],
  reactions = [],
}: PostCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post>(post);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { resolvedTheme } = useTheme();
  const emojiTheme = resolvedTheme === 'light' ? Theme.LIGHT : Theme.DARK;

  const persona = useMemo(() => {
    return getWeeklyPersona(post.user_id, post.metadata?.persona_type || 'weekly');
  }, [post.user_id, post.metadata?.persona_type]);
  
  const reactionCount = reactions.filter(r => r.post_id === post.id).length;
  const userReaction = useMemo(() => {
    return reactions.find(r => r.post_id === post.id && r.user_id === userId);
  }, [reactions, post.id, userId]);

  const mediaUrls: string[] = post.media_url?.startsWith('[')
    ? JSON.parse(post.media_url)
    : post.media_url ? [post.media_url] : [];

  const metadata = post.metadata || {};
  const [blurNsfw, setBlurNsfw] = useState(!!metadata.is_nsfw);
  const [voted, setVoted] = useState(false);

  const firstMedia = mediaUrls[0] ?? null;
  const isVideo = firstMedia?.match(/\.(mp4|webm|mov)/i);
  const isReply = !!post.parent_id || post.content.startsWith('>>[');

  const displayContent = post.content.startsWith('>>[')
    ? post.content.replace(/^>>\[.*?\]\s*/, '')
    : post.content;

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Dumpr', text: displayContent, url }); return; } catch {}
    }
    navigator.clipboard.writeText(url);
    toast.success('Link copied!');
  };

  const handleXShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `"${displayContent.slice(0, 200)}${displayContent.length > 200 ? '...' : ''}"\n\nSpilled on ${persona.handle} via Dumpr 💼🍺`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.origin + '/post/' + post.id)}`;
    window.open(url, '_blank');
  };

  const openModal = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, a, .hashtag')) return;
    setIsModalOpen(true);
  };

  const addReaction = async (type: string = 'fire', emoji?: string) => {
    try {
      const reactionPayload = {
        post_id: post.id,
        user_id: userId,
        reaction_type: type
      };

      let { error } = await supabase.from('reactions').insert(reactionPayload);

      if (error?.code === 'PGRST204' && error.message.includes('reaction_type')) {
        ({ error } = await supabase.from('reactions').insert({
          post_id: post.id,
          user_id: userId,
        }));
      }

      if (error) throw error;
      toast.success(emoji ? `${emoji} reaction added!` : 'Reaction added!');
      onRefresh();
    } catch (err) {
      console.error('Reaction error details:', err);
      toast.error('Unable to react. Check if you are connected.');
    }
  };

  const [reported, setReported] = useState(false);

  const handleReport = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (reported) return;
    
    setReported(true);
    toast.success('Report submitted. This post will be audited. 🦾');
  };

  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    if (!post.expires_at) return;
    
    const update = () => {
      const expiry = new Date(post.expires_at!).getTime();
      const now = new Date().getTime();
      const diff = expiry - now;
      if (diff <= 0) { setTimeLeft('EXPIRED'); return; }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(`${hours}h ${minutes}m`);
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [post.expires_at]);

  if (reported) return null;

  return (
    <>
      <article
        className={cn(
          'group relative rounded-[2rem] overflow-hidden cursor-pointer bg-card border border-border/40 shadow-sm',
          'transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]',
          'hover:shadow-[0_80px_160px_rgba(0,0,0,0.3)] hover:-translate-y-3 hover:border-primary/50 hover:scale-[1.01]',
          'break-inside-avoid mb-8 pb-2',
          className,
        )}
        onClick={openModal}
      >
        {/* ── Media ── */}
        {firstMedia && (
          <div className="relative w-full overflow-hidden aspect-auto border-b border-border/40">
            {isVideo ? (
              <video src={firstMedia} className={cn("w-full h-full object-cover transition-all", blurNsfw && "blur-3xl brightness-50")} muted playsInline preload="metadata" />
            ) : (
              <img src={firstMedia} alt="" className={cn("w-full h-full object-cover transition-all duration-700 group-hover:scale-105", blurNsfw && "blur-3xl brightness-50")} loading="lazy" />
            )}

            {blurNsfw && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 p-6 text-center bg-black/40 backdrop-blur-sm">
                <Skull className="w-12 h-12 text-white/90 animate-pulse" />
                <p className="text-white text-sm font-black uppercase tracking-[0.2em] shadow-sm">NSFW Content</p>
                <button
                  onClick={(e) => { e.stopPropagation(); setBlurNsfw(false); }}
                  className="px-6 py-2.5 rounded-2xl bg-white text-black text-xs font-black uppercase tracking-widest hover:scale-110 transition-all shadow-2xl"
                >
                  View Post
                </button>
              </div>
            )}
            
            {mediaUrls.length > 1 && (
              <div className="absolute top-6 left-6 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md text-white text-[11px] font-black border border-white/20">
                <Plus className="w-4 h-4" /> {mediaUrls.length - 1} MORE
              </div>
            )}

            {timeLeft && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-1.5 rounded-full bg-destructive text-white text-[11px] font-black uppercase tracking-widest animate-pulse shadow-xl shadow-destructive/20 border border-white/20">
                <Flame className="w-4 h-4" /> {timeLeft}
              </div>
            )}

            <button
              onClick={handleXShare}
              className={cn(
                'absolute top-6 right-6 z-30',
                'flex items-center gap-2 px-5 py-3 rounded-2xl',
                'bg-foreground text-background font-black text-xs uppercase tracking-[0.1em]',
                'shadow-2xl opacity-0 translate-y-4 scale-90 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 transition-all duration-300 ease-out',
                'hover:brightness-110 active:scale-95',
              )}
            >
              <Twitter className="w-4 h-4 fill-current" />
              X SHARE
            </button>
          </div>
        )}

        {/* ── Text Content ── */}
        <div className="p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center font-black text-primary text-sm shadow-inner uppercase">
                {persona.name.charAt(0)}
              </div>
              <div className="flex flex-col">
                <span className="text-sm md:text-base font-black uppercase tracking-widest text-primary/90 leading-none">
                  {persona.name}
                </span>
                <span className="text-xs text-muted-foreground font-bold opacity-60">
                  {persona.handle} • {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isReply && (
                <span className="px-3 py-1 rounded-lg bg-secondary/80 text-[10px] text-muted-foreground font-black uppercase tracking-widest border border-border/40">
                  Thread
                </span>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                  <button className="p-2 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-all">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-2xl p-2 min-w-[160px]">
                  <DropdownMenuItem onClick={handleReport} className="rounded-xl text-destructive font-bold gap-2 focus:bg-destructive/10 cursor-pointer">
                    <Flag className="w-4 h-4" /> Report Post
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <p
            className="text-lg md:text-2xl leading-[1.4] text-foreground/95 whitespace-pre-wrap break-words line-clamp-10 font-black tracking-tight"
            dangerouslySetInnerHTML={{ __html: renderContent(displayContent) }}
            onClick={(e) => {
              const t = e.target as HTMLElement;
              if (t.classList.contains('hashtag')) {
                e.stopPropagation();
                const tag = t.getAttribute('data-hashtag');
                if (tag && onHashtagClick) onHashtagClick(tag);
              }
            }}
          />

          {/* Poll Display */}
          {metadata.poll && (
            <div className="p-6 rounded-[1.5rem] bg-secondary/20 border border-border/40 space-y-3" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                  📊 Anonymous Poll
                </h4>
                {voted && <span className="text-[10px] font-black text-muted-foreground uppercase">Locked</span>}
              </div>
              <div className="space-y-3">
                {metadata.poll.options.map((opt: any, i: number) => {
                  const percent = voted ? (20 + (i * 15)) : 0;
                  return (
                    <button
                      key={i}
                      disabled={voted}
                      onClick={() => { setVoted(true); toast.success("Vote recorded anonymously! 🗳️"); }}
                      className="relative w-full h-12 rounded-2xl bg-card border border-border/60 overflow-hidden group/poll transition-all hover:border-primary/50"
                    >
                      <div 
                        className={cn("absolute inset-0 bg-primary/20 transition-all duration-1000 ease-out", voted ? "opacity-100" : "opacity-0")} 
                        style={{ width: `${percent}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-between px-5">
                        <span className="text-sm font-black tracking-tight">{opt.text}</span>
                        {voted && <span className="text-xs font-black font-mono">{percent}%</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
              {!voted && <p className="text-[10px] text-muted-foreground font-black text-center pt-2 uppercase tracking-widest opacity-50">Choose wisely. Votes are permanent.</p>}
            </div>
          )}

          {/* Social Row */}
          <div className="flex items-center justify-between pt-4 border-t border-border/30">
            <div className="flex items-center gap-2">
              <Popover onOpenChange={(open) => !open && setShowEmojiPicker(false)}>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "flex items-center gap-2 px-5 py-2.5 rounded-full transition-all group/react shadow-sm border",
                      userReaction ? "bg-primary/20 border-primary/40 text-primary" : "bg-secondary/60 border-transparent hover:bg-primary/20 hover:text-primary"
                    )}
                    onClick={e => e.stopPropagation()}
                  >
                    {userReaction ? (
                      <span className="text-base animate-in zoom-in duration-300">{getReactionEmoji(userReaction.reaction_type)}</span>
                    ) : (
                      <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                    )}
                    <span className="text-xs font-black uppercase tracking-wider">{reactionCount || 'React'}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3 rounded-[2rem] flex flex-col gap-3 bg-card/95 backdrop-blur-xl border border-border/50 shadow-2xl" onClick={e => e.stopPropagation()}>
                  {!showEmojiPicker ? (
                    <div className="flex gap-2 items-center">
                      <button onClick={() => addReaction('fire', '🔥')} className="hover:scale-125 transition-transform p-2"><Flame className="w-6 h-6 text-orange-500" /></button>
                      <button onClick={() => addReaction('real', '💀')} className="hover:scale-125 transition-transform p-2"><Skull className="w-6 h-6 text-zinc-500" /></button>
                      <button onClick={() => addReaction('unhinged', '🤯')} className="hover:scale-125 transition-transform p-2"><Zap className="w-6 h-6 text-yellow-500" /></button>
                      <button onClick={() => setShowEmojiPicker(true)} className="hover:scale-125 transition-transform p-2 text-muted-foreground"><Plus className="w-5 h-5" /></button>
                    </div>
                  ) : (
                    <div className="min-w-[300px]" onClick={e => e.stopPropagation()}>
                      <EmojiPicker onEmojiClick={e => { addReaction('custom', e.emoji); setShowEmojiPicker(false); }} theme={emojiTheme} />
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); onReply?.(post); }}
                className="p-3 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all active:scale-90"
                title="Reply"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
              <button
                onClick={handleShare}
                className="p-3 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all active:scale-90"
                title="Share"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </article>

      {/* ── Post Detail Modal ── */}
      {isModalOpen && (
        <PostDetailModal
          post={post}
          userId={userId}
          onClose={() => setIsModalOpen(false)}
          onRefresh={onRefresh}
          onReply={onReply}
          relatedPosts={relatedPosts.filter(p => p.id !== post.id)}
          onSelectRelated={(p) => setSelectedPost(p)}
        />
      )}
    </>
  );
}
