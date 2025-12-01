import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  iconColor: string;
  iconBgColor: string;
  label: string;
  value: number | string;
  prefix?: string;
  suffix?: string;
  progress?: number; // 0-100
  progressColor?: string;
  animate?: boolean;
  delay?: number;
  onClick?: () => void;
}

/**
 * StatCard - Glassmorphism stats card with icon, label, value and optional progress bar
 * 
 * Design System:
 * - Background: bg-white/25 backdrop-blur-md
 * - Border: border border-white/40 rounded-2xl
 * - Icon: 24x24 in rounded-lg colored background
 * - Label: text-[10px] font-semibold text-gray-500
 * - Value: text-sm font-extrabold text-gray-800
 * - Progress: h-1 rounded-full gradient
 */
export function StatCard({
  icon: Icon,
  iconColor,
  iconBgColor,
  label,
  value,
  prefix = '',
  suffix = '',
  progress,
  progressColor = 'from-emerald-400 to-teal-500',
  animate = true,
  delay = 0,
  onClick
}: StatCardProps) {
  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 20 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 300, damping: 25 }}
      whileTap={onClick ? { scale: 0.97 } : undefined}
      onClick={onClick}
      className={`bg-white/25 backdrop-blur-md border border-white/40 rounded-2xl p-2.5 shadow-lg ${onClick ? 'cursor-pointer active:bg-white/30' : ''}`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <motion.div 
          className={`w-6 h-6 rounded-lg ${iconBgColor} flex items-center justify-center`}
          animate={animate ? { scale: [1, 1.15, 1] } : undefined}
          transition={{ duration: 2, repeat: Infinity, delay: delay + 0.5 }}
        >
          <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
        </motion.div>
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      
      <AnimatedValue value={value} prefix={prefix} suffix={suffix} animate={animate} />
      
      {progress !== undefined && (
        <div className="mt-2 h-1 bg-gray-200/50 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 1, delay: delay + 0.3, ease: 'easeOut' }}
            className={`h-full bg-gradient-to-r ${progressColor} rounded-full`}
          />
        </div>
      )}
    </motion.div>
  );
}

interface AnimatedValueProps {
  value: number | string;
  prefix?: string;
  suffix?: string;
  animate?: boolean;
  className?: string;
}

function AnimatedValue({ value, prefix = '', suffix = '', animate = true, className = '' }: AnimatedValueProps) {
  const [displayValue, setDisplayValue] = React.useState(animate ? 0 : (typeof value === 'number' ? value : 0));
  
  React.useEffect(() => {
    if (!animate || typeof value !== 'number') {
      setDisplayValue(typeof value === 'number' ? value : 0);
      return;
    }
    
    const duration = 800;
    const steps = 20;
    const increment = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [value, animate]);
  
  return (
    <span className={`text-sm font-extrabold text-gray-800 ${className}`}>
      {prefix}{typeof value === 'number' ? displayValue.toLocaleString('en-IN') : value}{suffix}
    </span>
  );
}

export default StatCard;
