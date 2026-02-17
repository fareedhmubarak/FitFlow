import * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { getOptimizedImageUrl } from '@/lib/imageUpload';
import { cn } from '@/lib/utils';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface OptimizedAvatarProps {
  src: string | null | undefined;
  alt?: string;
  fallback: React.ReactNode;
  /** Avatar display size: sm (40px), md (64px), lg (96px), xl (128px) */
  size?: AvatarSize;
  className?: string;
  fallbackClassName?: string;
  onClick?: () => void;
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'h-10 w-10',
  md: 'h-16 w-16',
  lg: 'h-24 w-24',
  xl: 'h-32 w-32',
};

/**
 * Optimized Avatar component that:
 * 1. Uses Supabase Image Transforms for on-the-fly resizing (serves tiny thumbnails instead of full images)
 * 2. Shows fallback instantly while image loads
 * 3. Uses browser-native loading="eager" for visible avatars
 * 4. Caches optimized URLs in memory
 */
const OptimizedAvatar = React.memo(function OptimizedAvatar({
  src,
  alt,
  fallback,
  size = 'sm',
  className,
  fallbackClassName,
  onClick,
}: OptimizedAvatarProps) {
  const optimizedSrc = React.useMemo(
    () => getOptimizedImageUrl(src, size),
    [src, size]
  );

  return (
    <Avatar className={cn(sizeClasses[size], className)} onClick={onClick}>
      {optimizedSrc && (
        <AvatarImage
          src={optimizedSrc}
          alt={alt}
          loading="eager"
          decoding="async"
        />
      )}
      <AvatarFallback className={cn(fallbackClassName)}>
        {fallback}
      </AvatarFallback>
    </Avatar>
  );
});

export { OptimizedAvatar };
export type { OptimizedAvatarProps, AvatarSize };
