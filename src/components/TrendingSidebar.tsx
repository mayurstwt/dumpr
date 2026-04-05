import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrendingSidebarProps {
  onHashtagClick: (hashtag: string) => void;
  activeHashtag?: string;
  className?: string;
}

export function TrendingSidebar({ onHashtagClick, activeHashtag, className }: TrendingSidebarProps) {
  const [trending, setTrending] = useState<{ tag: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('content');

      if (data) {
        const counts: Record<string, number> = {};
        data.forEach(p => {
          const tags = p.content.match(/#(\w+)/g);
          if (tags) {
            tags.forEach(t => {
              const tag = t.slice(1).toLowerCase();
              counts[tag] = (counts[tag] || 0) + 1;
            });
          }
        });

        const sorted = Object.entries(counts)
          .map(([tag, count]) => ({ tag, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setTrending(sorted);
      }
      setLoading(false);
    };

    fetchTrending();

    // Refresh every 5 minutes or on new posts
    const channel = supabase
      .channel('trending_changes')
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'posts' }, () => fetchTrending())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) return null;
  if (trending.length === 0) return null;

  return (
    <div className={cn("space-y-4 p-4 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm", className)}>
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <TrendingUp className="w-4 h-4 text-primary" />
        Trending Now
      </div>
      <div className="flex flex-wrap gap-2">
        {trending.map(({ tag, count }) => (
          <button
            key={tag}
            onClick={() => onHashtagClick(tag)}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs transition-all border",
              activeHashtag === tag 
                ? "bg-primary text-primary-foreground border-primary" 
                : "bg-secondary/50 text-muted-foreground border-border/50 hover:border-primary/50 hover:bg-secondary"
            )}
          >
            <Hash className="w-3 h-3" />
            {tag}
            <span className="opacity-50 ml-1">{count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
