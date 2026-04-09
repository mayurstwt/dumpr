import { useMemo } from 'react';
import { Flame, Trophy, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TopWeeklyRecap() {
  const highlights = useMemo(() => [
    "🔥 Most Voted: 'The Coffee Machine Rebellion of Floor 4'",
    "💀 Too Real: 'Why I fake-typed for 3 hours today'",
    "🤯 Unhinged: '3 AM startup brainstorm in the elevator'",
    "💼 Record Dump: 42 confessions in Monday Meltdown!"
  ], []);

  return (
    <div className="w-full bg-primary/10 mb-4 border-y border-primary/20 py-3 overflow-hidden whitespace-nowrap active:bg-primary/20 transition-colors cursor-default select-none">
      <div className="flex animate-marquee gap-12 items-center">
        {[...highlights, ...highlights].map((text, i) => (
          <div key={i} className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-primary">
            {text.includes('Most Voted') && <Trophy className="w-4 h-4" />}
            {text.includes('Too Real') && <Flame className="w-4 h-4" />}
            {text.includes('Unhinged') && <TrendingUp className="w-4 h-4" />}
            {text}
            <span className="mx-4 text-primary/30">/</span>
          </div>
        ))}
      </div>
    </div>
  );
}
