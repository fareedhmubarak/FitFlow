import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, MessageCircle, Phone, CreditCard, Power, Edit, Eye, ChevronRight } from 'lucide-react';

type ButtonVariant = 'whatsapp' | 'call' | 'payment' | 'danger' | 'primary' | 'secondary' | 'ghost';

interface ActionButtonProps {
  variant?: ButtonVariant;
  icon?: LucideIcon;
  label?: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
}

/**
 * ActionButton - Gradient action buttons with consistent styling
 * 
 * Variants:
 * - whatsapp: green gradient
 * - call: blue gradient  
 * - payment: purple gradient
 * - danger: red gradient
 * - primary: emerald gradient
 * - secondary: gray with border
 * - ghost: transparent with hover
 */

const variantStyles: Record<ButtonVariant, string> = {
  whatsapp: 'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-lg shadow-green-400/30',
  call: 'bg-gradient-to-br from-blue-400 to-cyan-500 text-white shadow-lg shadow-blue-400/30',
  payment: 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-purple-400/30',
  danger: 'bg-gradient-to-br from-red-400 to-rose-500 text-white shadow-lg shadow-red-400/30',
  primary: 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-400/30',
  secondary: 'bg-white/30 backdrop-blur-md border border-white/40 text-gray-700',
  ghost: 'bg-transparent hover:bg-white/20 text-gray-600',
};

const sizeStyles = {
  sm: 'px-2.5 py-1.5 text-[10px] gap-1',
  md: 'px-3 py-2 text-xs gap-1.5',
  lg: 'px-4 py-2.5 text-sm gap-2',
};

const iconSizes = {
  sm: 'w-3 h-3',
  md: 'w-3.5 h-3.5',
  lg: 'w-4 h-4',
};

export function ActionButton({
  variant = 'primary',
  icon: Icon,
  label,
  onClick,
  disabled = false,
  loading = false,
  size = 'md',
  fullWidth = false,
  className = ''
}: ActionButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        rounded-xl font-semibold flex items-center justify-center
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {loading ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className={`${iconSizes[size]} border-2 border-current border-t-transparent rounded-full`}
        />
      ) : Icon ? (
        <Icon className={iconSizes[size]} />
      ) : null}
      {label && <span>{label}</span>}
    </motion.button>
  );
}

interface IconButtonProps {
  icon: LucideIcon;
  onClick?: () => void;
  variant?: 'glass' | 'solid' | 'ghost';
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
}

const iconButtonSizes = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
};

const iconButtonIconSizes = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

/**
 * IconButton - Compact icon-only buttons
 */
export function IconButton({
  icon: Icon,
  onClick,
  variant = 'glass',
  color = 'text-gray-600',
  size = 'md',
  className = '',
  disabled = false
}: IconButtonProps) {
  const variantClasses = {
    glass: 'bg-white/20 backdrop-blur-md border border-white/30 hover:bg-white/30',
    solid: 'bg-white shadow-md hover:shadow-lg',
    ghost: 'hover:bg-white/20',
  };

  return (
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.9 }}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${iconButtonSizes[size]}
        ${variantClasses[variant]}
        rounded-xl flex items-center justify-center
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      <Icon className={`${iconButtonIconSizes[size]} ${color}`} />
    </motion.button>
  );
}

// Preset buttons for common actions
export const WhatsAppButton = (props: Omit<ActionButtonProps, 'variant' | 'icon'>) => (
  <ActionButton variant="whatsapp" icon={MessageCircle} {...props} />
);

export const CallButton = (props: Omit<ActionButtonProps, 'variant' | 'icon'>) => (
  <ActionButton variant="call" icon={Phone} {...props} />
);

export const PaymentButton = (props: Omit<ActionButtonProps, 'variant' | 'icon'>) => (
  <ActionButton variant="payment" icon={CreditCard} {...props} />
);

export const DeactivateButton = (props: Omit<ActionButtonProps, 'variant' | 'icon'>) => (
  <ActionButton variant="danger" icon={Power} {...props} />
);

export const EditButton = (props: Omit<ActionButtonProps, 'variant' | 'icon'>) => (
  <ActionButton variant="secondary" icon={Edit} {...props} />
);

export const ViewButton = (props: Omit<ActionButtonProps, 'variant' | 'icon'>) => (
  <ActionButton variant="ghost" icon={Eye} {...props} />
);

export const NextButton = (props: Omit<ActionButtonProps, 'variant' | 'icon'>) => (
  <ActionButton variant="primary" icon={ChevronRight} {...props} />
);

export default ActionButton;
