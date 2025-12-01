import React from 'react';
import { motion } from 'framer-motion';

interface SectionHeaderProps {
  title: string;
  count?: number;
  amount?: number;
  countColor?: string;
  amountColor?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/**
 * SectionHeader - Compact section header with inline count and amount
 * 
 * Design System:
 * - Title: text-[10px] font-bold text-gray-600 uppercase tracking-wider
 * - Count badge: rounded-full with color
 * - Amount: text-xs font-bold with color
 */
export function SectionHeader({
  title,
  count,
  amount,
  countColor = 'bg-gray-200 text-gray-600',
  amountColor = 'text-gray-600',
  icon,
  action,
  className = ''
}: SectionHeaderProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center justify-between mb-2 ${className}`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">{title}</h3>
        {count !== undefined && (
          <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${countColor}`}>
            {count}
          </span>
        )}
        {amount !== undefined && (
          <span className={`text-[10px] font-bold ${amountColor}`}>
            · ₹{amount.toLocaleString('en-IN')}
          </span>
        )}
      </div>
      {action}
    </motion.div>
  );
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/**
 * EmptyState - Empty state placeholder for lists
 */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-8 px-4 text-center"
    >
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-white/30 backdrop-blur-md flex items-center justify-center mb-3">
          {icon}
        </div>
      )}
      <h4 className="text-sm font-semibold text-gray-600 mb-1">{title}</h4>
      {description && (
        <p className="text-[11px] text-gray-500 max-w-[200px]">{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </motion.div>
  );
}

export default SectionHeader;
