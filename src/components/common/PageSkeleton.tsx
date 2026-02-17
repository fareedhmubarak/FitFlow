import { motion } from 'framer-motion';

// ── Shimmer block ────────────────────────────────────────
function Shimmer({ className = '' }: { className?: string }) {
  return (
    <div className={`skeleton-shimmer rounded-xl ${className}`} />
  );
}

// ── Default page skeleton (used as Suspense fallback) ───
export default function PageSkeleton({ variant = 'default' }: { variant?: 'default' | 'dashboard' | 'list' | 'detail' }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="p-4 space-y-4 min-h-screen"
    >
      {variant === 'dashboard' && <DashboardSkeleton />}
      {variant === 'list' && <ListSkeleton />}
      {variant === 'detail' && <DetailSkeleton />}
      {variant === 'default' && <DefaultSkeleton />}
    </motion.div>
  );
}

function DefaultSkeleton() {
  return (
    <>
      {/* Header area */}
      <Shimmer className="h-8 w-48" />
      <Shimmer className="h-4 w-32" />
      {/* Cards */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <Shimmer className="h-24" />
        <Shimmer className="h-24" />
        <Shimmer className="h-24" />
        <Shimmer className="h-24" />
      </div>
      {/* List */}
      <div className="space-y-3 mt-4">
        {[...Array(4)].map((_, i) => (
          <Shimmer key={i} className="h-16" />
        ))}
      </div>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <>
      {/* Greeting */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Shimmer className="h-7 w-40" />
          <Shimmer className="h-4 w-56" />
        </div>
        <Shimmer className="h-10 w-10 rounded-full" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <Shimmer className="h-28 rounded-2xl" />
        <Shimmer className="h-28 rounded-2xl" />
        <Shimmer className="h-28 rounded-2xl" />
        <Shimmer className="h-28 rounded-2xl" />
      </div>

      {/* Due today section */}
      <Shimmer className="h-6 w-32" />
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <Shimmer key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    </>
  );
}

function ListSkeleton() {
  return (
    <>
      {/* Search bar */}
      <Shimmer className="h-11 rounded-xl" />
      {/* Filter chips */}
      <div className="flex gap-2">
        <Shimmer className="h-8 w-20 rounded-full" />
        <Shimmer className="h-8 w-24 rounded-full" />
        <Shimmer className="h-8 w-16 rounded-full" />
      </div>
      {/* List items */}
      <div className="space-y-3 mt-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Shimmer className="h-12 w-12 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Shimmer className="h-4 w-3/4" />
              <Shimmer className="h-3 w-1/2" />
            </div>
            <Shimmer className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </>
  );
}

function DetailSkeleton() {
  return (
    <>
      {/* Profile header */}
      <div className="flex items-center gap-4">
        <Shimmer className="h-16 w-16 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Shimmer className="h-6 w-40" />
          <Shimmer className="h-4 w-28" />
        </div>
      </div>
      {/* Info cards */}
      <Shimmer className="h-32 rounded-2xl" />
      <Shimmer className="h-24 rounded-2xl" />
      {/* Tabs/actions */}
      <div className="flex gap-2">
        <Shimmer className="h-10 flex-1 rounded-xl" />
        <Shimmer className="h-10 flex-1 rounded-xl" />
      </div>
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Shimmer key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </>
  );
}

// ── Inline skeleton for use within pages (while data loads) ───
export function InlineSkeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded ${className}`} />;
}

// ── Card skeleton for dashboard stats ────────────────────
export function StatCardSkeleton() {
  return (
    <div className="p-4 rounded-2xl bg-card border border-border/50">
      <div className="flex justify-between items-start">
        <div className="space-y-2 flex-1">
          <Shimmer className="h-3 w-20" />
          <Shimmer className="h-8 w-16" />
          <Shimmer className="h-3 w-24" />
        </div>
        <Shimmer className="h-10 w-10 rounded-xl" />
      </div>
    </div>
  );
}
