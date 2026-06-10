import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { haptics } from '../../lib/haptics';
import { ThumbnailImage } from '@/components/common/ThumbnailImage';

interface CheckInSuccessProps {
  /** Member name to display */
  memberName: string;
  /** Optional photo URL */
  memberPhoto?: string | null;
  /** Controls visibility — parent should set false after auto-dismiss */
  show: boolean;
  /** Callback when the overlay finishes and should be removed */
  onDone: () => void;
}

/**
 * Check-In Celebration Overlay
 * ────────────────────────────
 * Non-blocking inline overlay: slides up from bottom, shows green stamp checkmark
 * + member name, auto-dismisses after 2.2s. Fires haptics.heavy().
 */
export default function CheckInSuccess({ memberName, memberPhoto, show, onDone }: CheckInSuccessProps) {
  const [particles] = useState(() =>
    Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      angle: (i / 12) * 360,
      dist: 50 + (i % 4) * 18,
      size: 4 + (i % 3) * 2,
      color: i % 3 === 0 ? '#10b981' : i % 3 === 1 ? '#34d399' : '#6ee7b7',
    }))
  );

  useEffect(() => {
    if (show) {
      haptics.heavy();
      const t = setTimeout(onDone, 2200);
      return () => clearTimeout(t);
    }
  }, [show, onDone]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.3 } }}
        >
          {/* Dimmed backdrop — allows tapping through */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ background: 'rgba(0,0,0,0.25)' }}
          />

          {/* Celebration card */}
          <motion.div
            className="relative z-10 flex flex-col items-center text-center px-6 py-8 mx-4 rounded-3xl backdrop-blur-2xl border"
            style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(6,182,212,0.08))',
              borderColor: 'rgba(16,185,129,0.35)',
              boxShadow: '0 20px 60px -12px rgba(16,185,129,0.3)',
            }}
            initial={{ y: 100, scale: 0.7, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: -40, scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          >
            {/* Particle burst */}
            {particles.map((p) => {
              const rad = (p.angle * Math.PI) / 180;
              return (
                <motion.div
                  key={p.id}
                  className="absolute rounded-full"
                  style={{ width: p.size, height: p.size, background: p.color }}
                  initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                  animate={{
                    x: Math.cos(rad) * p.dist,
                    y: Math.sin(rad) * p.dist,
                    scale: [0, 1.5, 0],
                    opacity: [1, 0.7, 0],
                  }}
                  transition={{ duration: 0.6, delay: 0.15 + p.id * 0.02, ease: 'easeOut' }}
                />
              );
            })}

            {/* Stamp animation — big green checkmark that stamps in */}
            <motion.div
              className="relative"
              initial={{ scale: 3, rotate: -20, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 350, damping: 15, delay: 0.1 }}
            >
              {/* Pulsing glow ring */}
              <motion.div
                className="absolute inset-[-12px] rounded-full"
                style={{ background: 'rgba(16,185,129,0.2)' }}
                animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
              />

              {/* Member photo or checkmark */}
              {memberPhoto ? (
                <div className="relative">
                  <ThumbnailImage
                    src={memberPhoto}
                    name={memberName}
                    alt={memberName}
                    size="md"
                    fallbackClassName="w-20 h-20 rounded-full text-2xl ring-4 ring-emerald-400"
                    className="w-20 h-20 rounded-full ring-4 ring-emerald-400"
                  />
                  <motion.div
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4, type: 'spring', stiffness: 400 }}
                  >
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </motion.div>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-xl">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
              )}
            </motion.div>

            {/* Text */}
            <motion.p
              className="mt-4 text-lg font-bold"
              style={{ color: 'var(--theme-text-primary, #065f46)' }}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Checked In! 💪
            </motion.p>
            <motion.p
              className="text-sm font-medium mt-0.5"
              style={{ color: 'var(--theme-text-secondary, #475569)' }}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Welcome, {memberName}
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
