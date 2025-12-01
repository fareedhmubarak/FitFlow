import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePayments } from '../../hooks/usePayments';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Search, Calendar, DollarSign, CreditCard, Banknote } from 'lucide-react';
import { GymLoader } from '@/components/ui/GymLoader';

export default function PaymentsList() {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: payments, isLoading } = usePayments();

  // Filter payments
  const filteredPayments = payments?.filter((payment) => {
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    const matchesSearch =
      searchTerm === '' ||
      payment.member?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.member?.last_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'paid', label: 'Paid' },
    { key: 'pending', label: 'Pending' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  if (isLoading) {
    return <GymLoader message="Loading payments..." />;
  }

  const totalAmount = filteredPayments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  const paidAmount = filteredPayments?.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0) || 0;

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#E0F2FE] flex flex-col overflow-hidden">
      {/* Safe Area Background Extensions */}
      <div className="fixed top-0 left-0 right-0 h-[env(safe-area-inset-top)] bg-[#E0F2FE] z-[200]" />
      <div className="fixed bottom-0 left-0 right-0 h-[env(safe-area-inset-bottom)] bg-[#E0F2FE] z-[200]" />

      {/* Background Blobs */}
      <motion.div
        animate={{
          x: [0, 80, -60, 0],
          y: [0, -60, 40, 0],
          scale: [1, 1.2, 0.9, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut"
        }}
        className="absolute top-[-10%] left-[-10%] w-[60%] h-[50%] bg-[#6EE7B7] rounded-full blur-[80px] opacity-50 pointer-events-none"
      />
      <motion.div
        animate={{
          x: [0, -60, 80, 0],
          y: [0, 70, -40, 0],
          scale: [1, 1.3, 0.85, 1],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut"
        }}
        className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[50%] bg-[#FCA5A5] rounded-full blur-[80px] opacity-50 pointer-events-none"
      />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 px-5 pb-3 relative z-10"
        style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center justify-between mb-4">
          <Link to="/dashboard">
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 rounded-full bg-white/60 backdrop-blur-md border border-white/40 shadow-sm flex items-center justify-center text-[#1e293b]"
            >
              <ChevronLeft className="w-5 h-5" />
            </motion.button>
          </Link>
          <div className="text-center">
            <h1 className="text-xl font-bold text-[#0f172a]">{t('payments.title')}</h1>
          </div>
          <div className="w-10" />
        </div>

        {/* Search Bar */}
        <div className="relative mb-3">
          <input
            type="text"
            placeholder={t('common.search') + '...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 pl-11 rounded-[18px] bg-white/60 backdrop-blur-xl border border-white/40 text-[#0f172a] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-sm text-sm"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
          {filters.map((filter) => (
            <motion.button
              key={filter.key}
              whileTap={{ scale: 0.95 }}
              onClick={() => setStatusFilter(filter.key)}
              className={`px-3 py-1.5 rounded-full font-semibold text-xs whitespace-nowrap transition-all ${
                statusFilter === filter.key
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-md'
                  : 'bg-white/60 text-slate-600 hover:bg-white/80'
              }`}
            >
              {filter.label}
            </motion.button>
          ))}
        </div>
      </motion.header>

      {/* Stats Bar */}
      <div className="flex-shrink-0 px-5 pb-3 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/40 backdrop-blur-xl rounded-[20px] p-4 shadow-lg border border-white/50"
        >
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <p className="text-[10px] text-[#64748b] uppercase tracking-wider font-bold">Total</p>
              <p className="text-2xl font-bold text-[#0f172a]">₹{totalAmount.toLocaleString('en-IN')}</p>
            </div>
            <div className="w-px h-10 bg-white/40"></div>
            <div className="text-center flex-1">
              <p className="text-[10px] text-[#64748b] uppercase tracking-wider font-bold">Paid</p>
              <p className="text-2xl font-bold text-emerald-600">₹{paidAmount.toLocaleString('en-IN')}</p>
            </div>
            <div className="w-px h-10 bg-white/40"></div>
            <div className="text-center flex-1">
              <p className="text-[10px] text-[#64748b] uppercase tracking-wider font-bold">Count</p>
              <p className="text-2xl font-bold text-[#0f172a]">{filteredPayments?.length || 0}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Payments List */}
      <div className="flex-1 px-5 overflow-y-auto pb-2 scrollbar-hide relative z-0" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
        {filteredPayments && filteredPayments.length > 0 ? (
          <div className="space-y-3 pb-4">
            <AnimatePresence>
              {filteredPayments.map((payment, index) => (
                <motion.div
                  key={payment.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  className="bg-white/60 backdrop-blur-md rounded-[16px] p-4 shadow-sm border border-white/50 hover:bg-white/80 transition-all"
                >
                  {/* Member Info */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                        {payment.member
                          ? payment.member.first_name.charAt(0) + payment.member.last_name.charAt(0)
                          : '??'}
                      </div>
                      <div>
                        <Link
                          to={`/members/${payment.member_id}`}
                          className="font-bold text-[#0f172a] hover:text-emerald-600 text-sm"
                        >
                          {payment.member
                            ? `${payment.member.first_name} ${payment.member.last_name}`
                            : 'N/A'}
                        </Link>
                        <p className="text-[10px] text-[#64748b]">
                          {payment.payment_method ? (
                            <span className="capitalize">{payment.payment_method}</span>
                          ) : (
                            <span>-</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-[#0f172a]">₹{payment.amount.toLocaleString('en-IN')}</p>
                      <span
                        className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded-full border mt-1 ${getStatusColor(
                          payment.status
                        )}`}
                      >
                        {t(`payments.status.${payment.status}`)}
                      </span>
                    </div>
                  </div>

                  {/* Date Info */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/40 rounded-xl p-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Calendar className="w-3 h-3 text-[#64748b]" />
                        <p className="text-[9px] text-[#64748b] uppercase font-bold">Due Date</p>
                      </div>
                      <p className="text-xs font-bold text-[#0f172a]">
                        {new Date(payment.due_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="bg-white/40 rounded-xl p-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <DollarSign className="w-3 h-3 text-[#64748b]" />
                        <p className="text-[9px] text-[#64748b] uppercase font-bold">Paid Date</p>
                      </div>
                      <p className="text-xs font-bold text-[#0f172a]">
                        {payment.paid_date
                          ? new Date(payment.paid_date).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })
                          : '-'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-20 h-20 bg-white/40 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">{t('payments.noPayments')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
