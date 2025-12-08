import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase, getCurrentGymId } from '@/lib/supabase';
import { format, startOfMonth, endOfMonth, subMonths, addMonths, isToday, startOfWeek, endOfWeek, isSameMonth } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { GymLoader } from '@/components/ui/GymLoader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import UserProfileDropdown from '@/components/common/UserProfileDropdown';
import ImagePreviewModal from '@/components/common/ImagePreviewModal';
import { useDeletePayment } from '@/hooks/useCreatePayment';
import { exportService } from '@/lib/exportService';
import toast from 'react-hot-toast';
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
  ArrowLeft,
  Trash2,
  Download,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  SlidersHorizontal
} from 'lucide-react';

// Filter options for payments
const paymentStatusFilters = [
  { key: 'all', label: 'All' },
  { key: 'on-time', label: 'On Time' },
  { key: 'late', label: 'Late' },
];

const paymentMethodFilters = [
  { key: 'all', label: 'All' },
  { key: 'cash', label: 'Cash' },
  { key: 'upi', label: 'UPI' },
  { key: 'card', label: 'Card' },
];

const amountFilters = [
  { key: 'all', label: 'All' },
  { key: 'under_1000', label: '< ₹1K' },
  { key: '1000_2500', label: '₹1K-2.5K' },
  { key: 'above_2500', label: '> ₹2.5K' },
];

// Time-based filters for quick access
const timeFilters = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Paid Today' },
  { key: 'this_week', label: 'This Week' },
];

interface PaymentFilterState {
  status: string;
  method: string;
  amount: string;
  time: string;
}

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
  member_joining_date: string | null;
}

type PaymentFilter = 'all' | 'on-time' | 'late';

