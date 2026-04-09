import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PostCard } from '@/components/PostCard';
import { PostForm } from '@/components/PostForm';
import { AppBackground } from '@/components/AppBackground';
import { Loader2, ArrowLeft, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAnonymousAuth } from '@/hooks/useAnonymousAuth';
import { ProductHuntBadge } from '@/components/ProductHuntBadge';
import { fetchPostSingle, fetchPostsList, type AppPost } from '@/lib/posts';

export default function PostView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userId, loading: authLoading } = useAnonymousAuth();
  const [post, setPost] = useState<AppPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [reactions, setReactions] = useState<any[]>([]);
  const [replies, setReplies] = useState<AppPost[]>([]);
  const [replyTo, setReplyTo] = useState<{ id: string; content: string } | null>(null);

  const fetchData = async () => {
    if (!id) return;
    
    const [postRes, reactionsRes, repliesRes] = await Promise.all([
      fetchPostSingle({
        enhanced: (columns) => supabase.from('posts').select(columns).eq('id', id).single(),
        legacy: (columns) => supabase.from('posts').select(columns).eq('id', id).single(),
      }),
      supabase.from('reactions').select('*'), // Fetch all for counts
      fetchPostsList({
        enhanced: (columns) => supabase.from('posts')
          .select(columns)
          .or(`parent_id.eq.${id},content.ilike.%>>[${id}]%`)
          .order('created_at', { ascending: true }),
        legacy: (columns) => supabase.from('posts')
          .select(columns)
          .ilike('content', `%>>[${id}]%`)
          .order('created_at', { ascending: true }),
      })
    ]);

    if (postRes.data) {
      setPost(postRes.data);
      // Dynamic Title for Sharing
      document.title = `${postRes.data.content.slice(0, 50)}... | Dumpr`;
      
      // Attempt Meta Update for Social Previews (Client-side)
      const desc = document.querySelector('meta[name="description"]');
      if (desc) desc.setAttribute('content', postRes.data.content.slice(0, 160));
    }
    if (reactionsRes.data) setReactions(reactionsRes.data);
    if (repliesRes.data) setReplies(repliesRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    return () => { document.title = 'Dumpr | Corporate Chaos & Weekend Dumps'; };
  }, [id]);

  if (loading || authLoading) {
    return (
      <AppBackground centered>
        <Loader2 className="w-12 h-12 animate-spin text-primary opacity-50" />
      </AppBackground>
    );
  }

  if (!post) {
    return (
      <AppBackground centered>
        <div className="text-center space-y-6">
          <div className="p-8 rounded-[3rem] bg-secondary/20 border border-dashed border-border/60">
            <p className="text-muted-foreground font-black uppercase tracking-widest leading-relaxed">
              Post not found.<br/>It might have been burned. 🔥
            </p>
          </div>
          <Button onClick={() => navigate('/')} variant="ghost" className="rounded-2xl font-black uppercase tracking-widest text-primary hover:bg-primary/10">
            <ArrowLeft className="w-4 h-4 mr-2" /> Return to Feed
          </Button>
        </div>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <div className="max-w-3xl mx-auto px-4 py-12 md:py-24">
        <header className="flex items-center justify-between mb-12">
          <Button 
            onClick={() => navigate('/')} 
            variant="ghost" 
            className="rounded-2xl font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-secondary/50 group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" /> 
            Back
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-6 w-[1px] bg-border/40 mx-2" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">Live Thread</span>
          </div>
        </header>
        
        <div className="relative">
          <div className="absolute -inset-4 bg-primary/5 blur-3xl rounded-[3rem] -z-10 opacity-50" />
          <PostCard 
            post={post}
            userId={userId || ''}
            onRefresh={fetchData}
            onReply={(p) => setReplyTo({ id: p.id, content: p.content })}
            className="shadow-2xl border-primary/20"
          />
        </div>

        <div className="mt-16 space-y-16">
          <div className="space-y-8">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xl md:text-3xl font-black italic tracking-tighter flex items-center gap-3">
                <MessageSquare className="w-6 h-6 text-primary" />
                Latest Echoes
                {replies.length > 0 && <span className="bg-primary/20 text-primary text-sm px-3 py-1 rounded-full">{replies.length}</span>}
              </h3>
            </div>
            
            <div className="p-1 rounded-[2.5rem] bg-gradient-to-br from-primary/10 via-transparent to-transparent">
              <PostForm 
                userId={userId || ''} 
                onPosted={() => { fetchData(); setReplyTo(null); }}
                replyTo={replyTo || { id: post.id, content: post.content }}
                onCancelReply={() => setReplyTo(null)}
              />
            </div>
          </div>

          <div className="space-y-6 relative">
            {replies.length > 0 && <div className="absolute left-10 top-0 bottom-0 w-[1px] bg-border/40 -z-10" />}
            {replies.map((reply) => (
              <PostCard 
                key={reply.id}
                post={reply}
                userId={userId || ''}
                onRefresh={fetchData}
                onReply={(p) => setReplyTo({ id: p.id, content: p.content })}
                className="bg-secondary/5 scale-[0.98] origin-top border-border/40 backdrop-blur-sm"
              />
            ))}
            {replies.length === 0 && (
              <div className="py-20 text-center rounded-[2.5rem] bg-secondary/5 border border-dashed border-border/60">
                <p className="text-sm font-black uppercase tracking-widest text-muted-foreground opacity-50">
                  No echoes yet. Be the first to chime in. 💬
                </p>
              </div>
            )}
          </div>
        </div>

        <footer className="mt-24 border-t border-border/30 pt-12 pb-12 flex flex-col items-center gap-8 text-center">
          <div className="scale-125">
            <ProductHuntBadge />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-30">
            Powered by Dumpr Anonymous Network
          </p>
        </footer>
      </div>
    </AppBackground>
  );
}
