import { motion, AnimatePresence } from 'framer-motion';
import { Check, Sparkles, IndianRupee, UserPlus } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { haptics } from '../../lib/haptics';

interface SuccessAnimationProps {
  show: boolean;
  message?: string;
  subMessage?: string;
  onComplete?: () => void;
  duration?: number; // ms before auto-dismiss
  variant?: 'default' | 'payment' | 'member';
  /** For payment variant — shows animated ₹ counter */
  amount?: number;
  /** For member variant — plan name */
  planName?: string;
}

// Confetti particle with gravity
const Particle = ({ delay, angle, dist, color, size }: {
  delay: number; angle: number; dist: number; color: string; size: number;
}) => {
  const rad = (angle * Math.PI) / 180;
  return (
    <motion.div
      className="absolute rounded-full"
      style={{ backgroundColor: color, width: size, height: size }}
      initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
      animate={{
        opacity: [1, 0.9, 0],
        scale: [0, 1.4, 0.3],
        x: Math.cos(rad) * dist,
        y: [Math.sin(rad) * dist * 0.5, Math.sin(rad) * dist, Math.sin(rad) * dist + 40], // gravity pull
      }}
      transition={{
        duration: 1,
        delay: delay,
        ease: "easeOut"
      }}
    />
  );
};

// Animated number counter for payment amounts
const AnimatedAmount = ({ amount }: { amount: number }) => {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>();

  useEffect(() => {
    const start = Date.now();
    const dur = 600;
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / dur, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * amount));
      if (progress < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [amount]);

  return (
    <motion.div
      className="flex items-center justify-center gap-1 mt-3"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
    >
      <IndianRupee className="w-5 h-5 text-emerald-300" />
      <span className="text-2xl font-black text-white tabular-nums">
        {display.toLocaleString('en-IN')}
      </span>
    </motion.div>
  );
};

export default function SuccessAnimation({
  show,
  message = "Success!",
  subMessage,
  onComplete,
  duration = 2000,
  variant = 'default',
  amount,
  planName,
}: SuccessAnimationProps) {
  // 24 particles with varied properties
  const [particles] = useState(() => 
    Array.from({ length: 24 }, (_, i) => ({
      id: i,
      delay: 0.1 + Math.random() * 0.15,
      angle: (i / 24) * 360 + (Math.random() - 0.5) * 15,
      dist: 60 + Math.random() * 80,
      size: 4 + Math.random() * 6,
      color: ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444', '#34d399', '#a78bfa'][
        Math.floor(Math.random() * 7)
      ],
    }))
  );

  useEffect(() => {
    if (show) {
      haptics.success();
      if (onComplete) {
        const timer = setTimeout(onComplete, duration);
        return () => clearTimeout(timer);
      }
    }
  }, [show, onComplete, duration]);

  const gradientColors = {
    default: 'from-emerald-500 to-cyan-500',
    payment: 'from-green-500 to-emerald-500',
    member: 'from-blue-500 to-cyan-500'
  };

  const variantIcon = {
    default: <Check className="w-10 h-10 text-white" strokeWidth={3} />,
    payment: <IndianRupee className="w-10 h-10 text-white" strokeWidth={2.5} />,
    member: <UserPlus className="w-10 h-10 text-white" strokeWidth={2.5} />,
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ 
              type: "spring", 
              duration: 0.5,
              bounce: 0.4
            }}
            className="relative flex flex-col items-center"
          >
            {/* Particles with gravity */}
            <div className="absolute inset-0 flex items-center justify-center">
              {particles.map((p) => (
                <Particle key={p.id} {...p} />
              ))}
            </div>

            {/* Expanding glow rings */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0.6 }}
              animate={{ scale: 3, opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`absolute w-20 h-20 rounded-full bg-gradient-to-r ${gradientColors[variant]} blur-xl`}
            />
            <motion.div
              initial={{ scale: 0.5, opacity: 0.4 }}
              animate={{ scale: 2.5, opacity: 0 }}
              transition={{ duration: 0.8, delay: 0.15, ease: 'easeOut' }}
              className={`absolute w-20 h-20 rounded-full bg-gradient-to-r ${gradientColors[variant]} blur-lg`}
            />

            {/* Success circle — stamp-in effect */}
            <motion.div
              initial={{ scale: 2.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 350, damping: 15 }}
              className={`relative w-24 h-24 rounded-full bg-gradient-to-br ${gradientColors[variant]} shadow-2xl flex items-center justify-center`}
            >
              {/* Pulsing ring */}
              <motion.div
                className="absolute inset-[-8px] rounded-full"
                style={{ border: '2px solid rgba(255,255,255,0.3)' }}
                animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
              />

              {/* Variant icon */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 400 }}
              >
                {variantIcon[variant]}
              </motion.div>

              {/* Sparkle icons */}
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="absolute -top-2 -right-2"
              >
                <Sparkles className="w-6 h-6 text-yellow-400 drop-shadow-lg" />
              </motion.div>
              <motion.div
                initial={{ scale: 0, rotate: 45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.6, type: "spring" }}
                className="absolute -bottom-1 -left-2"
              >
                <Sparkles className="w-4 h-4 text-yellow-300 drop-shadow" />
              </motion.div>
            </motion.div>

            {/* Payment amount counter */}
            {variant === 'payment' && amount && <AnimatedAmount amount={amount} />}

            {/* Message */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-5 text-center"
            >
              <h3 className="text-xl font-bold text-white drop-shadow-lg">
                {message}
              </h3>
              {subMessage && (
                <motion.p
                  className="text-sm text-white/80 mt-1 drop-shadow"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  {subMessage}
                </motion.p>
              )}
              {variant === 'member' && planName && (
                <motion.p
                  className="text-sm text-cyan-200 mt-1 font-medium"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  Plan: {planName}
                </motion.p>
              )}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
