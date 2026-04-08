import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import {
  X, Share2, MessageSquare, Trash2, ShieldAlert, QrCode, ChevronLeft, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

interface Post {
  id: string;
  content: string;
  media_url: string | null;
  location_tag: string;
  created_at: string;
  user_id: string;
}

interface PostDetailModalProps {
  post: Post;
  userId: string;
  onClose: () => void;
  onRefresh: () => void;
  onReply?: (post: Post) => void;
  relatedPosts?: Post[];
  onSelectRelated?: (post: Post) => void;
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
    .replace(/#(\w+)/g, '<span class="text-primary hover:underline cursor-pointer">#$1</span>')
    .replace(/@(\w+)/g, '<span class="text-primary font-bold">@$1</span>');
};

function MediaDisplay({ urls, className }: { urls: string[]; className?: string }) {
  const [idx, setIdx] = useState(0);
  if (urls.length === 0) return null;
  const url = urls[idx];
  return (
    <div className={cn('relative w-full h-full flex items-center justify-center bg-black', className)}>
      {url.match(/\.(mp4|webm|mov)/i) ? (
        <video src={url} controls className="max-w-full max-h-full object-contain outline-none" />
      ) : (
        <img src={url} alt="" className="max-w-full max-h-full object-contain select-none" loading="lazy" />
      )}
      {urls.length > 1 && (
        <>
          <button
            onClick={() => setIdx(i => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/80 disabled:opacity-30 transition-all"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={() => setIdx(i => Math.min(urls.length - 1, i + 1))}
            disabled={idx === urls.length - 1}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/80 disabled:opacity-30 transition-all"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
            {urls.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={cn('w-1.5 h-1.5 rounded-full transition-all', i === idx ? 'bg-white scale-125' : 'bg-white/40')}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function PostDetailModal({
  post,
  userId,
  onClose,
  onRefresh,
  onReply,
  relatedPosts = [],
  onSelectRelated,
}: PostDetailModalProps) {
  const [replies, setReplies] = useState<Post[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const mediaUrls: string[] = post.media_url?.startsWith('[')
    ? JSON.parse(post.media_url)
    : post.media_url ? [post.media_url] : [];

  const isOwner = post.user_id === userId;

  const fetchReplies = useCallback(async () => {
    setLoadingReplies(true);
    const { data } = await supabase
      .from('posts')
      .select('*')
      .like('content', `>>[${post.id}]%`)
      .order('created_at', { ascending: true });
    if (data) setReplies(data as Post[]);
    setLoadingReplies(false);
  }, [post.id]);

  useEffect(() => {
    fetchReplies();
  }, [fetchReplies]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Dumpr', text: post.content, url }); return; } catch {}
    }
    navigator.clipboard.writeText(url);
    toast.success('Link copied!');
  };

  const handleDelete = async () => {
    if (!confirm('Delete this dump?')) return;
    setDeleting(true);
    const { error } = await supabase.from('posts').delete().eq('id', post.id).eq('user_id', userId);
    if (error) { toast.error(error.message); setDeleting(false); return; }
    toast.success('Dump deleted');
    onRefresh();
    onClose();
  };

  const handleReport = () => toast.success('Post reported. Thanks for keeping it clean 🦾');

  const hasMedia = mediaUrls.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className={cn(
          'relative z-10 w-full h-full md:h-auto md:max-h-[92vh] md:max-w-6xl',
          'bg-card border border-border/60 md:rounded-[1.5rem] overflow-hidden shadow-2xl flex flex-col',
          'animate-modal-in'
        )}
      >
        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 shrink-0">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-full hover:bg-secondary"
          >
            <X className="w-4 h-4" />
            <span className="hidden md:inline">Close</span>
          </button>
          <div className="flex items-center gap-2">
            {/* QR */}
            <Dialog>
              <DialogTrigger asChild>
                <button className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-all" title="QR Code">
                  <QrCode className="w-4 h-4" />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-[300px] z-[100] flex flex-col items-center p-6 text-center rounded-[2rem]">
                <h3 className="font-bold mb-4">Scan to share</h3>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/post/${post.id}`)}`}
                  alt="QR Code"
                  className="w-48 h-48 rounded-2xl shadow-lg border-4 border-white"
                />
              </DialogContent>
            </Dialog>
            {/* Share */}
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all active:scale-95 shadow-md shadow-primary/20"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
        </div>

        {/* ── Main Split ── */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">

          {/* LEFT — Media */}
          {hasMedia && (
            <div className="w-full md:w-[55%] lg:w-[60%] shrink-0 bg-black flex items-center justify-center relative md:border-r border-border/40 max-h-[40vh] md:max-h-full">
              <MediaDisplay urls={mediaUrls} className="h-full w-full" />
            </div>
          )}

          {/* RIGHT — Content + Comments */}
          <div className={cn(
            'flex flex-col flex-1 min-h-0 overflow-y-auto',
            '[-webkit-overflow-scrolling:touch]',
            '[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent',
            '[&::-webkit-scrollbar-thumb]:bg-border/40 [&::-webkit-scrollbar-thumb]:rounded-full',
          )}>
            <div className="p-6 md:p-8 flex flex-col gap-6">

              {/* Post content */}
              <div>
                {post.content.startsWith('>>[') && (
                  <span className="inline-block mb-2 px-2 py-0.5 rounded bg-primary/10 text-[10px] text-primary font-bold uppercase tracking-wider">
                    Reply
                  </span>
                )}
                <p
                  className="text-base md:text-lg leading-relaxed text-foreground whitespace-pre-wrap break-words"
                  dangerouslySetInnerHTML={{ __html: renderContent(post.content) }}
                />
                <p className="mt-3 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap border-t border-border/30 pt-4">
                <button
                  onClick={() => { onReply?.(post); onClose(); }}
                  className="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold hover:bg-secondary transition-all"
                >
                  <MessageSquare className="w-4 h-4" />
                  Reply
                </button>
                {isOwner && (
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center gap-2 px-3 py-2 rounded-full text-sm text-destructive hover:bg-destructive/10 transition-all ml-auto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={handleReport}
                  className="flex items-center gap-2 px-3 py-2 rounded-full text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
                >
                  <ShieldAlert className="w-4 h-4" />
                </button>
              </div>

              {/* Comments */}
              <div>
                <h4 className="font-bold text-base mb-4 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  Comments
                  {replies.length > 0 && (
                    <span className="text-xs font-normal text-muted-foreground ml-1">({replies.length})</span>
                  )}
                </h4>

                {loadingReplies ? (
                  <div className="space-y-3">
                    {[1,2,3].map(i => (
                      <div key={i} className="flex gap-3 items-start animate-pulse">
                        <div className="w-8 h-8 rounded-full bg-secondary shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 bg-secondary rounded w-1/4" />
                          <div className="h-3 bg-secondary rounded w-3/4" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : replies.length > 0 ? (
                  <div className="space-y-5 pb-4">
                    {replies.map(reply => (
                      <div key={reply.id} className="flex gap-3 items-start">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold text-xs uppercase text-muted-foreground border border-border/50 shrink-0">
                          {reply.user_id.substring(0, 2)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm">anon</span>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p
                            className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap break-words"
                            dangerouslySetInnerHTML={{ __html: renderContent(reply.content) }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-secondary/20 rounded-2xl p-6 text-center border border-border/30">
                    <p className="text-sm font-medium text-muted-foreground">No comments yet.</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Be the first to reply 🍻</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── More Posts Row ── */}
        {relatedPosts.length > 0 && (
          <div className="shrink-0 border-t border-border/40 px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">More dumps</p>
            <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {relatedPosts.map(p => {
                const thumbUrls: string[] = p.media_url?.startsWith('[')
                  ? JSON.parse(p.media_url)
                  : p.media_url ? [p.media_url] : [];
                return (
                  <button
                    key={p.id}
                    onClick={() => onSelectRelated?.(p)}
                    className="shrink-0 w-24 rounded-xl overflow-hidden border border-border/50 hover:border-primary/60 transition-all hover:scale-105 hover:shadow-lg group"
                  >
                    {thumbUrls.length > 0 ? (
                      <img
                        src={thumbUrls[0]}
                        alt=""
                        className="w-24 h-24 object-cover group-hover:opacity-90 transition-opacity"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-secondary/60 flex items-center justify-center p-2">
                        <p className="text-[9px] text-foreground/70 line-clamp-4 text-left leading-relaxed break-words">
                          {p.content.replace(/^>>\[.*?\]\s*/, '')}
                        </p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
