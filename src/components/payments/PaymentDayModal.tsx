import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Loader2 } from 'lucide-react';
import { usePaymentsByDate } from '../../hooks/usePayments';

interface PaymentDayModalProps {
  date: string;
  onClose: () => void;
}

export default function PaymentDayModal({ date, onClose }: PaymentDayModalProps) {
  const { t } = useTranslation();
  const { data: payments, isLoading } = usePaymentsByDate(date);

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      succeeded: 'bg-emerald-100 text-emerald-700',
      pending: 'bg-amber-100 text-amber-700',
      failed: 'bg-red-100 text-red-700',
    };

    return (
      <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${colors[status] || colors.pending}`}>
        {t(`payments.status.${status}`)}
      </span>
    );
  };

  const totalAmount = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const paidCount = payments?.filter((p) => p.status === 'succeeded').length || 0;
  const pendingCount = payments?.filter((p) => p.status === 'pending' || p.status === 'failed').length || 0;

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
      />

      {/* Modal - Compact, Centered, Light Theme with Green Header */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed inset-0 z-[201] flex items-center justify-center p-4"
        style={{ paddingBottom: 'max(5rem, calc(env(safe-area-inset-bottom) + 4rem))' }}
        onClick={onClose}
      >
        <div 
          className="w-[90vw] max-w-[340px] max-h-[75vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col bg-white"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - Green Gradient */}
          <div className="relative bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2.5 shrink-0">
            <button
              onClick={onClose}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>

            <div className="flex items-center gap-2 text-white/80 text-[9px] font-semibold tracking-wider">
              <Calendar className="w-2.5 h-2.5" />
              PAYMENTS
            </div>
            <h3 className="text-sm font-bold text-white">
              {format(new Date(date), 'MMMM d, yyyy')}
            </h3>
            <p className="text-[10px] text-white/70 mt-0.5">
              {payments?.length || 0} {t('payments.calendar.membersWithPayments')}
            </p>
          </div>

          {/* Summary Stats - Compact Row */}
          <div className="flex divide-x divide-slate-100 bg-slate-50 border-b border-slate-100 shrink-0">
            <div className="flex-1 p-2 text-center">
              <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Total</p>
              <p className="text-xs font-bold text-slate-800">₹{totalAmount.toLocaleString('en-IN')}</p>
            </div>
            <div className="flex-1 p-2 text-center">
              <p className="text-[9px] uppercase tracking-wider text-emerald-500 font-bold">Paid</p>
              <p className="text-xs font-bold text-emerald-600">{paidCount}</p>
            </div>
            <div className="flex-1 p-2 text-center">
              <p className="text-[9px] uppercase tracking-wider text-amber-500 font-bold">Pending</p>
              <p className="text-xs font-bold text-amber-600">{pendingCount}</p>
            </div>
          </div>

          {/* Payments List - Scrollable */}
          <div className="flex-1 overflow-y-auto p-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
              </div>
            ) : payments && payments.length > 0 ? (
              <div className="space-y-1.5">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Member Avatar */}
                      {payment.member?.photo_url ? (
                        <img
                          src={payment.member.photo_url}
                          alt={payment.member.full_name}
                          className="w-8 h-8 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {payment.member?.full_name?.charAt(0) || 'M'}
                        </div>
                      )}

                      {/* Member Info */}
                      <div className="min-w-0">
                        <p className="font-semibold text-xs text-slate-800 truncate">
                          {payment.member?.full_name || 'Unknown'}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {payment.member?.phone}
                        </p>
                      </div>
                    </div>

                    {/* Payment Info */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="font-bold text-xs text-slate-800">
                          ₹{Number(payment.amount).toLocaleString('en-IN')}
                        </p>
                        <p className="text-[9px] text-slate-400 capitalize">
                          {payment.payment_method}
                        </p>
                      </div>
                      {getStatusBadge(payment.status)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">
                  {t('payments.calendar.noPaymentsDue')}
                </p>
              </div>
            )}
          </div>

          {/* Footer - Compact */}
          <div className="px-3 py-2.5 border-t border-slate-100 bg-slate-50/80 shrink-0">
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-emerald-500 to-teal-500 shadow-md shadow-emerald-500/30 transition-all hover:from-emerald-600 hover:to-teal-600"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
