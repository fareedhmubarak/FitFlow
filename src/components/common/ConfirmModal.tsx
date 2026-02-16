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
 * Theme: Light theme matching other popups
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
          iconBg: 'bg-red-100',
          iconColor: 'text-red-500',
          buttonStyle: { background: '#ff3b30' },
          Icon: AlertTriangle
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-100',
          iconColor: 'text-amber-600',
          buttonStyle: { background: '#1c1c1e' },
          Icon: AlertCircle
        };
      case 'info':
      default:
        return {
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          buttonStyle: { background: '#1c1c1e' },
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
            className="fixed inset-0 z-[100]"
            style={{ background: 'rgba(0,0,0,0.18)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
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
            {/* Modal Card - Light Theme */}
            <div 
              className="w-[90vw] max-w-[340px] rounded-3xl shadow-2xl overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(40px) saturate(180%)', WebkitBackdropFilter: 'blur(40px) saturate(180%)', border: '0.5px solid rgba(255,255,255,0.5)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-4 pt-4 pb-3 border-b" style={{ borderColor: 'rgba(120,120,128,0.1)' }}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl ${styles.iconBg} flex items-center justify-center flex-shrink-0`}>
                    <IconComponent className={`w-5 h-5 ${styles.iconColor}`} />
                  </div>
                  <div className="flex-1 pr-6">
                    <h3 className="text-sm font-bold text-slate-800 leading-tight">{title}</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{message}</p>
                  </div>
                  <button
                    onClick={onClose}
                    disabled={isLoading}
                    className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Footer with buttons */}
              <div className="px-4 py-4 flex gap-3">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-200 disabled:opacity-50"
                >
                  {cancelText}
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isLoading}
                  className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ ...styles.buttonStyle, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
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
