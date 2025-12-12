import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserCheck, Calendar, CreditCard, Banknote, Smartphone, Loader2 } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Same static plan options as Add Member
type MembershipPlan = 'monthly' | 'quarterly' | 'half_yearly' | 'annual';

const PLAN_OPTIONS: { value: MembershipPlan; label: string; duration: number; amount: number }[] = [
  { value: 'monthly', label: '1 Month', duration: 1, amount: 1000 },
  { value: 'quarterly', label: '3 Months', duration: 3, amount: 2500 },
  { value: 'half_yearly', label: '6 Months', duration: 6, amount: 5000 },
  { value: 'annual', label: '12 Months', duration: 12, amount: 7500 },
];

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
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan>('monthly');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');

  // Calculate date limits: max 15 days back from today
  const today = new Date();
  const maxDate = today.toISOString().split('T')[0];
  const minDateCalc = new Date(today);
  minDateCalc.setDate(minDateCalc.getDate() - 15);
  const minDate = minDateCalc.toISOString().split('T')[0];

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPlan('monthly');
      setPaymentMethod('cash');
      setStartDate(new Date().toISOString().split('T')[0]);
      setError('');
    }
  }, [isOpen]);

  const currentPlan = PLAN_OPTIONS.find(p => p.value === selectedPlan) || PLAN_OPTIONS[0];
  const planAmount = currentPlan.amount;

  // Calculate next due date
  const nextDueDate = startDate 
    ? format(addMonths(new Date(startDate), currentPlan.duration), 'MMM d, yyyy')
    : '-';

  const handleRejoin = async () => {
    if (!selectedPlan) {
      setError('Please select a membership plan');
      return;
    }
    setError('');
    await onRejoin(selectedPlan, planAmount, paymentMethod, startDate);
  };

  if (!member) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - high z-index to cover everything */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[400]"
            onClick={onClose}
          />

          {/* Modal - compact, dark theme like Add Member - CONSISTENT WIDTH */}
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
              className="w-[90vw] max-w-[340px] max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700/50"
              onClick={(e) => e.stopPropagation()}
            >
            {/* Compact Header */}
            <div className="relative px-3 py-2.5 border-b border-slate-700/50">
              <button
                onClick={onClose}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-slate-700/50 flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <div className="flex items-center gap-2.5">
                <Avatar className="w-9 h-9 ring-2 ring-emerald-500/50">
                  <AvatarImage src={member.photo_url || undefined} alt={member.full_name} />
                  <AvatarFallback className="bg-emerald-600 text-white text-xs font-bold">
                    {member.full_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-1 text-emerald-400 text-[9px] font-semibold tracking-wider">
                    <UserCheck className="w-2.5 h-2.5" />
                    REACTIVATE
                  </div>
                  <h3 className="text-sm font-bold text-white leading-tight">{member.full_name}</h3>
                </div>
              </div>
            </div>

            {/* Scrollable Form - same style as Add Member Step 3 */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              
              {/* Plan Selection - 2x2 grid */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-300 mb-1.5 ml-0.5">Select Plan</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {PLAN_OPTIONS.map((plan) => (
                    <button
                      key={plan.value}
                      type="button"
                      onClick={() => {
                        setSelectedPlan(plan.value);
                        setError('');
                      }}
                      className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all border ${
                        selectedPlan === plan.value
                          ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/30'
                          : 'bg-slate-700/50 text-slate-300 border-slate-600 hover:bg-slate-700'
                      }`}
                    >
                      <div>{plan.label}</div>
                      <div className="text-[10px] mt-0.5 opacity-80">₹{plan.amount.toLocaleString('en-IN')}</div>
                    </button>
                  ))}
                </div>
                {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
              </div>

              {/* Amount - Read Only (from plan) */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-300 mb-0.5 ml-0.5">
                  Amount (₹) <span className="text-emerald-400">(From Plan)</span>
                </label>
                <input
                  type="number"
                  value={planAmount}
                  readOnly
                  disabled
                  className="w-full px-3 py-2 rounded-xl border border-slate-600 bg-slate-700/50 text-slate-300 text-sm font-bold cursor-not-allowed"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-300 mb-1.5 ml-0.5">Payment Method</label>
                <div className="flex gap-1.5">
                  {PAYMENT_METHODS.map((method) => {
                    const Icon = method.icon;
                    const isSelected = paymentMethod === method.key;
                    return (
                      <button
                        key={method.key}
                        type="button"
                        onClick={() => setPaymentMethod(method.key)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl font-medium text-xs transition-all border ${
                          isSelected
                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/30'
                            : 'bg-slate-700/50 text-slate-300 border-slate-600 hover:bg-slate-700'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {method.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Start Date - with 15 day limit */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-300 mb-0.5 ml-0.5">
                  Start Date <span className="text-slate-500">(Max 15 days back)</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  min={minDate}
                  max={maxDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-600 bg-slate-800/80 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm [color-scheme:dark]"
                />
              </div>

              {/* Next Due Date - calculated */}
              <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-xl p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] font-semibold text-emerald-300">Next Due Date</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-400">{nextDueDate}</span>
                </div>
                <p className="text-[9px] text-emerald-400/70 mt-0.5">Auto-calculated from plan</p>
              </div>
            </div>

            {/* Footer with buttons */}
            <div className="p-3 border-t border-slate-700/50 flex gap-2">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 py-2 rounded-xl font-semibold text-[11px] text-slate-300 bg-slate-700/50 hover:bg-slate-700 transition-colors border border-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleRejoin}
                disabled={isLoading || !selectedPlan}
                className="flex-1 py-2 rounded-xl font-bold text-[11px] text-white bg-emerald-500 hover:bg-emerald-600 transition-all shadow-md shadow-emerald-500/30 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  `Reactivate ₹${planAmount.toLocaleString('en-IN')}`
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
