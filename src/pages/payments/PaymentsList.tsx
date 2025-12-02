import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePayments } from '../../hooks/usePayments';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Search, Calendar, DollarSign, CreditCard, Banknote } from 'lucide-react';
import { GymLoader } from '@/components/ui/GymLoader';
import UserProfileDropdown from '@/components/common/UserProfileDropdown';

// Animated counter component for dopamine hit
const AnimatedNumber = ({ value, prefix = '', suffix = '', className = '' }: { value: number; prefix?: string; suffix?: string; className?: string }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    const duration = 800;
    const steps = 20;
    const increment = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [value]);
  
  return <span className={className}>{prefix}{displayValue.toLocaleString('en-IN')}{suffix}</span>;
};

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
    <div className="fixed inset-0 w-screen h-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--theme-bg, #E0F2FE)' }}>
      {/* Static gradient blobs - CSS animation for better performance */}
      <div 
        className="fixed top-[-15%] left-[-15%] w-[70%] h-[55%] rounded-full blur-3xl opacity-40 pointer-events-none z-0 animate-blob" 
        style={{ backgroundColor: 'var(--theme-blob-1, #6EE7B7)' }}
      />
      <div 
        className="fixed bottom-[-15%] right-[-15%] w-[70%] h-[55%] rounded-full blur-3xl opacity-40 pointer-events-none z-0 animate-blob animation-delay-4000" 
        style={{ backgroundColor: 'var(--theme-blob-2, #FCA5A5)' }}
      />

      {/* Header - Line 1: Logo | Title | Profile */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 px-4 pb-3 relative z-10"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center justify-between mb-3">
          <Link to="/">
            <motion.div
              whileTap={{ scale: 0.95 }}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg"
            >
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z"/>
              </svg>
            </motion.div>
          </Link>
          <div className="text-center">
            <h1 className="text-lg font-bold" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>{t('payments.title')}</h1>
          </div>
          <UserProfileDropdown />
        </div>

        {/* Header - Line 2: Search Bar */}
        <div className="relative mb-3">
          <input
            type="text"
            placeholder={t('common.search') + '...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 pl-11 rounded-[18px] backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-sm text-sm"
            style={{ 
              backgroundColor: 'var(--theme-input-bg, rgba(255,255,255,0.6))', 
              borderColor: 'var(--theme-input-border, rgba(255,255,255,0.4))',
              borderWidth: '1px',
              color: 'var(--theme-text-primary, #0f172a)'
            }}
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--theme-text-muted, #94a3b8)' }} />
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
                  : ''
              }`}
              style={statusFilter !== filter.key ? { 
                backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.6))', 
                color: 'var(--theme-text-secondary, #64748b)'
              } : undefined}
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
          className="backdrop-blur-xl rounded-[20px] p-4 shadow-lg"
          style={{ 
            backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.4))', 
            borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.5))',
            borderWidth: '1px'
          }}
        >
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--theme-text-muted, #64748b)' }}>Total</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--theme-text-primary, #0f172a)' }}><AnimatedNumber value={totalAmount} prefix="₹" /></p>
            </div>
            <div className="w-px h-10" style={{ backgroundColor: 'var(--theme-glass-border, rgba(255,255,255,0.4))' }}></div>
            <div className="text-center flex-1">
              <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--theme-text-muted, #64748b)' }}>Paid</p>
              <p className="text-2xl font-bold text-emerald-600"><AnimatedNumber value={paidAmount} prefix="₹" /></p>
            </div>
            <div className="w-px h-10" style={{ backgroundColor: 'var(--theme-glass-border, rgba(255,255,255,0.4))' }}></div>
            <div className="text-center flex-1">
              <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--theme-text-muted, #64748b)' }}>Count</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--theme-text-primary, #0f172a)' }}><AnimatedNumber value={filteredPayments?.length || 0} /></p>
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
                  className="backdrop-blur-md rounded-[16px] p-4 shadow-sm transition-all"
                  style={{ 
                    backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.6))', 
                    borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.5))',
                    borderWidth: '1px'
                  }}
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
                          className="font-bold hover:text-emerald-600 text-sm"
                          style={{ color: 'var(--theme-text-primary, #0f172a)' }}
                        >
                          {payment.member
                            ? `${payment.member.first_name} ${payment.member.last_name}`
                            : 'N/A'}
                        </Link>
                        <p className="text-[10px]" style={{ color: 'var(--theme-text-muted, #64748b)' }}>
                          {payment.payment_method ? (
                            <span className="capitalize">{payment.payment_method}</span>
                          ) : (
                            <span>-</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>₹{payment.amount.toLocaleString('en-IN')}</p>
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
                    <div className="rounded-xl p-2" style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.4))' }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Calendar className="w-3 h-3" style={{ color: 'var(--theme-text-muted, #64748b)' }} />
                        <p className="text-[9px] uppercase font-bold" style={{ color: 'var(--theme-text-muted, #64748b)' }}>Due Date</p>
                      </div>
                      <p className="text-xs font-bold" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>
                        {new Date(payment.due_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="rounded-xl p-2" style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.4))' }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <DollarSign className="w-3 h-3" style={{ color: 'var(--theme-text-muted, #64748b)' }} />
                        <p className="text-[9px] uppercase font-bold" style={{ color: 'var(--theme-text-muted, #64748b)' }}>Paid Date</p>
                      </div>
                      <p className="text-xs font-bold" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>
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
              <div className="w-20 h-20 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.4))' }}>
                <CreditCard className="w-8 h-8" style={{ color: 'var(--theme-text-muted, #94a3b8)' }} />
              </div>
              <p className="font-medium" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>{t('payments.noPayments')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
