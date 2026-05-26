import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { getOptimizedImageUrl } from '@/lib/imageUpload';
import { cn } from '@/lib/utils';

type ThumbnailSize = 'sm' | 'md';

interface ThumbnailImageProps {
  src: string | null | undefined;
  name?: string | null;
  alt?: string;
  size?: ThumbnailSize;
  className?: string;
  fallbackClassName?: string;
  fallback?: ReactNode;
}

function getInitial(name: string | null | undefined): string {
  return name?.trim().charAt(0).toUpperCase() || 'M';
}

export function ThumbnailImage({
  src,
  name,
  alt = '',
  size = 'sm',
  className,
  fallbackClassName,
  fallback,
}: ThumbnailImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src, size]);

  const optimizedSrc = useMemo(
    () => (failed ? undefined : getOptimizedImageUrl(src, size)),
    [failed, src, size]
  );

  if (!optimizedSrc) {
    return (
      <div
        className={cn(
          'flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-400 to-teal-500 text-white font-bold',
          fallbackClassName
        )}
      >
        {fallback ?? getInitial(name)}
      </div>
    );
  }

  return (
    <img
      src={optimizedSrc}
      alt={alt}
      className={cn('h-full w-full object-cover', className)}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
