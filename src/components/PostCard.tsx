import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Heart, MapPin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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
}

export function PostCard({ post, userId, likeCount, isLiked, onLikeToggle }: PostCardProps) {
  const [animating, setAnimating] = useState(false);

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

  return (
    <div className="bg-card border border-border rounded-xl p-4 transition-all hover:border-primary/20">
      <p className="text-foreground text-base leading-relaxed whitespace-pre-wrap break-words">
        {post.content}
      </p>

      {post.media_url && (
        <div className="mt-3 rounded-lg overflow-hidden">
          {post.media_url.match(/\.(mp4|webm|mov)/) ? (
            <video src={post.media_url} controls className="w-full max-h-80 rounded-lg" />
          ) : (
            <img src={post.media_url} alt="" className="w-full max-h-80 object-cover rounded-lg" loading="lazy" />
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-3 text-sm">
        <div className="flex items-center gap-3 text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {post.location_tag}
          </span>
          <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
        </div>

        <button
          onClick={toggleLike}
          className={`flex items-center gap-1 transition-all ${
            isLiked ? 'text-dive-bar-red' : 'text-muted-foreground hover:text-dive-bar-red'
          } ${animating ? 'scale-125' : 'scale-100'}`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
          {likeCount > 0 && <span className="text-xs">{likeCount}</span>}
        </button>
      </div>
    </div>
  );
}
