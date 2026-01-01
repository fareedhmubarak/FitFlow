import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserCheck, Calendar, CreditCard, Banknote, Smartphone, Loader2 } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useMembershipPlans } from '@/hooks/useMembershipPlans';

// Plans will be loaded dynamically from database

const PAYMENT_METHODS = [
  { key: 'cash', label: 'Cash', icon: Banknote },
  { key: 'upi', label: 'UPI', icon: Smartphone },
  { key: 'card', label: 'Card', icon: CreditCard },
];

// Interface matching what we need
interface RejoinMemberData {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  photo_url: string | null;
  gender: string | null;
  status: 'active' | 'inactive';
  first_joining_date: string;
  joining_date: string;
  total_periods: number;
  lifetime_value: number;
  periods: Array<{
    id: string;
    period_number: number;
    plan_name: string;
    start_date: string;
    end_date: string;
    paid_amount: number;
    status: string;
  }>;
}

interface RejoinMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: RejoinMemberData | null;
  onRejoin: (planId: string, amount: number, paymentMethod: string, startDate: string) => Promise<void>;
  isLoading?: boolean;
}

export default function RejoinMemberModal({
  isOpen,
  onClose,
  member,
  onRejoin,
  isLoading = false,
}: RejoinMemberModalProps) {
  const { data: plans, isLoading: plansLoading } = useMembershipPlans();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');

  // Separate plans into regular and special
  const { regularPlans, specialPlans } = useMemo(() => {
    if (!plans) return { regularPlans: [], specialPlans: [] };
    
    const allPlans = plans
      .filter(plan => plan.is_active)
      .map(plan => {
        const baseMonths = (plan as any).base_duration_months || (plan as any).duration_months || 1;
        const bonusMonths = (plan as any).bonus_duration_months || 0;
        const totalMonths = baseMonths + bonusMonths;
        
        let label = plan.name;
        if (bonusMonths > 0) {
          label = `${plan.name} (${baseMonths}+${bonusMonths})`;
        }
        
        return {
          id: plan.id,
          label: label,
          amount: plan.price,
          totalMonths: totalMonths,
          bonusMonths: bonusMonths,
        };
      })
      .sort((a, b) => a.amount - b.amount);
    
    const regular = allPlans.filter(p => p.bonusMonths === 0);
    const special = allPlans.filter(p => p.bonusMonths > 0);
    
    return { regularPlans: regular, specialPlans: special };
  }, [plans]);

  // Calculate date limits: max 15 days back from today
  const today = new Date();
  const maxDate = today.toISOString().split('T')[0];
  const minDateCalc = new Date(today);
  minDateCalc.setDate(minDateCalc.getDate() - 15);
  const minDate = minDateCalc.toISOString().split('T')[0];

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen && plans && plans.length > 0) {
      if (!selectedPlanId && regularPlans.length > 0) {
        setSelectedPlanId(regularPlans[0].id);
      }
      setPaymentMethod('cash');
      setStartDate(new Date().toISOString().split('T')[0]);
      setError('');
    }
  }, [isOpen, plans, selectedPlanId, regularPlans]);

  const currentPlan = plans?.find(p => p.id === selectedPlanId) || (regularPlans && regularPlans.length > 0 ? regularPlans[0] : null);
  const planAmount = currentPlan ? (Number((currentPlan as any).price) || 0) : 0;
  const planTotalMonths = currentPlan ? ((currentPlan as any).base_duration_months || (currentPlan as any).duration_months || 1) + ((currentPlan as any).bonus_duration_months || 0) : 1;

  // Calculate next due date
  const nextDueDate = startDate && currentPlan
    ? format(addMonths(new Date(startDate), planTotalMonths), 'MMM d, yyyy')
    : '-';

  const handleRejoin = async () => {
    if (!selectedPlanId) {
      setError('Please select a membership plan');
      return;
    }
    setError('');
    await onRejoin(selectedPlanId, planAmount, paymentMethod, startDate);
  };

  if (!member) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[400]"
            onClick={onClose}
          />

          {/* Modal - Compact Light Theme with Green Header */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[401] flex items-center justify-center p-4"
            style={{ paddingBottom: 'max(5rem, calc(env(safe-area-inset-bottom) + 4rem))' }}
            onClick={onClose}
          >
            <div 
              className="w-[90vw] max-w-[340px] max-h-[75vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col bg-white"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header - Green Gradient (Compact) */}
              <div className="relative bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2.5 shrink-0">
                <button
                  onClick={onClose}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>

                <div className="flex items-center gap-2.5">
                  <Avatar className="w-9 h-9 ring-2 ring-white/30">
                    <AvatarImage src={member.photo_url || undefined} alt={member.full_name} />
                    <AvatarFallback className="bg-white/20 text-white text-xs font-bold">
                      {member.full_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-1 text-white/80 text-[9px] font-semibold tracking-wider">
                      <UserCheck className="w-2.5 h-2.5" />
                      REACTIVATE
                    </div>
                    <h3 className="text-sm font-bold text-white leading-tight">{member.full_name}</h3>
                  </div>
                </div>
              </div>

              {/* Scrollable Form - Compact */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                
                {/* Plan Selection - Regular plans in one row (max 4), Special plans in next row (max 4) */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Select Plan</label>
                  {plansLoading ? (
                    <div className="text-center py-4 text-sm text-slate-500">Loading plans...</div>
                  ) : (regularPlans.length === 0 && specialPlans.length === 0) ? (
                    <div className="text-center py-4 text-sm text-red-500">No active plans available.</div>
                  ) : (
                    <div className="space-y-2">
                      {/* Regular Plans Row - Max 4 per row */}
                      {regularPlans.length > 0 && (
                        <div className="grid grid-cols-4 gap-1.5">
                          {regularPlans.map((plan) => (
                            <button
                              key={plan.id}
                              type="button"
                              onClick={() => {
                                setSelectedPlanId(plan.id);
                                setError('');
                              }}
                              className={`py-2 px-1 rounded-lg text-xs font-semibold transition-all border ${
                                selectedPlanId === plan.id
                                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/30'
                                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <div className="font-bold text-[10px] leading-tight line-clamp-2 break-words text-center">{plan.label}</div>
                              <div className="text-[9px] opacity-80 mt-1">₹{plan.amount.toLocaleString('en-IN')}</div>
                              <div className="text-[8px] opacity-70 mt-0.5">{plan.totalMonths} month{plan.totalMonths !== 1 ? 's' : ''}</div>
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {/* Special Plans Row - Max 4 per row */}
                      {specialPlans.length > 0 && (
                        <div className="grid grid-cols-4 gap-1.5">
                          {specialPlans.map((plan) => (
                            <button
                              key={plan.id}
                              type="button"
                              onClick={() => {
                                setSelectedPlanId(plan.id);
                                setError('');
                              }}
                              className={`py-2 px-1 rounded-lg text-xs font-semibold transition-all border-2 ${
                                selectedPlanId === plan.id
                                  ? 'bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-500/30'
                                  : 'bg-slate-50 text-slate-600 border-emerald-200 hover:bg-emerald-50'
                              }`}
                            >
                              <div className="font-bold text-[10px] leading-tight line-clamp-2 break-words text-center">{plan.label}</div>
                              <div className="text-[9px] opacity-80 mt-1">₹{plan.amount.toLocaleString('en-IN')}</div>
                              <div className="text-[8px] opacity-70 mt-0.5">{plan.totalMonths} months</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {error && <p className="text-[10px] text-red-500 mt-1">{error}</p>}
                </div>

                {/* Amount & Payment Method - Single Row */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Amount - Read Only */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">
                      Amount
                    </label>
                    <div className="px-2.5 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-sm font-bold">
                      ₹{(planAmount || 0).toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      min={minDate}
                      max={maxDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm [color-scheme:light]"
                    />
                  </div>
                </div>

                {/* Payment Method - Compact Row */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Payment</label>
                  <div className="flex gap-1.5">
                    {PAYMENT_METHODS.map((method) => {
                      const Icon = method.icon;
                      const isSelected = paymentMethod === method.key;
                      return (
                        <button
                          key={method.key}
                          type="button"
                          onClick={() => setPaymentMethod(method.key)}
                          className={`flex-1 flex items-center justify-center gap-1 py-2 px-2 rounded-lg font-semibold text-xs transition-all border ${
                            isSelected
                              ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/30'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {method.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Next Due Date - Compact Info Box */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-[10px] font-semibold text-emerald-700">Next Due</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-600">{nextDueDate}</span>
                  </div>
                </div>
              </div>

              {/* Footer - Compact */}
              <div className="px-3 py-2.5 border-t border-slate-100 bg-slate-50/80 flex gap-2">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-xs text-slate-600 bg-white hover:bg-slate-100 transition-colors border border-slate-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejoin}
                  disabled={isLoading || !selectedPlanId}
                  className="flex-1 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md shadow-emerald-500/30 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    `Reactivate ₹${(planAmount || 0).toLocaleString('en-IN')}`
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
