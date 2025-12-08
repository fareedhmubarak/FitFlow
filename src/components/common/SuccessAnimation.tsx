import { motion, AnimatePresence } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SuccessAnimationProps {
  show: boolean;
  message?: string;
  subMessage?: string;
  onComplete?: () => void;
  duration?: number; // ms before auto-dismiss
  variant?: 'default' | 'payment' | 'member';
}

// Confetti particle component
const Particle = ({ delay, x, y, color }: { delay: number; x: number; y: number; color: string }) => (
  <motion.div
    className="absolute w-2 h-2 rounded-full"
    style={{ backgroundColor: color }}
    initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
    animate={{
      opacity: [1, 1, 0],
      scale: [0, 1, 0.5],
      x: x,
      y: y,
    }}
    transition={{
      duration: 0.8,
      delay: delay,
      ease: "easeOut"
    }}
  />
);

export default function SuccessAnimation({
  show,
  message = "Success!",
  subMessage,
  onComplete,
  duration = 1500,
  variant = 'default'
}: SuccessAnimationProps) {
  const [particles] = useState(() => 
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      delay: Math.random() * 0.2,
      x: (Math.random() - 0.5) * 150,
      y: (Math.random() - 0.5) * 150,
      color: ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444'][Math.floor(Math.random() * 5)]
    }))
  );

  useEffect(() => {
    if (show && onComplete) {
      const timer = setTimeout(onComplete, duration);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete, duration]);

  const gradientColors = {
    default: 'from-emerald-500 to-cyan-500',
    payment: 'from-green-500 to-emerald-500',
    member: 'from-blue-500 to-cyan-500'
  };

  console.log('🎬 SuccessAnimation render - show:', show);
  
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm"
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
            {/* Particles */}
            <div className="absolute inset-0 flex items-center justify-center">
              {particles.map((p) => (
                <Particle key={p.id} {...p} />
              ))}
            </div>

            {/* Glow effect */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.8, repeat: 2 }}
              className={`absolute w-24 h-24 rounded-full bg-gradient-to-r ${gradientColors[variant]} blur-xl`}
            />

            {/* Success circle */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", bounce: 0.5 }}
              className={`relative w-20 h-20 rounded-full bg-gradient-to-br ${gradientColors[variant]} shadow-2xl flex items-center justify-center`}
            >
              {/* Check mark with draw animation */}
              <motion.div
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                <Check className="w-10 h-10 text-white" strokeWidth={3} />
              </motion.div>

              {/* Sparkle icons */}
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="absolute -top-2 -right-2"
              >
                <Sparkles className="w-6 h-6 text-yellow-400" />
              </motion.div>
            </motion.div>

            {/* Message */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-6 text-center"
            >
              <h3 className="text-xl font-bold text-white drop-shadow-lg">
                {message}
              </h3>
              {subMessage && (
                <p className="text-sm text-white/80 mt-1 drop-shadow">
                  {subMessage}
                </p>
              )}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
