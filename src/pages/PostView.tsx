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

export default function PostView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userId, loading: authLoading } = useAnonymousAuth();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reactions, setReactions] = useState<any[]>([]);
  const [replies, setReplies] = useState<any[]>([]);
  const [replyTo, setReplyTo] = useState<{ id: string; content: string } | null>(null);

  const fetchData = async () => {
    if (!id) return;
    
    const [postRes, reactionsRes, repliesRes] = await Promise.all([
      supabase.from('posts').select('*').eq('id', id).single(),
      supabase.from('reactions').select('*').eq('post_id', id),
      supabase.from('posts').select('*').ilike('content', `%>>[${id}]%`).order('created_at', { ascending: true })
    ]);

    if (postRes.data) setPost(postRes.data);
    if (reactionsRes.data) setReactions(reactionsRes.data);
    if (repliesRes.data) setReplies(repliesRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  if (loading || authLoading) {
    return (
      <AppBackground centered>
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </AppBackground>
    );
  }

  if (!post) {
    return (
      <AppBackground centered>
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Post not found. It might have been burned. 🔥</p>
          <Button onClick={() => navigate('/')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Feed
          </Button>
        </div>
      </AppBackground>
    );
  }

  const likeCount = reactions.length;
  const isLiked = reactions.some(r => r.user_id === userId);

  return (
    <AppBackground>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Button 
          onClick={() => navigate('/')} 
          variant="ghost" 
          className="mb-6 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Feed
        </Button>
        
        <PostCard 
          post={post}
          userId={userId || ''}
          onRefresh={fetchData}
          onReply={(p) => setReplyTo({ id: p.id, content: p.content })}
        />

        <div className="mt-12 space-y-8">
          <div className="border-t border-border pt-8">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Replies ({replies.length})
            </h3>
            
            <PostForm 
              userId={userId || ''} 
              onPosted={() => { fetchData(); setReplyTo(null); }}
              replyTo={replyTo || { id: post.id, content: post.content }}
              onCancelReply={() => setReplyTo(null)}
            />
          </div>

          <div className="space-y-6">
            {replies.map((reply) => (
              <PostCard 
                key={reply.id}
                post={reply}
                userId={userId || ''}
                onRefresh={fetchData}
                onReply={(p) => setReplyTo({ id: p.id, content: p.content })}
                className="bg-secondary/20 scale-[0.98] origin-top"
              />
            ))}
            {replies.length === 0 && (
              <p className="text-center text-muted-foreground py-8 border border-dashed border-border rounded-xl">
                No replies yet. Be the first to chime in! 💬
              </p>
            )}
          </div>
        </div>

        <div className="mt-16 border-t border-border/50 pt-8 pb-8">
          <ProductHuntBadge />
        </div>
      </div>
    </AppBackground>
  );
}
