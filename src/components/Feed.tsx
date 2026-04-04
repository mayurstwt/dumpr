import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PostCard } from './PostCard';
import { PostForm } from './PostForm';
import { LOCATIONS, type LocationTag } from '@/lib/weekend';
import { Loader2 } from 'lucide-react';

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
  const [filter, setFilter] = useState<LocationTag | 'All'>('All');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    let query = supabase.from('posts').select('*').order('created_at', { ascending: false });
    if (filter !== 'All') {
      query = query.eq('location_tag', filter);
    }
    const [postsRes, reactionsRes] = await Promise.all([
      query,
      supabase.from('reactions').select('*'),
    ]);

    if (postsRes.data) setPosts(postsRes.data);
    if (reactionsRes.data) setReactions(reactionsRes.data);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getLikeCount = (postId: string) => reactions.filter((r) => r.post_id === postId).length;
  const isLiked = (postId: string) => reactions.some((r) => r.post_id === postId && r.user_id === userId);

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl md:text-4xl font-bold neon-text text-primary">
          Weekend Dump 🍺
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          No accounts. No history. No trace.
        </p>
      </div>

      {/* Location Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {(['All', ...LOCATIONS] as const).map((loc) => (
          <button
            key={loc}
            onClick={() => setFilter(loc)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              filter === loc
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {loc}
          </button>
        ))}
      </div>

      {/* Post Form */}
      <div className="mb-6">
        <PostForm userId={userId} onPosted={fetchData} />
      </div>

      {/* Feed */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">No dumps yet. Be the first. 🎯</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              userId={userId}
              likeCount={getLikeCount(post.id)}
              isLiked={isLiked(post.id)}
              onLikeToggle={fetchData}
            />
          ))}
        </div>
      )}
    </div>
  );
}
