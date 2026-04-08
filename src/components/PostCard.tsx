import { useState } from 'react';
import { Share2, MessageSquare, Sparkles, Plus } from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';
import { PostDetailModal } from './PostDetailModal';

interface Post {
  id: string;
  content: string;
  media_url: string | null;
  location_tag: string;
  created_at: string;
  user_id: string;
}

interface PostCardProps {
  post: Post;
  userId: string;
  onRefresh: () => void;
  onHashtagClick?: (hashtag: string) => void;
  onReply?: (post: Post) => void;
  className?: string;
  relatedPosts?: Post[];
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
    .replace(/#(\w+)/g, '<span class="text-primary hover:underline cursor-pointer hashtag" data-hashtag="$1">#$1</span>')
    .replace(/@(\w+)/g, '<span class="text-primary font-bold">@$1</span>');
};

export function PostCard({
  post,
  userId,
  onRefresh,
  onHashtagClick,
  onReply,
  className,
  relatedPosts = [],
}: PostCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post>(post);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const mediaUrls: string[] = post.media_url?.startsWith('[')
    ? JSON.parse(post.media_url)
    : post.media_url ? [post.media_url] : [];

  const firstMedia = mediaUrls[0] ?? null;
  const isVideo = firstMedia?.match(/\.(mp4|webm|mov)/i);
  const displayContent = post.content.startsWith('>>[')
    ? post.content.replace(/^>>\[.*?\]\s*/, '')
    : post.content;
  const isReply = post.content.startsWith('>>[');

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Dumpr', text: post.content, url }); return; } catch {}
    }
    navigator.clipboard.writeText(url);
    toast.success('Link copied!');
  };

  const openModal = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, a, .hashtag')) return;
    setIsModalOpen(true);
  };

  return (
    <>
      {/* ── Pin Card ── */}
      <article
        className={cn(
          'group relative rounded-2xl overflow-hidden cursor-pointer bg-card border border-border/60',
          'transition-all duration-300 ease-out',
          'hover:shadow-[0_12px_40px_rgba(0,0,0,0.25)] hover:-translate-y-0.5',
          'break-inside-avoid',
          className,
        )}
        onClick={openModal}
      >
        {/* ── Media ── */}
        {firstMedia && (
          <div className="relative w-full overflow-hidden">
            {isVideo ? (
              <video
                src={firstMedia}
                className="w-full object-cover"
                muted
                playsInline
                preload="metadata"
              />
            ) : (
              <img
                src={firstMedia}
                alt=""
                className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                loading="lazy"
              />
            )}
            {mediaUrls.length > 1 && (
              <span className="absolute top-2 left-2 text-[10px] font-bold bg-black/60 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
                +{mediaUrls.length}
              </span>
            )}
            {/* Hover gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pin-card-overlay" />

            {/* ── Pinterest-style hover Share button ── */}
            <button
              onClick={handleShare}
              className={cn(
                'absolute top-3 right-3 z-20',
                'flex items-center gap-1.5 px-3.5 py-2 rounded-full',
                'bg-primary text-primary-foreground font-semibold text-sm',
                'shadow-lg shadow-black/30',
                'opacity-0 translate-y-2 scale-95',
                'group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100',
                'transition-all duration-200 ease-out',
                'hover:brightness-110 active:scale-95',
              )}
              title="Share"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </button>

            {/* ── Emoji Reaction on hover (bottom-left of image) ── */}
            <div
              className="absolute bottom-3 left-3 z-20 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200"
              onClick={e => e.stopPropagation()}
            >
              <Popover onOpenChange={(open) => !open && setShowEmojiPicker(false)}>
                <PopoverTrigger asChild>
                  <button
                    className="p-2 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-all"
                    title="React"
                    onClick={e => e.stopPropagation()}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-2 rounded-2xl flex flex-col gap-2 bg-card/95 backdrop-blur-md border border-border/50 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  {!showEmojiPicker ? (
                    <div className="flex gap-1 items-center">
                      {['🍺', '🔥', '🥴', '😂', '💀'].map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => { toast.success(`${emoji} reaction added!`); setShowEmojiPicker(false); }}
                          className="hover:scale-125 transition-transform p-1.5 text-lg"
                        >
                          {emoji}
                        </button>
                      ))}
                      <button
                        onClick={() => setShowEmojiPicker(true)}
                        className="hover:scale-125 transition-transform p-1.5 text-muted-foreground hover:text-primary"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="min-w-[280px]" onClick={(e) => e.stopPropagation()}>
                      <EmojiPicker
                        onEmojiClick={(e) => { toast.success(`${e.emoji} reaction added!`); setShowEmojiPicker(false); }}
                        theme={Theme.DARK}
                        lazyLoadEmojis
                      />
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}

        {/* ── Text Content ── */}
        <div className="p-3.5">
          {isReply && (
            <span className="inline-block mb-1.5 px-2 py-0.5 rounded bg-primary/10 text-[9px] text-primary font-bold uppercase tracking-wider">
              Reply
            </span>
          )}
          <p
            className="text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words line-clamp-6"
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

          {/* Footer */}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground/70 font-medium">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </span>
            <div className="flex items-center gap-0.5">
              {/* Reply quick-action */}
              <button
                onClick={(e) => { e.stopPropagation(); onReply?.(post); }}
                className="p-1.5 rounded-full text-muted-foreground hover:text-primary hover:bg-secondary transition-all"
                title="Reply"
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </button>
              {/* Share (always visible in footer) */}
              <button
                onClick={handleShare}
                className="p-1.5 rounded-full text-muted-foreground hover:text-primary hover:bg-secondary transition-all"
                title="Share"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </article>

      {/* ── Post Detail Modal ── */}
      {isModalOpen && (
        <PostDetailModal
          post={selectedPost}
          userId={userId}
          onClose={() => { setIsModalOpen(false); setSelectedPost(post); }}
          onRefresh={onRefresh}
          onReply={onReply}
          relatedPosts={relatedPosts.filter(p => p.id !== selectedPost.id)}
          onSelectRelated={(p) => setSelectedPost(p)}
        />
      )}
    </>
  );
}