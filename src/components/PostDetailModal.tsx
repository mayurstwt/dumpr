import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import {
  X, Share2, MessageSquare, Trash2, ShieldAlert, QrCode, ChevronLeft, ChevronRight, Flame, Skull, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { Dialog, DialogContent, DialogTrigger, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { getWeeklyPersona } from '@/lib/personas';
import { fetchPostSingle, fetchPostsList, type AppPost } from '@/lib/posts';

type Post = AppPost;

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
    .replace(/#(\w+)/g, '<span class="text-primary hover:underline cursor-pointer font-bold">#$1</span>')
    .replace(/@(\w+)/g, '<span class="text-primary font-bold">@$1</span>');
};

function MediaDisplay({ urls, className }: { urls: string[]; className?: string }) {
  const [idx, setIdx] = useState(0);
  const { resolvedTheme } = useTheme();
  if (urls.length === 0) return null;
  const url = urls[idx];
  const bgClass = resolvedTheme === 'light' ? 'bg-zinc-100' : 'bg-zinc-900';
  return (
    <div className={cn('relative w-full h-full flex items-center justify-center', bgClass, className)}>
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

function ReplyItem({ 
  reply, 
  allReplies, 
  onReply, 
  depth = 0 
}: { 
  reply: Post; 
  allReplies: Post[]; 
  onReply: (p: Post) => void;
  depth?: number;
}) {
  const replyPersona = getWeeklyPersona(reply.user_id);
  const childReplies = allReplies.filter(r => r.parent_id === reply.id);
  
  return (
    <div className={cn("relative", depth > 0 ? "mt-4 ml-6" : "mt-8")}>
      {/* Thread line */}
      {depth > 0 && (
        <div className="absolute left-[-1.5rem] top-0 bottom-0 w-[2px] bg-border/20 rounded-full" />
      )}
      
      <div className="group/reply">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-black text-[10px] text-muted-foreground border border-border/50 shrink-0">
            {replyPersona.name.charAt(0)}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-[11px] leading-tight flex items-center gap-1.5">
              {replyPersona.name}
              {replyPersona.badge && <span className="text-[8px] px-1 bg-primary/20 text-primary rounded">★</span>}
            </span>
            <span className="text-[9px] text-muted-foreground opacity-70">{formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}</span>
          </div>
          <button 
            onClick={() => onReply(reply)}
            className="ml-auto opacity-0 group-hover/reply:opacity-100 transition-all text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
          >
            Reply
          </button>
        </div>
        <p
          className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap break-words font-medium pl-10"
          dangerouslySetInnerHTML={{ __html: renderContent(reply.content) }}
        />
      </div>

      {childReplies.length > 0 && (
        <div className="space-y-2">
          {childReplies.map(child => (
            <ReplyItem 
              key={child.id} 
              reply={child} 
              allReplies={allReplies} 
              onReply={onReply} 
              depth={depth + 1} 
            />
          ))}
        </div>
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
  const [parentPost, setParentPost] = useState<Post | null>(null);

  const mediaUrls: string[] = post.media_url?.startsWith('[')
    ? JSON.parse(post.media_url)
    : post.media_url ? [post.media_url] : [];

  const isOwner = post.user_id === userId;
  const persona = getWeeklyPersona(post.user_id);

  const fetchData = useCallback(async () => {
    setLoadingReplies(true);
    
    // Fetch all posts that are part of this thread (simplified: all posts with this post as an ancestor)
    // In a real app, you'd use a better query or a recursive fetch.
    // For now, let's fetch direct replies and their replies (2 levels).
    const { data: firstLevel } = await fetchPostsList({
      enhanced: (columns) => supabase
        .from('posts')
        .select(columns)
        .or(`parent_id.eq.${post.id},content.ilike.%>>[${post.id}]%`)
        .order('created_at', { ascending: true }),
      legacy: (columns) => supabase
        .from('posts')
        .select(columns)
        .ilike('content', `%>>[${post.id}]%`)
        .order('created_at', { ascending: true }),
    });
    
    if (firstLevel) {
      const firstLevelIds = firstLevel.map(r => r.id);
      const { data: secondLevel } = firstLevelIds.length === 0
        ? { data: [] as Post[] }
        : await fetchPostsList({
            enhanced: (columns) => supabase
              .from('posts')
              .select(columns)
              .in('parent_id', firstLevelIds)
              .order('created_at', { ascending: true }),
            legacy: async () => ({ data: [], error: null }),
          });
      
      setReplies([...(firstLevel as Post[]), ...(secondLevel as Post[] || [])]);
    }
    
    setLoadingReplies(false);

    // Fetch parent if exists
    if (post.parent_id) {
      const { data: parentData } = await fetchPostSingle({
        enhanced: (columns) => supabase
          .from('posts')
          .select(columns)
          .eq('id', post.parent_id)
          .single(),
        legacy: (columns) => supabase
          .from('posts')
          .select(columns)
          .eq('id', post.parent_id)
          .single(),
      });
      if (parentData) setParentPost(parentData as Post);
    }
  }, [post.id, post.parent_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div
        className={cn(
          'relative z-10 w-full h-full md:h-auto md:max-h-[92vh] md:max-w-6xl',
          'bg-card border border-border/60 md:rounded-[1.5rem] overflow-hidden shadow-2xl flex flex-col',
          'animate-modal-in'
        )}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 shrink-0">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-full hover:bg-secondary"
          >
            <X className="w-4 h-4" />
            <span className="hidden md:inline">Close</span>
          </button>
          <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <button className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-all" title="QR Code">
                  <QrCode className="w-4 h-4" />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-[300px] z-[100] flex flex-col items-center p-6 text-center rounded-[2rem]">
                <DialogTitle className="sr-only">Post QR Code</DialogTitle>
                <DialogDescription className="font-bold mb-4">Scan to share</DialogDescription>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/post/${post.id}`)}`}
                  alt="QR Code"
                  className="w-48 h-48 rounded-2xl shadow-lg border-4 border-white"
                />
              </DialogContent>
            </Dialog>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all active:scale-95 shadow-md shadow-primary/20"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
        </div>

        {/* Main Split */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
          {hasMedia && (
            <div className="w-full md:w-[55%] lg:w-[60%] shrink-0 bg-black flex items-center justify-center relative md:border-r border-border/40 max-h-[40vh] md:max-h-full">
              <MediaDisplay urls={mediaUrls} className="h-full w-full" />
            </div>
          )}

          <div className={cn(
            'flex flex-col flex-1 min-h-0 overflow-y-auto',
            '[-webkit-overflow-scrolling:touch]',
            '[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent',
            '[&::-webkit-scrollbar-thumb]:bg-border/40 [&::-webkit-scrollbar-thumb]:rounded-full',
          )}>
            <div className="p-6 md:p-8 flex flex-col gap-6">
              
              {/* Parent Context */}
              {parentPost && (
                <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 relative">
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-[2px] bg-border/40" />
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-black uppercase text-secondary-foreground/60 tracking-widest">
                      Replying to {getWeeklyPersona(parentPost.user_id).handle}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {renderContent(parentPost.content)}
                  </p>
                </div>
              )}

              {/* Main Content */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-black text-sm text-primary">
                    {persona.name.charAt(0)}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-black text-sm uppercase tracking-tighter leading-none">{persona.name}</span>
                    <span className="text-[10px] text-muted-foreground font-bold">{persona.handle}</span>
                  </div>
                </div>

                <p
                  className="text-base md:text-xl leading-relaxed text-foreground whitespace-pre-wrap break-words font-medium tracking-tight"
                  dangerouslySetInnerHTML={{ __html: renderContent(post.content) }}
                />
                
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </span>
                  {post.channel && (
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-[9px] text-primary font-black uppercase tracking-widest">
                      #{post.channel}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap border-t border-border/30 pt-4">
                <button
                  onClick={() => { onReply?.(post); onClose(); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-black hover:bg-secondary transition-all"
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

              {/* Comments Section */}
              <div className="space-y-6">
                <h4 className="font-black text-sm uppercase tracking-[0.2em] mb-4 flex items-center gap-2 text-muted-foreground">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  Conversations
                  {replies.length > 0 && <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">{replies.length}</span>}
                </h4>

                {loadingReplies ? (
                  <div className="space-y-4">
                    {[1,2,3].map(i => (
                      <div key={i} className="flex gap-4 items-start animate-pulse">
                        <div className="w-8 h-8 rounded-full bg-secondary shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-2.5 bg-secondary rounded w-1/3" />
                          <div className="h-2.5 bg-secondary rounded w-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : replies.length > 0 ? (
                  <div className="pb-8">
                    {/* Only render top-level replies here; recursion handles the rest */}
                    {replies
                      .filter(r => r.parent_id === post.id || !replies.find(p => p.id === r.parent_id))
                      .map(reply => (
                        <ReplyItem 
                          key={reply.id} 
                          reply={reply} 
                          allReplies={replies} 
                          onReply={(p) => onReply?.(p)} 
                        />
                      ))
                    }
                  </div>
                ) : (
                  <div className="bg-secondary/10 rounded-[1.5rem] p-8 text-center border border-dashed border-border/60">
                    <p className="text-sm font-black uppercase tracking-widest text-muted-foreground/60">No echoes yet.</p>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* More Row */}
        {relatedPosts.length > 0 && (
          <div className="shrink-0 border-t border-border/40 px-4 py-3 bg-secondary/5">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">Keep dumping</p>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {relatedPosts.map(p => {
                const thumbUrls: string[] = p.media_url?.startsWith('[')
                  ? JSON.parse(p.media_url)
                  : p.media_url ? [p.media_url] : [];
                return (
                  <button
                    key={p.id}
                    onClick={() => onSelectRelated?.(p)}
                    className="shrink-0 w-28 h-28 rounded-2xl overflow-hidden border border-border/40 hover:border-primary transition-all hover:scale-105 shadow-sm bg-card"
                  >
                    {thumbUrls.length > 0 ? (
                      <img src={thumbUrls[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-3 text-left">
                        <p className="text-[10px] text-muted-foreground line-clamp-5 leading-tight font-medium uppercase">{p.content}</p>
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
