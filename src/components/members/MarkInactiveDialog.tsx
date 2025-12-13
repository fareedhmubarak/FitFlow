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
            className="fixed inset-0 z-[201] flex items-center justify-center p-4"
            style={{ paddingBottom: 'max(5rem, calc(env(safe-area-inset-bottom) + 4rem))' }}
            onClick={handleClose}
          >
            <div 
              className="relative w-[90vw] max-w-[340px] max-h-[80vh] overflow-y-auto rounded-2xl shadow-2xl bg-white"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/60 bg-slate-50/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <UserMinus className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Mark as Inactive</h3>
                    <p className="text-xs text-slate-500">{memberName}</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-slate-500" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4">
                {/* Warning */}
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 mb-4">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    This will mark the member as inactive. To reactivate, you'll need to record a new payment.
                  </p>
                </div>

                {/* Reason Selection */}
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Reason for deactivation <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedReason}
                    onChange={(e) => {
                      setSelectedReason(e.target.value);
                      setError('');
                    }}
                    className="w-full px-3 py-2.5 rounded-xl text-sm bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400"
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
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Additional Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any additional details..."
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl text-sm bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={handleClose}
                    disabled={isLoading}
                    className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={isLoading || !selectedReason}
                    className="flex-1 py-3 px-4 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30 transition-all hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
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
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export { INACTIVE_REASONS };
