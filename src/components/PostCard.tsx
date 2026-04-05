import { Heart, MapPin, Share, Trash2, ShieldAlert, ChevronLeft, ChevronRight, Sparkles, MessageSquare, Bookmark, QrCode } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { toast } from 'sonner';

interface PostCardProps {
  post: {
    id: string;
    content: string;
    media_url: string | null;
    location_tag: string;
    created_at: string;
    user_id: string;
  };
  userId: string;
  likeCount: number;
  isLiked: boolean;
  onLikeToggle: () => void;
  onHashtagClick?: (hashtag: string) => void;
  onReply?: (post: any) => void;
  className?: string;
  mediaClassName?: string;
}

export function PostCard({
  post,
  userId,
  likeCount,
  isLiked,
  onLikeToggle,
  onHashtagClick,
  onReply,
  className,
  mediaClassName,
}: PostCardProps) {
  const [animating, setAnimating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // const [isBookmarked, setIsBookmarked] = useState(() => {
  //   const saved = localStorage.getItem('weekend_bookmarks');
  //   return saved ? JSON.parse(saved).includes(post.id) : false;
  // });

  // const toggleBookmark = () => {
  //   const saved = localStorage.getItem('weekend_bookmarks');
  //   let bookmarks = saved ? JSON.parse(saved) : [];
  //   if (isBookmarked) {
  //     bookmarks = bookmarks.filter((id: string) => id !== post.id);
  //     toast.success('Removed from bookmarks');
  //   } else {
  //     bookmarks.push(post.id);
  //     toast.success('Saved to bookmarks');
  //   }
  //   localStorage.setItem('weekend_bookmarks', JSON.stringify(bookmarks));
  //   setIsBookmarked(!isBookmarked);
  // };

  const mediaUrls = post.media_url?.startsWith('[')
    ? JSON.parse(post.media_url) as string[]
    : post.media_url ? [post.media_url] : [];

  const isOwner = post.user_id === userId;

  const toggleLike = async () => {
    setAnimating(true);
    setTimeout(() => setAnimating(false), 300);

    if (isLiked) {
      await supabase.from('reactions').delete().eq('post_id', post.id).eq('user_id', userId);
    } else {
      await supabase.from('reactions').insert({ post_id: post.id, user_id: userId });
    }
    onLikeToggle();
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this dump?')) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('posts').delete().eq('id', post.id).eq('user_id', userId);
      if (error) throw error;
      toast.success('Dump deleted');
      onLikeToggle(); // Refresh feed
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Weekend Dump',
          text: post.content,
          url: url,
        });
      } catch (err) {
        // Fallback to copy
        copyToClipboard(url);
      }
    } else {
      copyToClipboard(url);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Link copied to clipboard');
  };

  const handleReport = () => {
    toast.success('Post reported. Thank you for keeping out streets clean! 🦾');
  };

  const VIBE_STYLES: Record<string, string> = {
    glass: 'bg-card/85 border-border/80 backdrop-blur-sm',
    neon: 'bg-zinc-950/90 border-primary/50 shadow-[0_0_20px_rgba(245,158,11,0.1)] neon-border',
    sunset: 'bg-gradient-to-br from-orange-500/10 via-pink-500/10 to-purple-500/10 border-orange-500/20 backdrop-blur-md',
    midnight: 'bg-slate-950/95 border-indigo-500/30 shadow-inner',
    ocean: 'bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/20 backdrop-blur-lg',
  };

  const currentVibe = VIBE_STYLES[post.location_tag] || VIBE_STYLES.glass;

  const renderContent = (content: string) => {
    // Strip reply prefix for display
    const displayContent = content.startsWith('>>[')
      ? content.replace(/^>>\[.*?\]\s*/, '')
      : content;

    // Escape HTML to prevent XSS
    const escaped = displayContent
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

    // Bold, Italics, Links, Hashtags, Mentions
    return escaped
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>')
      .replace(/#(\w+)/g, '<span class="text-primary hover:underline cursor-pointer hashtag" data-hashtag="$1">#$1</span>')
      .replace(/@(\w+)/g, '<span class="text-primary font-bold">@$1</span>');
  };

  return (
    <>
      <article
        className={cn(
          'flex flex-col rounded-[1.35rem] border p-4 transition-all hover:-translate-y-1 hover:shadow-[0_18px_45px_hsl(var(--background)/0.24)] cursor-pointer',
          currentVibe,
          className,
        )}
        onClick={(e) => {
          // Prevent opening modal if clicking interactive elements inside the card
          if ((e.target as HTMLElement).closest('button, a, .hashtag, [role="dialog"]')) return;
          setIsModalOpen(true);
        }}
      >
        <div className="mb-3 flex items-center justify-end text-xs text-muted-foreground">
          <span className="shrink-0 text-right text-xs text-zinc-500 max-w-[100px] break-words">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </span>
        </div>

        {mediaUrls.length > 0 && (
          <div className="mt-4">
            <Carousel className="w-full">
              <CarouselContent>
                {mediaUrls.map((url, i) => (
                  <CarouselItem key={url}>
                    <div className={cn(
                      'overflow-hidden rounded-2xl border border-border/60 bg-secondary/30 transition-transform hover:scale-[1.01] active:scale-[0.99] pointer-events-none',
                      mediaClassName
                    )}>
                      {url.match(/\.(mp4|webm|mov)/) ? (
                        <video src={url} className="h-full w-full object-cover" />
                      ) : (
                        <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
                      )}
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {mediaUrls.length > 1 && (
                <>
                  <CarouselPrevious className="left-2 bg-background/50 border-none hover:bg-background/80" />
                  <CarouselNext className="right-2 bg-background/50 border-none hover:bg-background/80" />
                </>
              )}
            </Carousel>
          </div>
        )}

        {post.content.startsWith('>>[') && (
          <div className="mb-2 px-2 py-0.5 rounded bg-primary/10 text-[10px] text-primary font-bold uppercase tracking-wider inline-block w-fit">
            Reply
          </div>
        )}

        <p
          className="mt-4 text-base leading-relaxed text-foreground whitespace-pre-wrap break-words"
          dangerouslySetInnerHTML={{ __html: renderContent(post.content) }}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('hashtag')) {
              const hashtag = target.getAttribute('data-hashtag');
              if (hashtag && onHashtagClick) {
                onHashtagClick(hashtag);
              }
            }
          }}
        />

        <div className="mt-auto flex items-center justify-end pt-4 text-sm relative z-10">
          <div className="flex items-center gap-1">
            <button
              onClick={toggleLike}
              className={cn(
                "flex items-center gap-1 rounded-full px-2.5 py-1.5 transition-all",
                isLiked ? 'text-dive-bar-red bg-dive-bar-red/10' : 'text-muted-foreground hover:text-dive-bar-red hover:bg-dive-bar-red/5',
                animating && 'scale-125'
              )}
            >
              <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
              {likeCount > 0 && <span className="text-xs font-medium">{likeCount}</span>}
            </button>

            <button
              onClick={() => onReply?.(post)}
              className="p-1.5 rounded-full text-muted-foreground hover:text-primary hover:bg-secondary transition-all"
              title="Reply"
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="p-1.5 rounded-full text-muted-foreground hover:text-primary hover:bg-secondary transition-all"
                  title="React"
                >
                  <Sparkles className="w-4 h-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2 rounded-full flex gap-1 bg-card/95 backdrop-blur-md border-border/50">
                {['🍺', '🔥', '🥴', '🦾', '❤️'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      toast.success(`${emoji} reaction added!`);
                      if (emoji === '❤️') toggleLike();
                    }}
                    className="hover:scale-125 transition-transform p-1.5 text-lg"
                  >
                    {emoji}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </article>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className={cn("max-w-[500px] border", currentVibe)}>
          <div className="mb-3 flex items-center justify-end text-xs text-muted-foreground">
            <span className="shrink-0 text-right text-xs text-zinc-500 max-w-[100px] break-words">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </span>
          </div>

          {mediaUrls.length > 0 && (
            <div className="mt-2 mb-4">
              <Carousel className="w-full">
                <CarouselContent>
                  {mediaUrls.map((url, i) => (
                    <CarouselItem key={url}>
                      <div className="overflow-hidden rounded-xl border border-border/60 bg-black/90 max-h-[60vh] flex items-center justify-center">
                        {url.match(/\.(mp4|webm|mov)/) ? (
                          <video src={url} controls className="max-w-full max-h-[60vh] rounded-xl outline-none" />
                        ) : (
                          <a href={url} target="_blank" rel="noopener noreferrer" className="cursor-pointer">
                            <img src={url} alt="" className="max-w-full max-h-[60vh] object-contain rounded-xl" loading="lazy" />
                          </a>
                        )}
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {mediaUrls.length > 1 && (
                  <>
                    <CarouselPrevious className="left-2 bg-background/50 border-none hover:bg-background/80" />
                    <CarouselNext className="right-2 bg-background/50 border-none hover:bg-background/80" />
                  </>
                )}
              </Carousel>
            </div>
          )}

          <p
            className="mt-2 text-base leading-relaxed text-foreground whitespace-pre-wrap break-words"
            dangerouslySetInnerHTML={{ __html: renderContent(post.content) }}
          />

          <div className="mt-6 flex flex-wrap items-center gap-2 pt-4 border-t border-border/50">
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm text-muted-foreground hover:text-primary hover:bg-secondary transition-all"
            >
              <Share className="w-4 h-4" /> Share
            </button>

            <Dialog>
              <DialogTrigger asChild>
                <button
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm text-muted-foreground hover:text-primary hover:bg-secondary transition-all"
                >
                  <QrCode className="w-4 h-4" /> QR Code
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-[300px] z-[60] flex flex-col items-center p-6 text-center">
                <h3 className="font-bold mb-4">Scan to share dump</h3>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/post/${post.id}`)}`}
                  alt="QR Code"
                  className="w-48 h-48 rounded-lg shadow-lg border-4 border-white"
                />
              </DialogContent>
            </Dialog>

            {/* <button
            onClick={toggleBookmark}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 flex-1 justify-center rounded-full text-sm transition-all border",
              isBookmarked ? "text-primary bg-primary/10 border-primary/20" : "text-muted-foreground border-transparent hover:text-primary hover:bg-secondary"
            )}
          >
            <Bookmark className={cn("w-4 h-4", isBookmarked && "fill-current")} /> 
            {isBookmarked ? 'Saved' : 'Save'}
          </button> */}

            <button
              onClick={handleReport}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm text-muted-foreground hover:text-dive-bar-red hover:bg-secondary transition-all"
            >
              <ShieldAlert className="w-4 h-4" /> Report
            </button>

            {isOwner && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm text-muted-foreground hover:text-destructive hover:bg-secondary transition-all disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
