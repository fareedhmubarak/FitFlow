import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell } from 'lucide-react';
import { useAppReady } from '../contexts/AppReadyContext';

/**
 * Cinematic Gym Splash Screen
 * ────────────────────────────
 * Netflix-quality intro: dark reveal → dumbbell burst → progress bar → zoom-through exit.
 * Theme-aware: uses CSS vars so it adapts to every gym's color scheme.
 *
 * Phases:
 *  1. reveal  (0-0.6s)  — gradient bg appears, center glow pulses up
 *  2. logo    (0.6-1.8s) — dumbbell materializes with particle burst, text types letter-by-letter
 *  3. loading (1.8-2.6s) — progress bar fills, tagline fades in
 *  4. exit    (after data ready or max 4s) — logo scales 3× and fades, revealing dashboard behind
 */
export default function SplashScreen() {
  const { isDataReady, setSplashComplete, shouldShowSplash } = useAppReady();
  const [phase, setPhase] = useState<'reveal' | 'logo' | 'loading' | 'exit'>('reveal');
  const [minReached, setMinReached] = useState(false);
  const exitRef = useRef(false);

  // ── Fade out the HTML pre-splash now that React has painted ──
  useEffect(() => {
    const el = document.getElementById('pre-splash');
    if (el) {
      // Add fade-out class (CSS transition handles the animation)
      el.classList.add('fade-out');
      const t = setTimeout(() => el.remove(), 500);
      return () => clearTimeout(t);
    }
  }, []);

  // ── Phase timers ────────────────────────────────
  useEffect(() => {
    if (!shouldShowSplash) {
      setSplashComplete();
      return;
    }

    const t1 = setTimeout(() => setPhase('logo'), 600);
    const t2 = setTimeout(() => setPhase('loading'), 1800);
    const t3 = setTimeout(() => setMinReached(true), 3500);

    // Safety: force exit after 5s no matter what
    const t4 = setTimeout(() => {
      if (!exitRef.current) {
        exitRef.current = true;
        setPhase('exit');
        setTimeout(setSplashComplete, 500);
      }
    }, 5000);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [shouldShowSplash, setSplashComplete]);

  // ── Exit when data ready + min time elapsed ─────
  useEffect(() => {
    if (!minReached || exitRef.current) return;
    const path = window.location.pathname;
    const isDashboard = path === '/' || path === '';
    if (!isDashboard || isDataReady) {
      exitRef.current = true;
      setPhase('exit');
      setTimeout(setSplashComplete, 500);
    }
  }, [minReached, isDataReady, setSplashComplete]);

  if (!shouldShowSplash) return null;

  const showLogo = phase !== 'reveal';
  const showBar = phase === 'loading' || phase === 'exit';

  return (
    <AnimatePresence>
      {phase !== 'exit' ? (
        <motion.div
          className="fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden"
          exit={{ opacity: 0, scale: 1.3 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* ── Dark-to-theme gradient reveal ───────────── */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            style={{
              background: 'linear-gradient(180deg, var(--theme-blob-1, #6EE7B7) 0%, var(--theme-blob-1, #6EE7B7) 5%, var(--theme-bg, #E0F2FE) 20%, var(--theme-bg, #E0F2FE) 100%)',
            }}
          />

          {/* ── Floating blobs (CSS keyframes for GPU perf) ── */}
          <div
            className="absolute w-[150vw] h-[150vh] rounded-full blur-[120px] animate-blob-1 pointer-events-none"
            style={{ background: 'var(--theme-blob-1, #6EE7B7)', opacity: 0.5 }}
          />
          <div
            className="absolute w-[150vw] h-[150vh] rounded-full blur-[120px] animate-blob-2 pointer-events-none"
            style={{ background: 'var(--theme-blob-2, #FCA5A5)', opacity: 0.35 }}
          />

          {/* ── Center glow pulse ──────────────────────── */}
          <motion.div
            className="absolute w-[60vw] h-[60vw] max-w-[400px] max-h-[400px] rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, var(--theme-primary, #10b981) 0%, transparent 70%)',
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: showBar ? 2.5 : showLogo ? 1.2 : 0,
              opacity: showBar ? 0.35 : showLogo ? 0.25 : 0,
            }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />

          {/* ── Particle burst (16 particles on logo reveal) ── */}
          <AnimatePresence>
            {showLogo && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {Array.from({ length: 16 }).map((_, i) => {
                  const angle = (i / 16) * 360;
                  const rad = (angle * Math.PI) / 180;
                  const dist = 80 + (i % 5) * 15;
                  return (
                    <motion.div
                      key={i}
                      className="absolute w-1.5 h-1.5 rounded-full"
                      style={{
                        background: i % 3 === 0
                          ? 'var(--theme-primary, #10b981)'
                          : i % 3 === 1
                          ? 'var(--theme-blob-1, #6EE7B7)'
                          : 'var(--theme-blob-2, #FCA5A5)',
                      }}
                      initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                      animate={{
                        x: Math.cos(rad) * dist,
                        y: Math.sin(rad) * dist,
                        scale: [0, 1.2, 0],
                        opacity: [1, 0.8, 0],
                      }}
                      transition={{ duration: 0.7, delay: i * 0.02, ease: 'easeOut' }}
                    />
                  );
                })}
              </div>
            )}
          </AnimatePresence>

          {/* ── Logo + Text Container ──────────────────── */}
          <motion.div
            className="relative z-10 flex flex-col items-center"
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{
              scale: showLogo ? 1 : 0.3,
              opacity: showLogo ? 1 : 0,
            }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
          >
            {/* Pulsing ring */}
            <motion.div
              className="absolute w-32 h-32 rounded-3xl pointer-events-none"
              style={{ border: '2px solid var(--theme-primary, #10b981)' }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 0, 0.3],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
            />

            {/* Second ring */}
            <motion.div
              className="absolute w-40 h-40 rounded-3xl pointer-events-none"
              style={{ border: '1.5px solid var(--theme-primary, #10b981)' }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: [1, 1.6, 1],
                opacity: [0.15, 0, 0.15],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.4 }}
            />

            {/* Dumbbell icon */}
            <motion.div
              className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, var(--theme-primary, #10b981) 0%, var(--theme-primary-hover, #059669) 100%)',
              }}
              initial={{ rotateY: -180, scale: 0 }}
              animate={{ rotateY: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.3 }}
            >
              <motion.div
                animate={{ filter: [
                  'drop-shadow(0 0 12px var(--theme-primary, #10b981))',
                  'drop-shadow(0 0 28px var(--theme-primary, #10b981))',
                  'drop-shadow(0 0 12px var(--theme-primary, #10b981))',
                ]}}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <motion.div
                  animate={{ rotateZ: [0, 8, -8, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Dumbbell className="w-12 h-12 text-white" strokeWidth={2.5} />
                </motion.div>
              </motion.div>
            </motion.div>

            {/* App name — letter-by-letter stagger */}
            <motion.div className="mt-5 flex flex-col items-center">
              <motion.div className="flex overflow-hidden">
                {'Haefit'.split('').map((ch, i) => (
                  <motion.span
                    key={i}
                    className="text-4xl font-black tracking-tight"
                    style={{
                      background: 'linear-gradient(135deg, var(--theme-primary, #10b981) 0%, var(--theme-text-primary, #0f172a) 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 + i * 0.06, type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    {ch}
                  </motion.span>
                ))}
              </motion.div>

              <motion.p
                className="text-sm font-medium mt-1"
                style={{ color: 'var(--theme-text-secondary, #475569)' }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: showBar ? 1 : 0, y: showBar ? 0 : 8 }}
                transition={{ duration: 0.4 }}
              >
                Gym Management Made Simple
              </motion.p>
            </motion.div>

            {/* ── Progress bar (replaces bouncing dots) ──── */}
            <motion.div
              className="mt-6 w-44 h-1.5 rounded-full overflow-hidden"
              style={{ background: 'var(--theme-glass-bg, rgba(255,255,255,0.3))' }}
              initial={{ opacity: 0, scaleX: 0.6 }}
              animate={{ opacity: showBar ? 1 : 0, scaleX: showBar ? 1 : 0.6 }}
              transition={{ duration: 0.3 }}
            >
              <div
                className="h-full rounded-full animate-splash-bar"
                style={{ background: 'linear-gradient(90deg, var(--theme-primary, #10b981), var(--theme-secondary, #06b6d4))' }}
              />
            </motion.div>
          </motion.div>

          {/* Bottom fade */}
          <div
            className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none"
            style={{ background: 'linear-gradient(to top, var(--theme-bg, #E0F2FE), transparent)' }}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
