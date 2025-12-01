import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase, getCurrentGymId } from '@/lib/supabase';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { GymLoader } from '@/components/ui/GymLoader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import UserProfileDropdown from '@/components/common/UserProfileDropdown';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Calendar, 
  CreditCard, 
  Banknote,
  Smartphone,
  X,
  Receipt,
  ArrowLeft
} from 'lucide-react';

interface PaymentRecord {
  id: string;
  member_id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  due_date: string;
  days_late: number;
  notes: string | null;
  receipt_number: string;
  created_at: string;
  member_name: string;
  member_photo: string | null;
}

export default function PaymentRecords() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const memberId = searchParams.get('member');
  
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllMonths, setShowAllMonths] = useState(!!memberId);

  // Fetch member details if filtering by member
  const { data: memberDetails } = useQuery({
    queryKey: ['member-details', memberId],
    queryFn: async () => {
      if (!memberId) return null;
      const gymId = await getCurrentGymId();
      if (!gymId) return null;

      const { data, error } = await supabase
        .from('gym_members')
        .select('id, full_name, photo_url, phone, membership_plan')
        .eq('id', memberId)
        .eq('gym_id', gymId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!memberId,
  });

  // Fetch payment records
  const { data: payments, isLoading } = useQuery({
    queryKey: ['payment-records', selectedMonth.toISOString(), memberId, showAllMonths],
    queryFn: async () => {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID');

      let query = supabase
        .from('gym_payments')
        .select(`
          id,
          member_id,
          amount,
          payment_method,
          payment_date,
          due_date,
          days_late,
          notes,
          receipt_number,
          created_at,
          gym_members!inner (
            full_name,
            photo_url
          )
        `)
        .eq('gym_id', gymId)
        .order('payment_date', { ascending: false });

      // Filter by member if specified
      if (memberId) {
        query = query.eq('member_id', memberId);
      }

      // Filter by month unless showing all months for a member
      if (!showAllMonths) {
        const monthStart = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
        const monthEnd = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');
        query = query.gte('payment_date', monthStart).lte('payment_date', monthEnd);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Map raw data to PaymentRecord format
      return (data || []).map((p: Record<string, unknown>) => ({
        id: p.id as string,
        member_id: p.member_id as string,
        amount: parseFloat(String(p.amount)),
        payment_method: p.payment_method as string,
        payment_date: p.payment_date as string,
        due_date: p.due_date as string,
        days_late: p.days_late as number,
        notes: p.notes as string | null,
        receipt_number: p.receipt_number as string,
        created_at: p.created_at as string,
        member_name: (p.gym_members as Record<string, unknown>)?.full_name as string,
        member_photo: (p.gym_members as Record<string, unknown>)?.photo_url as string | null,
      })) as PaymentRecord[];
    },
  });

  const handlePreviousMonth = () => {
    setSelectedMonth(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(prev => addMonths(prev, 1));
  };

  const clearMemberFilter = () => {
    navigate('/payments/records');
    setShowAllMonths(false);
  };

  // Filter by search term
  const filteredPayments = payments?.filter(p => 
    p.member_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.receipt_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalAmount = filteredPayments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  const totalCount = filteredPayments?.length || 0;

  const getPaymentMethodIcon = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'cash':
        return <Banknote className="w-4 h-4 text-emerald-600" />;
      case 'card':
        return <CreditCard className="w-4 h-4 text-blue-600" />;
      case 'upi':
        return <Smartphone className="w-4 h-4 text-purple-600" />;
      default:
        return <CreditCard className="w-4 h-4 text-gray-600" />;
    }
  };

  const getPaymentMethodBg = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'cash':
        return 'bg-emerald-50';
      case 'card':
        return 'bg-blue-50';
      case 'upi':
        return 'bg-purple-50';
      default:
        return 'bg-gray-50';
    }
  };

  if (isLoading) {
    return <GymLoader message="Loading payments..." />;
  }

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#E0F2FE] flex flex-col overflow-hidden">
      {/* Static gradient blobs - CSS animation for better performance */}
      <div 
        className="fixed top-[-15%] left-[-15%] w-[70%] h-[55%] bg-[#6EE7B7] rounded-full blur-3xl opacity-40 pointer-events-none z-0 animate-blob" 
      />
      <div 
        className="fixed bottom-[-15%] right-[-15%] w-[70%] h-[55%] bg-[#FCA5A5] rounded-full blur-3xl opacity-40 pointer-events-none z-0 animate-blob animation-delay-4000" 
      />

      {/* Header - Line 1: Logo | Title | Profile */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 px-4 pb-3 relative z-10"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center justify-between mb-3">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-400/30"
          >
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z"/>
            </svg>
          </motion.div>
          <div className="text-center">
            <h1 className="text-lg font-bold text-[#0f172a]">Payments</h1>
          </div>
          <UserProfileDropdown />
        </div>

        {/* Header - Line 2: Month Navigation */}
        {!showAllMonths && (
          <div className="flex items-center justify-between bg-gradient-to-r from-white/60 to-white/40 backdrop-blur-xl rounded-xl px-3 py-2 mb-3 border border-white/60 shadow-sm">
            <button
              onClick={handlePreviousMonth}
              className="p-2 rounded-lg hover:bg-white/60 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-slate-800">
                {format(selectedMonth, 'MMMM yyyy')}
              </span>
            </div>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-lg hover:bg-white/60 transition-colors"
              disabled={format(selectedMonth, 'yyyy-MM') === format(new Date(), 'yyyy-MM')}
            >
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        )}

        {/* Member Filter Badge */}
        {memberId && memberDetails && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 bg-gradient-to-r from-white/60 to-white/40 backdrop-blur-xl rounded-xl px-3 py-2 mb-3 border border-emerald-200/50 shadow-sm"
          >
            <Avatar className="w-8 h-8 border-2 border-emerald-300">
              <AvatarImage src={memberDetails.photo_url || undefined} alt={memberDetails.full_name} />
              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">
                {memberDetails.full_name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{memberDetails.full_name}</p>
              <p className="text-xs text-slate-500">{memberDetails.phone}</p>
            </div>
            <button
              onClick={clearMemberFilter}
              className="p-1.5 rounded-lg bg-white/60 hover:bg-white/80 transition-colors shadow-sm"
            >
              <X className="w-4 h-4 text-slate-600" />
            </button>
          </motion.div>
        )}

        {/* Toggle All Months (for member filter) */}
        {memberId && (
          <button
            onClick={() => setShowAllMonths(!showAllMonths)}
            className={`w-full py-2 px-4 rounded-xl text-sm font-medium transition-colors mb-3 ${
              showAllMonths 
                ? 'bg-emerald-500 text-white' 
                : 'bg-white/60 text-slate-700 hover:bg-white/80'
            }`}
          >
            {showAllMonths ? 'Showing All Time' : 'Show All Time'}
          </button>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-2xl p-3 shadow-lg"
          >
            <p className="text-emerald-100 text-xs font-medium">Total Collected</p>
            <p className="text-white text-xl font-bold">₹{totalAmount.toLocaleString()}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-blue-400 to-blue-500 rounded-2xl p-3 shadow-lg"
          >
            <p className="text-blue-100 text-xs font-medium">Transactions</p>
            <p className="text-white text-xl font-bold">{totalCount}</p>
          </motion.div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
          <input
            type="text"
            placeholder="Search by name or receipt..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gradient-to-r from-white/60 to-white/40 backdrop-blur-xl border border-white/60 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-sm"
          />
        </div>
      </motion.header>

      {/* Payment Records List */}
      <div 
        className="flex-1 overflow-y-auto px-4 pb-24 relative z-10"
        style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
      >
        <AnimatePresence mode="popLayout">
          {filteredPayments && filteredPayments.length > 0 ? (
            <div className="space-y-3">
              {filteredPayments.map((payment, index) => (
                <motion.div
                  key={payment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.03 }}
                  className="bg-white/40 backdrop-blur-2xl rounded-2xl p-4 shadow-lg border border-white/60 hover:bg-white/50 hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex items-start gap-3">
                    {/* Member Avatar */}
                    <Avatar className="w-12 h-12 border-2 border-emerald-200">
                      <AvatarImage src={payment.member_photo || undefined} alt={payment.member_name} />
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 font-semibold">
                        {payment.member_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Payment Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-slate-800 truncate">{payment.member_name}</h3>
                          <p className="text-xs text-slate-500">{payment.receipt_number}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-emerald-600">₹{payment.amount.toLocaleString()}</p>
                          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${getPaymentMethodBg(payment.payment_method)}`}>
                            {getPaymentMethodIcon(payment.payment_method)}
                            <span className="capitalize">{payment.payment_method}</span>
                          </div>
                        </div>
                      </div>

                      {/* Date Info */}
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>Paid: {format(new Date(payment.payment_date), 'dd MMM yyyy')}</span>
                        </div>
                        {payment.days_late > 0 && (
                          <span className="text-amber-600 font-medium">
                            {payment.days_late}d late
                          </span>
                        )}
                      </div>

                      {/* Notes */}
                      {payment.notes && (
                        <p className="mt-2 text-xs text-slate-500 italic">"{payment.notes}"</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-16"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-xl rounded-full flex items-center justify-center mb-4 shadow-lg border border-white/50">
                <Receipt className="w-10 h-10 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-1">No payments found</h3>
              <p className="text-sm text-slate-500 text-center">
                {memberId 
                  ? 'No payment records for this member'
                  : `No payments recorded in ${format(selectedMonth, 'MMMM yyyy')}`
                }
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
