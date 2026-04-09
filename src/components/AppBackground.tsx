import type { ReactNode } from 'react';
import { useTheme } from 'next-themes';

import { FlickeringGrid } from '@/components/ui/flickering-grid';
import { cn } from '@/lib/utils';

interface AppBackgroundProps {
  children: ReactNode;
  centered?: boolean;
  className?: string;
}

export function AppBackground({ children, centered = false, className }: AppBackgroundProps) {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  return (
    <div className={cn('dive-bar-gradient relative min-h-screen overflow-hidden', className)}>
      <div className="absolute inset-0">
        {/* Radial accent blobs — softer in light mode */}
        <div className={cn(
          'absolute inset-0',
          isLight
            ? 'bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.10),_transparent_38%),radial-gradient(circle_at_bottom,_hsl(var(--accent)/0.08),_transparent_32%)]'
            : 'bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.16),_transparent_38%),radial-gradient(circle_at_bottom,_hsl(var(--accent)/0.14),_transparent_32%)]'
        )} />

        {/* Flickering grid — adapts color for light/dark */}
        <FlickeringGrid
          className="absolute inset-0 h-full w-full"
          color={isLight ? 'rgb(180, 120, 20)' : 'rgb(255, 196, 76)'}
          squareSize={5}
          gridGap={7}
          maxOpacity={isLight ? 0.10 : 0.18}
          flickerChance={0.45}
        />

        {/* Fade overlay — lighter in light mode */}
        <div className={cn(
          'absolute inset-0',
          isLight
            ? 'bg-[linear-gradient(180deg,hsl(var(--background)/0.05)_0%,hsl(var(--background)/0.45)_72%,hsl(var(--background)/0.90)_100%)]'
            : 'bg-[linear-gradient(180deg,hsl(var(--background)/0.14)_0%,hsl(var(--background)/0.72)_72%,hsl(var(--background))_100%)]'
        )} />
      </div>

      <div
        className={cn(
          'relative z-10 min-h-screen',
          centered && 'flex items-center justify-center',
        )}
      >
        {children}
      </div>
    </div>
  );
}
