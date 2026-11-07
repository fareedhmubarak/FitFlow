import { type ReactNode, useMemo, useState } from 'react';
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
  // 0 = thumbnail, 1 = full photo (thumbnail missing), 2 = give up → initial.
  // Attempts are tied to the current src so a new photo always starts at 0.
  const key = `${src ?? ''}|${size}`;
  const [state, setState] = useState({ key, attempt: 0 });
  const attempt = state.key === key ? state.attempt : 0;

  const thumbSrc = useMemo(() => getOptimizedImageUrl(src, size), [src, size]);
  const optimizedSrc = attempt === 0 ? thumbSrc : attempt === 1 ? src || undefined : undefined;

  const handleError = () =>
    setState({ key, attempt: attempt === 0 && src && thumbSrc !== src ? 1 : 2 });

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
      onError={handleError}
    />
  );
}