export default function PaymentRecords() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const memberId = searchParams.get('member');
  
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllMonths, setShowAllMonths] = useState(!!memberId);
  const [deleteConfirm, setDeleteConfirm] = useState<PaymentRecord | null>(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [imagePreview, setImagePreview] = useState<{ url: string; name: string } | null>(null);
  
  // Advanced filters
  const [filters, setFilters] = useState<PaymentFilterState>({
    status: 'all',
    method: 'all',
    amount: 'all',
    time: 'all',
  });
  const [tempFilters, setTempFilters] = useState<PaymentFilterState>({
    status: 'all',
    method: 'all',
    amount: 'all',
    time: 'all',
  });

  // Fetch members due this month (for "TO COLLECT" calculation)
  const { data: membersDueThisMonth } = useQuery({
    queryKey: ['members-due-month', selectedMonth.toISOString()],
    queryFn: async () => {
      const gymId = await getCurrentGymId();
      if (!gymId) return [];

      const monthStart = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('gym_members')
        .select('id, plan_amount, membership_end_date')
        .eq('gym_id', gymId)
        .eq('status', 'active')
        .gte('membership_end_date', monthStart)
        .lte('membership_end_date', monthEnd);

      if (error) throw error;
      return data || [];
    },
  });

  const deletePaymentMutation = useDeletePayment();

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
            photo_url,
            joining_date
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
        member_joining_date: (p.gym_members as Record<string, unknown>)?.joining_date as string | null,
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

  const handleDeletePayment = async (payment: PaymentRecord) => {
    try {
      const result = await deletePaymentMutation.mutateAsync({
        paymentId: payment.id,
        memberName: payment.member_name,
        amount: payment.amount,
      });
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['payment-records'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['members-with-due'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      
      // Show appropriate message based on whether member was deleted
      if (result?.memberDeleted) {
        toast.success(`Payment deleted. Member "${payment.member_name}" was also removed (initial payment).`);
      } else {
        toast.success(`Payment of ₹${payment.amount.toLocaleString()} deleted. Member's due date reverted.`);
      }
      setDeleteConfirm(null);
    } catch (error) {
      toast.error('Failed to delete payment');
      console.error('Delete payment error:', error);
    }
  };

  // Filter by search term and advanced filters
  const filteredPayments = payments?.filter(p => {
    const matchesSearch = p.member_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.receipt_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    // Apply status filter
    if (filters.status === 'on-time' && p.days_late > 0) return false;
    if (filters.status === 'late' && p.days_late <= 0) return false;
    
    // Apply method filter
    if (filters.method !== 'all' && p.payment_method?.toLowerCase() !== filters.method) return false;
    
    // Apply amount filter
    if (filters.amount === 'under_1000' && p.amount >= 1000) return false;
    if (filters.amount === '1000_2500' && (p.amount < 1000 || p.amount > 2500)) return false;
    if (filters.amount === 'above_2500' && p.amount <= 2500) return false;
    
    // Apply time filter
    if (filters.time !== 'all') {
      const paymentDate = new Date(p.payment_date);
      const today = new Date();
      
      if (filters.time === 'today') {
        if (!isToday(paymentDate)) return false;
      } else if (filters.time === 'this_week') {
        const weekStart = startOfWeek(today, { weekStartsOn: 0 }); // Sunday
        const weekEnd = endOfWeek(today, { weekStartsOn: 0 });
        if (paymentDate < weekStart || paymentDate > weekEnd) return false;
      }
    }
    
    return true;
  });

  // Stats calculations
  const totalCollected = filteredPayments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  const toCollectTarget = membersDueThisMonth?.reduce((sum, m) => sum + (m.plan_amount || 0), 0) || 0;
  const pendingAmount = Math.max(0, toCollectTarget - totalCollected);
  const membersDueCount = membersDueThisMonth?.length || 0;
  const onTimeCount = payments?.filter(p => p.days_late <= 0).length || 0;
  const lateCount = payments?.filter(p => p.days_late > 0).length || 0;

  // Export to CSV
  const handleExportCSV = () => {
    if (!filteredPayments || filteredPayments.length === 0) {
      toast.error('No payments to export');
      return;
    }

    try {
      const exportData = filteredPayments.map(p => ({
        id: p.id,
        member_name: p.member_name,
        amount: p.amount,
        payment_method: p.payment_method,
        payment_date: p.payment_date,
        due_date: p.due_date,
        days_late: p.days_late,
        receipt_number: p.receipt_number,
        notes: p.notes,
      }));

      const filterInfo = filters.status !== 'all' ? filters.status : format(selectedMonth, 'MMM_yyyy');
      exportService.exportPaymentsToCSV(exportData, 'Haefit', filterInfo);
      toast.success(`Exported ${filteredPayments.length} payments to CSV! 📊`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export payments');
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'cash':
        return <Banknote className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-600" />;
      case 'card':
        return <CreditCard className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />;
      case 'upi':
        return <Smartphone className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" />;
      default:
        return <CreditCard className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />;
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

  const getPaymentMethodGradient = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'cash':
        return 'from-emerald-400 to-green-500';
      case 'card':
        return 'from-blue-400 to-indigo-500';
      case 'upi':
        return 'from-purple-400 to-violet-500';
      default:
        return 'from-slate-400 to-slate-500';
    }
  };

  if (isLoading) {
    return <GymLoader message="Loading payments..." />;
  }

  return (
    <div 
      className="fixed inset-0 w-screen h-screen flex flex-col overflow-hidden font-[Urbanist]"
      style={{ backgroundColor: 'var(--theme-bg, #E0F2FE)', paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
    >
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
        className="flex-shrink-0 px-3 pb-1 relative z-50"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center justify-between mb-1">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            className="w-8 h-8 rounded bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-400/30"
          >
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z"/>
            </svg>
          </motion.div>
          <h1 className="text-base font-bold" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>Payments</h1>
          <UserProfileDropdown />
        </div>

        {/* Stats Cards - 4 cards in row like Dashboard */}
        <div className="grid grid-cols-4 gap-1.5 mb-1.5">
          {/* Card 1: This Month - Target with progress bar */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="backdrop-blur-md rounded-xl p-2 shadow-md relative overflow-hidden"
            style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.5))', borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.4))', borderWidth: '1px' }}
          >
            <span className="text-[8px] font-bold uppercase tracking-wide" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>This Month</span>
            <p className="text-xs font-extrabold text-emerald-600 leading-tight mt-0.5">
              ₹{toCollectTarget.toLocaleString('en-IN')}
            </p>
            {/* Progress bar */}
            <div className="my-1 h-1 rounded-full bg-slate-200/50 overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${toCollectTarget > 0 ? Math.min((totalCollected / toCollectTarget) * 100, 100) : 0}%` }}
                transition={{ duration: 1, delay: 0.3 }}
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500"
              />
            </div>
            <p className="text-[8px] font-medium" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>
              {membersDueCount} members due
            </p>
          </motion.div>

          {/* Card 2: Collected - Amount collected with pending */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="backdrop-blur-md rounded-xl p-2 shadow-md relative overflow-hidden"
            style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.5))', borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.4))', borderWidth: '1px' }}
          >
            <span className="text-[8px] font-bold uppercase tracking-wide" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Collected</span>
            <p className="text-xs font-extrabold text-blue-600 leading-tight mt-0.5">
              ₹{totalCollected.toLocaleString('en-IN')}
            </p>
            <p className="text-[8px] font-semibold text-orange-500 mt-1">
              ₹{pendingAmount.toLocaleString('en-IN')} pending
            </p>
          </motion.div>

          {/* Card 3: On Time */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="backdrop-blur-md rounded-xl p-2 shadow-md relative overflow-hidden"
            style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.5))', borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.4))', borderWidth: '1px' }}
          >
            <span className="text-[8px] font-bold uppercase tracking-wide" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>On Time</span>
            <p className="text-xs font-extrabold text-green-600 leading-tight mt-0.5">
              <AnimatedNumber value={onTimeCount} />
            </p>
            <p className="text-[8px] font-medium mt-1" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>
              payments
            </p>
          </motion.div>

          {/* Card 4: Late */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="backdrop-blur-md rounded-xl p-2 shadow-md relative overflow-hidden"
            style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.5))', borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.4))', borderWidth: '1px' }}
          >
            <span className="text-[8px] font-bold uppercase tracking-wide" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Late</span>
            <p className="text-xs font-extrabold text-amber-600 leading-tight mt-0.5">
              <AnimatedNumber value={lateCount} />
            </p>
            <p className="text-[8px] font-medium mt-1" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>
              payments
            </p>
          </motion.div>
        </div>

        {/* Month Navigation - matching calendar style */}
        {!showAllMonths && (
          <div className="flex items-center justify-between mb-1">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handlePreviousMonth}
              className="w-7 h-7 rounded backdrop-blur-xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.6))', borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.4))', borderWidth: '1px' }}
            >
              <ChevronLeft className="w-4 h-4" style={{ color: 'var(--theme-text-secondary, #475569)' }} />
            </motion.button>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>
              {format(selectedMonth, 'MMMM yyyy')}
            </h2>
            <motion.button
              whileTap={format(selectedMonth, 'yyyy-MM') !== format(new Date(), 'yyyy-MM') ? { scale: 0.95 } : undefined}
              onClick={handleNextMonth}
              disabled={format(selectedMonth, 'yyyy-MM') === format(new Date(), 'yyyy-MM')}
              className={`w-7 h-7 rounded backdrop-blur-xl flex items-center justify-center ${format(selectedMonth, 'yyyy-MM') === format(new Date(), 'yyyy-MM') ? 'opacity-30 cursor-not-allowed' : ''}`}
              style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.6))', borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.4))', borderWidth: '1px' }}
            >
              <ChevronRight className="w-4 h-4" style={{ color: 'var(--theme-text-secondary, #475569)' }} />
            </motion.button>
          </div>
        )}

        {/* Member Filter Badge */}
        {memberId && memberDetails && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 backdrop-blur-xl rounded px-2 py-1.5 mb-1.5 shadow-sm"
            style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.6))', border: '1px solid var(--theme-glass-border, rgba(16,185,129,0.3))' }}
          >
            <Avatar className="w-7 h-7 border border-emerald-300">
              <AvatarImage src={memberDetails.photo_url || undefined} alt={memberDetails.full_name} />
              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-[10px]">
                {memberDetails.full_name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{memberDetails.full_name}</p>
              <p className="text-[10px]" style={{ color: 'var(--theme-text-muted, #64748b)' }}>{memberDetails.phone}</p>
            </div>
            <button
              onClick={clearMemberFilter}
              className="p-1 rounded transition-colors"
              style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.6))' }}
            >
              <X className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-secondary, #475569)' }} />
            </button>
          </motion.div>
        )}

        {/* Toggle All Months (for member filter) */}
        {memberId && (
          <button
            onClick={() => setShowAllMonths(!showAllMonths)}
            className={`w-full py-1.5 px-3 rounded text-xs font-medium transition-colors mb-1.5 ${
              showAllMonths 
                ? 'bg-emerald-500 text-white' 
                : ''
            }`}
            style={!showAllMonths ? { backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.6))', color: 'var(--theme-text-secondary, #334155)' } : undefined}
          >
            {showAllMonths ? 'Showing All Time' : 'Show All Time'}
          </button>
        )}

        {/* Search */}
        <div className="relative mb-1.5">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-600" />
          <input
            type="text"
            placeholder="Search by name or receipt..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 backdrop-blur-xl rounded text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-sm"
            style={{ 
              backgroundColor: 'var(--theme-input-bg, rgba(255,255,255,0.6))', 
              border: '1px solid var(--theme-input-border, rgba(255,255,255,0.6))',
              color: 'var(--theme-text-primary, #334155)'
            }}
          />
        </div>

        {/* Controls Bar - Filter & Export */}
        <div className="flex items-center gap-1.5">
          {/* Filter Button */}
          <button
            onClick={() => { setTempFilters(filters); setShowFilterDialog(true); }}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-all ${
              filters.status !== 'all' || filters.method !== 'all' || filters.amount !== 'all' || filters.time !== 'all'
                ? 'bg-emerald-500 text-white shadow-md'
                : ''
            }`}
            style={filters.status === 'all' && filters.method === 'all' && filters.amount === 'all' && filters.time === 'all' ? {
              backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.6))',
              borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.4))',
              borderWidth: '1px',
              color: 'var(--theme-text-secondary, #64748b)'
            } : undefined}
          >
            <SlidersHorizontal className="w-3 h-3" />
            Filter
            {(filters.status !== 'all' || filters.method !== 'all' || filters.amount !== 'all' || filters.time !== 'all') && (
              <span className="w-3.5 h-3.5 rounded-full bg-white/30 text-[8px] flex items-center justify-center font-bold">
                {[filters.status, filters.method, filters.amount, filters.time].filter(f => f !== 'all').length}
              </span>
            )}
          </button>
          
          {/* Spacer */}
          <div className="flex-1" />
          
          {/* Export Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500 text-white text-[10px] font-semibold whitespace-nowrap"
          >
            <Download className="w-3 h-3" />
            Export
          </button>
        </div>
      </motion.header>

      {/* Payment Records Grid - 2 columns matching Members page */}
      <div 
        className="flex-1 overflow-y-auto px-2 pb-20 relative z-10"
        style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
      >
        <AnimatePresence mode="popLayout">
          {filteredPayments && filteredPayments.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 pb-4">
              {filteredPayments.map((payment, index) => (
                <motion.div
                  key={payment.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -20 }}
                  transition={{ 
                    duration: 0.2, 
                    delay: Math.min(index * 0.02, 0.3),
                    type: "spring",
                    stiffness: 400,
                    damping: 30
                  }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  className="backdrop-blur-md rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer"
                  style={{ 
                    backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.6))', 
                    borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.5))',
                    borderWidth: '1px'
                  }}
                >
                  <div className="p-2">
                    {/* Top Row: Avatar + Name + Amount */}
                    <div className="flex items-center gap-2">
                      {/* Avatar */}
                      <div 
                        className={`w-10 h-10 flex-shrink-0 rounded-lg bg-gradient-to-br ${payment.days_late > 0 ? 'from-amber-400 to-orange-500' : 'from-emerald-400 to-teal-500'} flex items-center justify-center overflow-hidden cursor-pointer`}
                        onClick={() => payment.member_photo && setImagePreview({ url: payment.member_photo, name: payment.member_name })}
                      >
                        {payment.member_photo ? (
                          <img src={payment.member_photo} alt={payment.member_name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg text-white/90 font-bold">{payment.member_name.charAt(0)}</span>
                        )}
                      </div>

                      {/* Name & Receipt */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="font-bold truncate text-[11px] leading-tight" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>{payment.member_name}</h3>
                          <span className={`text-[7px] px-1 py-0.5 rounded bg-gradient-to-r ${getPaymentMethodGradient(payment.payment_method)} text-white font-bold flex-shrink-0`}>
                            {payment.payment_method?.toUpperCase() || 'CASH'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-[9px] truncate" style={{ color: 'var(--theme-text-muted, #64748b)' }}>{format(new Date(payment.payment_date), 'dd MMM')}</p>
                          <span className="text-[10px] font-bold text-emerald-600">₹{payment.amount.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Status, Joined Badge & Delete */}
                    <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: '1px solid var(--theme-glass-border, rgba(200,200,200,0.3))' }}>
                      <div className="flex items-center gap-1 flex-wrap">
                        {payment.days_late > 0 ? (
                          <span className="text-[9px] font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                            +{payment.days_late}d late
                          </span>
                        ) : (
                          <span className="text-[9px] font-medium bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                            On time
                          </span>
                        )}
                        {/* Joined This Month Badge */}
                        {payment.member_joining_date && isSameMonth(new Date(payment.member_joining_date), new Date()) && (
                          <span className="text-[8px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                            New Member
                          </span>
                        )}
                      </div>
                      {/* Delete button only for current month payments */}
                      {isSameMonth(new Date(payment.payment_date), new Date()) ? (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm(payment);
                          }}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-100 text-red-600 text-[10px] font-semibold hover:bg-red-200 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </motion.button>
                      ) : null}
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
              <div 
                className="w-20 h-20 backdrop-blur-xl rounded-full flex items-center justify-center mb-4 shadow-lg"
                style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.8))', border: '1px solid var(--theme-glass-border, rgba(255,255,255,0.5))' }}
              >
                <Receipt className="w-10 h-10 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--theme-text-secondary, #334155)' }}>No payments found</h3>
              <p className="text-sm text-center" style={{ color: 'var(--theme-text-muted, #64748b)' }}>
                {memberId 
                  ? 'No payment records for this member'
                  : filters.status !== 'all' || filters.method !== 'all' || filters.amount !== 'all' || filters.time !== 'all'
                    ? `No matching payments in ${format(selectedMonth, 'MMMM yyyy')}`
                    : `No payments recorded in ${format(selectedMonth, 'MMMM yyyy')}`
                }
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
              onClick={() => setDeleteConfirm(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-sm mx-auto rounded-2xl p-6 shadow-2xl z-[101]"
              style={{ backgroundColor: 'var(--theme-card-bg, rgba(255, 255, 255, 0.95))' }}
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--theme-text-primary)' }}>Delete Payment?</h3>
                <p className="text-sm mb-4" style={{ color: 'var(--theme-text-secondary)' }}>
                  This will delete the payment of <span className="font-semibold text-emerald-600">₹{deleteConfirm.amount.toLocaleString()}</span> for <span className="font-semibold">{deleteConfirm.member_name}</span>.
                </p>
                <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2 mb-4">
                  ⚠️ The member's due date will be reverted to the previous state.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 py-2.5 px-4 rounded-xl font-medium transition-colors"
                    style={{ 
                      backgroundColor: 'var(--theme-glass-bg, rgba(241, 245, 249, 0.8))',
                      color: 'var(--theme-text-secondary)'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeletePayment(deleteConfirm)}
                    disabled={deletePaymentMutation.isPending}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {deletePaymentMutation.isPending ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Image Preview Modal */}
      <ImagePreviewModal
        isOpen={!!imagePreview}
        imageUrl={imagePreview?.url || null}
        memberName={imagePreview?.name}
        onClose={() => setImagePreview(null)}
      />

      {/* Filter Dialog */}
      <AnimatePresence>
        {showFilterDialog && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFilterDialog(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-[201] flex items-center justify-center p-4"
              onClick={() => setShowFilterDialog(false)}
            >
              <div 
                className="w-full max-w-[320px] rounded-2xl shadow-2xl overflow-hidden"
                style={{ backgroundColor: 'var(--theme-popup-bg, #fff)' }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 flex items-center justify-between">
                  <h3 className="text-white font-bold text-sm">Filter Payments</h3>
                  <button 
                    onClick={() => setShowFilterDialog(false)}
                    className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>

                {/* Filter Options */}
                <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto" style={{ backgroundColor: 'var(--theme-card-bg, #f8fafc)' }}>
                  {/* Payment Status Filter */}
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wide mb-2 block" style={{ color: 'var(--theme-text-muted, #64748b)' }}>Payment Status</label>
                    <div className="flex flex-wrap gap-1.5">
                      {paymentStatusFilters.map((f) => (
                        <button
                          key={f.key}
                          onClick={() => setTempFilters({ ...tempFilters, status: f.key })}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                            tempFilters.status === f.key
                              ? f.key === 'late' ? 'bg-amber-500 text-white shadow-md'
                              : f.key === 'on-time' ? 'bg-green-500 text-white shadow-md'
                              : 'bg-emerald-500 text-white shadow-md'
                              : ''
                          }`}
                          style={tempFilters.status !== f.key ? {
                            backgroundColor: 'var(--theme-input-bg, #fff)',
                            color: 'var(--theme-text-secondary, #64748b)',
                            border: '1px solid var(--theme-border, #e2e8f0)'
                          } : undefined}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Payment Method Filter */}
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wide mb-2 block" style={{ color: 'var(--theme-text-muted, #64748b)' }}>Payment Method</label>
                    <div className="flex flex-wrap gap-1.5">
                      {paymentMethodFilters.map((f) => (
                        <button
                          key={f.key}
                          onClick={() => setTempFilters({ ...tempFilters, method: f.key })}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                            tempFilters.method === f.key
                              ? f.key === 'cash' ? 'bg-emerald-500 text-white shadow-md'
                              : f.key === 'upi' ? 'bg-purple-500 text-white shadow-md'
                              : f.key === 'card' ? 'bg-blue-500 text-white shadow-md'
                              : 'bg-emerald-500 text-white shadow-md'
                              : ''
                          }`}
                          style={tempFilters.method !== f.key ? {
                            backgroundColor: 'var(--theme-input-bg, #fff)',
                            color: 'var(--theme-text-secondary, #64748b)',
                            border: '1px solid var(--theme-border, #e2e8f0)'
                          } : undefined}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Amount Range Filter */}
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wide mb-2 block" style={{ color: 'var(--theme-text-muted, #64748b)' }}>Amount Range</label>
                    <div className="flex flex-wrap gap-1.5">
                      {amountFilters.map((f) => (
                        <button
                          key={f.key}
                          onClick={() => setTempFilters({ ...tempFilters, amount: f.key })}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                            tempFilters.amount === f.key
                              ? 'bg-emerald-500 text-white shadow-md'
                              : ''
                          }`}
                          style={tempFilters.amount !== f.key ? {
                            backgroundColor: 'var(--theme-input-bg, #fff)',
                            color: 'var(--theme-text-secondary, #64748b)',
                            border: '1px solid var(--theme-border, #e2e8f0)'
                          } : undefined}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time Filter */}
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wide mb-2 block" style={{ color: 'var(--theme-text-muted, #64748b)' }}>Payment Time</label>
                    <div className="flex flex-wrap gap-1.5">
                      {timeFilters.map((f) => (
                        <button
                          key={f.key}
                          onClick={() => setTempFilters({ ...tempFilters, time: f.key })}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                            tempFilters.time === f.key
                              ? f.key === 'today' ? 'bg-blue-500 text-white shadow-md'
                              : f.key === 'this_week' ? 'bg-indigo-500 text-white shadow-md'
                              : 'bg-emerald-500 text-white shadow-md'
                              : ''
                          }`}
                          style={tempFilters.time !== f.key ? {
                            backgroundColor: 'var(--theme-input-bg, #fff)',
                            color: 'var(--theme-text-secondary, #64748b)',
                            border: '1px solid var(--theme-border, #e2e8f0)'
                          } : undefined}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-3 flex gap-2 border-t" style={{ borderColor: 'var(--theme-border, #e2e8f0)', backgroundColor: 'var(--theme-card-bg, #f8fafc)' }}>
                  <button
                    onClick={() => {
                      setTempFilters({ status: 'all', method: 'all', amount: 'all', time: 'all' });
                    }}
                    className="flex-1 py-2 rounded-lg text-xs font-medium"
                    style={{ 
                      backgroundColor: 'var(--theme-input-bg, #fff)',
                      color: 'var(--theme-text-secondary, #64748b)',
                      border: '1px solid var(--theme-border, #e2e8f0)'
                    }}
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => {
                      setFilters(tempFilters);
                      setShowFilterDialog(false);
                    }}
                    className="flex-1 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold shadow-md"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
