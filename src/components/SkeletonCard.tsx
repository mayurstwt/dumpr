import { cn } from '@/lib/utils';

interface SkeletonCardProps {
  className?: string;
  hasImage?: boolean;
}

export function SkeletonCard({ className, hasImage = true }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl overflow-hidden bg-card border border-border/40 break-inside-avoid',
        className,
      )}
    >
      {/* Image skeleton */}
      {hasImage && (
        <div className="relative w-full bg-secondary/60 animate-pulse" style={{ paddingBottom: `${60 + Math.random() * 40}%` }} />
      )}

      {/* Content skeleton */}
      <div className="p-3.5 space-y-2">
        {/* Text lines */}
        <div className="h-3 bg-secondary/60 rounded-full animate-pulse w-full" />
        <div className="h-3 bg-secondary/60 rounded-full animate-pulse w-4/5" />
        {!hasImage && <div className="h-3 bg-secondary/60 rounded-full animate-pulse w-3/5" />}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <div className="h-2.5 bg-secondary/40 rounded-full animate-pulse w-16" />
          <div className="flex gap-1">
            <div className="h-6 w-6 bg-secondary/40 rounded-full animate-pulse" />
            <div className="h-6 w-6 bg-secondary/40 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Pre-generated skeleton grid that mimics the masonry layout
const SKELETON_CONFIGS = [
  { hasImage: true },
  { hasImage: false },
  { hasImage: true },
  { hasImage: true },
  { hasImage: false },
  { hasImage: true },
  { hasImage: false },
  { hasImage: true },
  { hasImage: true },
  { hasImage: false },
  { hasImage: true },
  { hasImage: true },
];

export function SkeletonFeed() {
  return (
    <div
      className="columns-2 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5"
      style={{ columnGap: '12px' }}
    >
      {SKELETON_CONFIGS.map((config, i) => (
        <div key={i} className="break-inside-avoid mb-3">
          <SkeletonCard hasImage={config.hasImage} />
        </div>
      ))}
    </div>
  );
}
