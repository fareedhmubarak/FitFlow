import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"
import { getOptimizedImageUrl } from "@/lib/imageUpload"

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, src, onLoadingStatusChange, ...props }, ref) => {
  // Use the small stored thumbnail; if it is missing, fall back to the full photo
  const optimizedSrc = React.useMemo(
    () => getOptimizedImageUrl(src as string) || src,
    [src]
  );
  // Tied to the current src so a new photo always tries the thumbnail first
  const [fallbackFor, setFallbackFor] = React.useState<string | undefined>(undefined);
  const useOriginal = !!src && fallbackFor === src;
  const setUseOriginal = () => setFallbackFor(src as string);

  return (
    <AvatarPrimitive.Image
      ref={ref}
      src={useOriginal ? src : optimizedSrc}
      className={cn("aspect-square h-full w-full object-cover", className)}
      loading="lazy"
      decoding="async"
      onLoadingStatusChange={(status) => {
        if (status === "error" && !useOriginal && src && optimizedSrc !== src) {
          setUseOriginal();
        }
        onLoadingStatusChange?.(status);
      }}
      {...props}
    />
  );
})
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
