import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, UserMinus } from 'lucide-react';

interface MarkInactiveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, notes: string) => Promise<void>;
  memberName: string;
  isLoading?: boolean;
}

const INACTIVE_REASONS = [
  { key: 'non_payment', label: 'Non-payment / Didn\'t renew' },
  { key: 'moved_away', label: 'Moved to another area' },
  { key: 'health_issues', label: 'Health issues' },
  { key: 'joined_other_gym', label: 'Joined another gym' },
  { key: 'financial', label: 'Financial constraints' },
  { key: 'travel', label: 'Extended travel' },
  { key: 'personal', label: 'Personal reasons' },
  { key: 'other', label: 'Other' },
];

export default function MarkInactiveDialog({
  isOpen,
  onClose,
  onConfirm,
  memberName,
  isLoading = false,
}: MarkInactiveDialogProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (!selectedReason) {
      setError('Please select a reason');
      return;
    }
    setError('');
    await onConfirm(selectedReason, notes);
    // Reset form after successful submission
    setSelectedReason('');
    setNotes('');
  };

  const handleClose = () => {
    setSelectedReason('');
    setNotes('');
    setError('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
            onClick={handleClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto rounded-2xl p-5 shadow-2xl z-[201]"
            style={{ backgroundColor: 'var(--theme-card-bg, rgba(255, 255, 255, 0.98))' }}
          >
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{ backgroundColor: 'var(--theme-glass-bg, rgba(0,0,0,0.05))' }}
            >
              <X className="w-4 h-4" style={{ color: 'var(--theme-text-secondary, #64748b)' }} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <UserMinus className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>
                  Mark as Inactive
                </h3>
                <p className="text-sm" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>
                  {memberName}
                </p>
              </div>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                This will mark the member as inactive. To reactivate, you'll need to record a new payment.
              </p>
            </div>

            {/* Reason Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>
                Reason for deactivation <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedReason}
                onChange={(e) => {
                  setSelectedReason(e.target.value);
                  setError('');
                }}
                className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                style={{
                  backgroundColor: 'var(--theme-input-bg, #fff)',
                  border: '1px solid var(--theme-input-border, #e2e8f0)',
                  color: 'var(--theme-text-primary, #0f172a)',
                }}
              >
                <option value="">Select a reason...</option>
                {INACTIVE_REASONS.map((reason) => (
                  <option key={reason.key} value={reason.key}>
                    {reason.label}
                  </option>
                ))}
              </select>
              {error && (
                <p className="text-xs text-red-500 mt-1">{error}</p>
              )}
            </div>

            {/* Notes */}
            <div className="mb-5">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>
                Additional Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional details..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 resize-none"
                style={{
                  backgroundColor: 'var(--theme-input-bg, #fff)',
                  border: '1px solid var(--theme-input-border, #e2e8f0)',
                  color: 'var(--theme-text-primary, #0f172a)',
                }}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-colors"
                style={{
                  backgroundColor: 'var(--theme-glass-bg, rgba(0,0,0,0.05))',
                  color: 'var(--theme-text-secondary, #64748b)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading || !selectedReason}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold bg-amber-500 text-white transition-all hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : (
                  'Mark Inactive'
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export { INACTIVE_REASONS };
