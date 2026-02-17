import { motion } from 'framer-motion';

interface GymLoaderProps {
  message?: string;
  /** Skeleton variant for contextual placeholders */
  variant?: 'default' | 'list' | 'calendar' | 'detail';
}

// ── Shimmer block ────────────────────────────────────────
function S({ className = '' }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded-xl ${className}`} />;
}

export function GymLoader({ message = 'Loading...', variant = 'default' }: GymLoaderProps) {
  return (
    <div
      className="fixed inset-0 w-screen h-screen font-[Urbanist] overflow-hidden"
      style={{ backgroundColor: 'var(--theme-bg, #E0F2FE)' }}
    >
      {/* Subtle background blobs (CSS only — no JS animation) */}
      <div
        className="absolute top-[-15%] left-[-15%] w-[60%] h-[50%] rounded-full blur-[80px] opacity-30 pointer-events-none animate-blob"
        style={{ backgroundColor: 'var(--theme-blob-1, #6EE7B7)' }}
      />
      <div
        className="absolute bottom-[-10%] right-[-15%] w-[55%] h-[45%] rounded-full blur-[80px] opacity-25 pointer-events-none animate-blob animation-delay-4000"
        style={{ backgroundColor: 'var(--theme-blob-2, #FCA5A5)' }}
      />

      {/* Skeleton content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.12 }}
        className="relative z-10 p-4 space-y-4 h-full"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      >
        {variant === 'list' && <ListSkeleton />}
        {variant === 'calendar' && <CalendarSkeleton />}
        {variant === 'detail' && <DetailSkeleton />}
        {variant === 'default' && <DefaultSkeleton />}
      </motion.div>
    </div>
  );
}

function DefaultSkeleton() {
  return (
    <>
      {/* Header */}
      <div className="flex justify-between items-center">
        <S className="h-9 w-9 rounded-xl" />
        <S className="h-6 w-28" />
        <S className="h-9 w-9 rounded-full" />
      </div>
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        <S className="h-24 rounded-2xl" />
        <S className="h-24 rounded-2xl" />
        <S className="h-24 rounded-2xl" />
      </div>
      {/* Content */}
      <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="space-y-2">
          <S className="h-5 w-24" />
          {[...Array(4)].map((_, i) => (
            <S key={i} className="h-14 rounded-xl" />
          ))}
        </div>
        <div className="space-y-2">
          <S className="h-5 w-20" />
          {[...Array(4)].map((_, i) => (
            <S key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      </div>
    </>
  );
}

function ListSkeleton() {
  return (
    <>
      {/* Header */}
      <div className="flex justify-between items-center">
        <S className="h-7 w-32" />
        <S className="h-8 w-8 rounded-full" />
      </div>
      {/* Search */}
      <S className="h-11 rounded-xl" />
      {/* Filter chips */}
      <div className="flex gap-2">
        <S className="h-8 w-20 rounded-full" />
        <S className="h-8 w-24 rounded-full" />
        <S className="h-8 w-16 rounded-full" />
      </div>
      {/* List */}
      <div className="space-y-2 mt-1">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <S className="h-11 w-11 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <S className="h-4 w-3/4" />
              <S className="h-3 w-1/2" />
            </div>
            <S className="h-6 w-14 rounded-full" />
          </div>
        ))}
      </div>
    </>
  );
}

function CalendarSkeleton() {
  return (
    <>
      {/* Header */}
      <div className="flex justify-between items-center">
        <S className="h-7 w-36" />
        <S className="h-8 w-8 rounded-full" />
      </div>
      {/* Month nav */}
      <div className="flex items-center justify-center gap-4 mt-2">
        <S className="h-8 w-8 rounded-full" />
        <S className="h-6 w-28" />
        <S className="h-8 w-8 rounded-full" />
      </div>
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1.5 mt-3">
        {[...Array(7)].map((_, i) => (
          <S key={`h${i}`} className="h-4 rounded" />
        ))}
        {[...Array(35)].map((_, i) => (
          <S key={i} className="h-10 rounded-lg" />
        ))}
      </div>
      {/* Events */}
      <div className="space-y-2 mt-4">
        {[...Array(3)].map((_, i) => (
          <S key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </>
  );
}

function DetailSkeleton() {
  return (
    <>
      {/* Back button */}
      <S className="h-8 w-8 rounded-full" />
      {/* Profile */}
      <div className="flex items-center gap-4 mt-2">
        <S className="h-16 w-16 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <S className="h-6 w-40" />
          <S className="h-4 w-28" />
        </div>
      </div>
      {/* Info card */}
      <S className="h-28 rounded-2xl mt-3" />
      {/* Tabs */}
      <div className="flex gap-2 mt-3">
        <S className="h-10 flex-1 rounded-xl" />
        <S className="h-10 flex-1 rounded-xl" />
      </div>
      {/* Content */}
      <div className="space-y-2 mt-3">
        {[...Array(4)].map((_, i) => (
          <S key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </>
  );
}

export default GymLoader;
