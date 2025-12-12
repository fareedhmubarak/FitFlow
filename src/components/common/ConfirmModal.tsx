import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Info, AlertCircle, X, Loader2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

/**
 * ConfirmModal - Consistent popup design matching FitFlow design system
 * 
 * Standard width: w-[90vw] max-w-[340px]
 * Animation: spring damping 25, stiffness 400
 * Theme: Dark glass morphism
 */
export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}: ConfirmModalProps) {
  
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-red-500/20 border-red-500/30',
          iconColor: 'text-red-400',
          buttonBg: 'bg-gradient-to-r from-red-500 to-rose-500',
          buttonShadow: 'shadow-red-500/30',
          Icon: AlertTriangle
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-500/20 border-amber-500/30',
          iconColor: 'text-amber-400',
          buttonBg: 'bg-gradient-to-r from-amber-500 to-orange-500',
          buttonShadow: 'shadow-amber-500/30',
          Icon: AlertCircle
        };
      case 'info':
      default:
        return {
          iconBg: 'bg-blue-500/20 border-blue-500/30',
          iconColor: 'text-blue-400',
          buttonBg: 'bg-gradient-to-r from-blue-500 to-cyan-500',
          buttonShadow: 'shadow-blue-500/30',
          Icon: Info
        };
    }
  };

  const styles = getVariantStyles();
  const IconComponent = styles.Icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[100]"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4"
            style={{ paddingBottom: 'max(5rem, calc(env(safe-area-inset-bottom) + 4rem))' }}
            onClick={onClose}
          >
            {/* Modal Card - CONSISTENT WIDTH */}
            <div 
              className="w-[90vw] max-w-[340px] rounded-2xl shadow-2xl overflow-hidden bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700/50"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with close button */}
              <div className="relative px-4 pt-4 pb-3">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="absolute top-3 right-3 w-7 h-7 rounded-full bg-slate-700/50 flex items-center justify-center text-slate-400 hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {/* Icon and Title */}
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl ${styles.iconBg} border flex items-center justify-center flex-shrink-0`}>
                    <IconComponent className={`w-5 h-5 ${styles.iconColor}`} />
                  </div>
                  <div className="flex-1 pr-6">
                    <h3 className="text-sm font-bold text-white leading-tight">{title}</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{message}</p>
                  </div>
                </div>
              </div>

              {/* Footer with buttons */}
              <div className="px-4 pb-4 pt-2 flex gap-2">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-slate-300 bg-slate-700/50 hover:bg-slate-700 transition-colors border border-slate-600 disabled:opacity-50"
                >
                  {cancelText}
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isLoading}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-sm text-white ${styles.buttonBg} shadow-lg ${styles.buttonShadow} transition-all disabled:opacity-50 flex items-center justify-center gap-2`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    confirmText
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
