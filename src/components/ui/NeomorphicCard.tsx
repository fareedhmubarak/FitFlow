import React from 'react';
import { cn } from '@/lib/utils';

interface NeomorphicCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'raised' | 'inset' | 'flat';
  children: React.ReactNode;
}

export const NeomorphicCard: React.FC<NeomorphicCardProps> = ({ 
  className, 
  variant = 'raised', 
  children, 
  ...props 
}) => {
  const baseStyles = "rounded-[24px] transition-all duration-300";
  
  const variants = {
    raised: "bg-[#E8F4F9] shadow-[6px_6px_12px_rgba(163,177,198,0.3),-6px_-6px_12px_rgba(255,255,255,0.8)]",
    inset: "bg-[#E8F4F9] shadow-[inset_4px_4px_8px_rgba(163,177,198,0.2),inset_-4px_-4px_8px_rgba(255,255,255,0.5)]",
    flat: "bg-white/60 backdrop-blur-md border border-white/40 shadow-sm"
  };

  return (
    <div className={cn(baseStyles, variants[variant], className)} {...props}>
      {children}
    </div>
  );
};
