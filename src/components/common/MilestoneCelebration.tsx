import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Users, IndianRupee, Star, Sparkles } from 'lucide-react';
import { haptics } from '../../lib/haptics';

interface MilestoneCelebrationProps {
  show: boolean;
  type: 'members' | 'revenue';
  value: number;
  label: string;
  onDone: () => void;
}

const milestoneColors = {
  members: { from: '#3b82f6', to: '#06b6d4', gradient: 'from-blue-500 to-cyan-500' },
  revenue: { from: '#10b981', to: '#f59e0b', gradient: 'from-emerald-500 to-amber-500' },
};

/**
 * Full-screen milestone celebration — 3s auto-dismiss.
 * Shows for: 25/50/100/200/500 members, ₹10K/50K/1L/5L/10L revenue
 */
export default function MilestoneCelebration({ show, type, value, label, onDone }: MilestoneCelebrationProps) {
  const [confetti] = useState(() =>
    Array.from({ length: 32 }).map((_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 300,
      y: -200 - Math.random() * 100,
      yEnd: 200 + Math.random() * 150,
      rotate: Math.random() * 720 - 360,
      delay: Math.random() * 0.5,
      size: 6 + Math.random() * 8,
      color: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'][
        Math.floor(Math.random() * 7)
      ],
      shape: Math.random() > 0.5 ? 'circle' : 'rect',
    }))
  );

  const stableDone = useCallback(onDone, [onDone]);

  useEffect(() => {
    if (show) {
      haptics.success();
      const t = setTimeout(stableDone, 3200);
      return () => clearTimeout(t);
    }
  }, [show, stableDone]);

  const colors = milestoneColors[type];
  const Icon = type === 'members' ? Users : IndianRupee;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[10000] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
        >
          {/* Dark backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Confetti rain */}
          {confetti.map((c) => (
            <motion.div
              key={c.id}
              className={`absolute ${c.shape === 'circle' ? 'rounded-full' : 'rounded-sm'}`}
              style={{
                width: c.size,
                height: c.shape === 'rect' ? c.size * 0.4 : c.size,
                background: c.color,
                left: '50%',
              }}
              initial={{ x: c.x, y: c.y, rotate: 0, opacity: 1 }}
              animate={{
                y: c.yEnd,
                rotate: c.rotate,
                opacity: [1, 1, 0.6, 0],
              }}
              transition={{ duration: 2.5, delay: c.delay, ease: [0.2, 0, 0.6, 1] }}
            />
          ))}

          {/* Center content */}
          <motion.div
            className="relative z-10 flex flex-col items-center text-center px-8"
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 250, damping: 18 }}
          >
            {/* Trophy with glow */}
            <motion.div className="relative">
              <motion.div
                className="absolute inset-[-20px] rounded-full blur-2xl"
                style={{ background: colors.from, opacity: 0.3 }}
                animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                className={`w-28 h-28 rounded-full bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-2xl`}
                initial={{ rotateY: -180 }}
                animate={{ rotateY: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
              >
                <Trophy className="w-14 h-14 text-white drop-shadow-lg" strokeWidth={1.8} />
              </motion.div>
              
              {/* Sparkles */}
              <motion.div
                className="absolute -top-3 -right-3"
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1], rotate: [0, 15, 0] }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <Sparkles className="w-8 h-8 text-yellow-400 drop-shadow-lg" />
              </motion.div>
              <motion.div
                className="absolute -bottom-2 -left-3"
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ delay: 0.6, duration: 0.4 }}
              >
                <Star className="w-6 h-6 text-yellow-300 fill-yellow-300 drop-shadow" />
              </motion.div>
            </motion.div>

            {/* Milestone text */}
            <motion.p
              className="mt-5 text-sm font-semibold uppercase tracking-widest text-white/70"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              🎉 Milestone Reached!
            </motion.p>

            <motion.div
              className="mt-3 flex items-center gap-2"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.45, type: 'spring', stiffness: 280 }}
            >
              <Icon className="w-8 h-8 text-white" />
              <span className="text-5xl font-black text-white tabular-nums drop-shadow-2xl">
                {type === 'revenue'
                  ? value >= 100000 ? `${(value / 100000).toFixed(value % 100000 === 0 ? 0 : 1)}L` : `${(value / 1000).toFixed(0)}K`
                  : value.toLocaleString('en-IN')}
              </span>
            </motion.div>

            <motion.p
              className="mt-2 text-base font-medium text-white/80"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              {label}
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Helper: Check if a value hits a milestone ──
export const MEMBER_MILESTONES = [25, 50, 100, 200, 500, 1000];
export const REVENUE_MILESTONES = [10000, 50000, 100000, 500000, 1000000];

/** Returns milestone value if total just crossed one, else null */
export function checkMilestone(total: number, milestones: number[]): number | null {
  // Find the highest milestone that the total has reached
  for (let i = milestones.length - 1; i >= 0; i--) {
    if (total >= milestones[i] && total < milestones[i] + 5) {
      // Within 5 of the milestone = just hit it
      return milestones[i];
    }
  }
  return null;
}
