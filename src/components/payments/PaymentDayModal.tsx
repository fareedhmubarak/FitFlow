import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
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
      succeeded: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status] || colors.pending}`}>
        {t(`payments.status.${status}`)}
      </span>
    );
  };

  const totalAmount = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const paidCount = payments?.filter((p) => p.status === 'succeeded').length || 0;
  const pendingCount = payments?.filter((p) => p.status === 'pending' || p.status === 'failed').length || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {format(new Date(date), 'MMMM d, yyyy')}
              </h2>
              <p className="mt-1 text-gray-500 dark:text-gray-400">
                {payments?.length || 0} {t('payments.calendar.membersWithPayments')}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <span className="text-2xl">✕</span>
            </button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('payments.calendar.totalAmount')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                ₹{totalAmount.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
              <p className="text-sm text-green-600 dark:text-green-400">Paid</p>
              <p className="text-xl font-bold text-green-900 dark:text-green-200">{paidCount}</p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">Pending</p>
              <p className="text-xl font-bold text-yellow-900 dark:text-yellow-200">{pendingCount}</p>
            </div>
          </div>
        </div>

        {/* Payments List */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : payments && payments.length > 0 ? (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {/* Member Avatar */}
                    {payment.member?.photo_url ? (
                      <img
                        src={payment.member.photo_url}
                        alt={payment.member.full_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                        {payment.member?.full_name?.charAt(0) || 'M'}
                      </div>
                    )}

                    {/* Member Info */}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {payment.member?.full_name || 'Unknown Member'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {payment.member?.member_number} • {payment.member?.phone}
                      </p>
                    </div>
                  </div>

                  {/* Payment Info */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-gray-900 dark:text-white">
                        ₹{Number(payment.amount).toLocaleString('en-IN')}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {payment.payment_method}
                      </p>
                    </div>
                    {getStatusBadge(payment.status)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📅</div>
              <p className="text-gray-500 dark:text-gray-400">
                {t('payments.calendar.noPaymentsDue')}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {payments && payments.length > 0 && pendingCount > 0 && (
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {t('common.close')}
            </button>
            <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
              📱 {t('payments.calendar.sendRemindersToAll')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
