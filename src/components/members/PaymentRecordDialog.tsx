import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { membershipService } from '@/lib/membershipService';
import toast from 'react-hot-toast';
import { AlertCircle, Clock } from 'lucide-react';
import SuccessAnimation from '@/components/common/SuccessAnimation';
import { useMembershipPlans } from '@/hooks/useMembershipPlans';

interface MemberData {
  id: string;
  full_name: string;
  phone: string;
  membership_plan: string;
  plan_amount: number;
  next_payment_due_date?: string | null;
  membership_end_date?: string | null;
}

interface PaymentRecordDialogProps {
  member: MemberData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Plans will be loaded dynamically from database

const PAYMENT_METHODS = [
  { value: 'cash', label: '💵 Cash' },
  { value: 'upi', label: '📱 UPI' },
  { value: 'card', label: '💳 Card' },
  { value: 'bank_transfer', label: '🏦 Bank Transfer' },
];

export default function PaymentRecordDialog({ member, open, onOpenChange }: PaymentRecordDialogProps) {
  const queryClient = useQueryClient();
  const { data: plans, isLoading: plansLoading } = useMembershipPlans();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [amount, setAmount] = useState(member?.plan_amount?.toString() || '1000');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'bank_transfer'>('cash');
  const [notes, setNotes] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Helper to derive legacy membership_plan enum from duration
  const getMembershipPlanType = (months: number): 'monthly' | 'quarterly' | 'half_yearly' | 'annual' => {
    if (months <= 1) return 'monthly';
    if (months <= 3) return 'quarterly';
    if (months <= 6) return 'half_yearly';
    return 'annual';
  };

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
          membershipPlanEnum: getMembershipPlanType(totalMonths), // Legacy enum for database
        };
      })
      .sort((a, b) => a.amount - b.amount);
    
    const regular = allPlans.filter(p => p.bonusMonths === 0);
    const special = allPlans.filter(p => p.bonusMonths > 0);
    
    return { regularPlans: regular, specialPlans: special };
  }, [plans]);

  // Initialize selected plan when member or plans change
  useMemo(() => {
    if (plans && plans.length > 0 && !selectedPlanId) {
      // Try to find matching plan by name or use first plan
      const matchingPlan = plans.find(p => p.name.toLowerCase() === member?.membership_plan?.toLowerCase());
      if (matchingPlan) {
        setSelectedPlanId(matchingPlan.id);
        setAmount(String(matchingPlan.price));
      } else if (regularPlans.length > 0) {
        setSelectedPlanId(regularPlans[0].id);
        setAmount(String(regularPlans[0].amount));
      }
    }
  }, [plans, member, selectedPlanId, regularPlans]);

  if (!member) return null;

  const dueDate = member.next_payment_due_date || member.membership_end_date || format(new Date(), 'yyyy-MM-dd');

  // Payment restriction check
  const isPaymentAllowed = () => {
    const dueDateStr = member.next_payment_due_date || member.membership_end_date;
    if (!dueDateStr) return true; // Allow if no due date set
    
    const dueDateObj = new Date(dueDateStr);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysUntilDue <= 7;
  };

  const getDaysUntilPaymentAllowed = () => {
    const dueDateStr = member.next_payment_due_date || member.membership_end_date;
    if (!dueDateStr || isPaymentAllowed()) return 0;
    
    const dueDateObj = new Date(dueDateStr);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysUntilDue - 7);
  };

  // If payment is not allowed, show restriction message
  if (!isPaymentAllowed()) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[90vw] max-w-[340px]">
          <DialogHeader>
            <DialogTitle>Payment Not Available</DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Restricted</h3>
            <p className="text-sm text-gray-500 mb-4">
              Payments can only be recorded within 7 days of the due date.
            </p>
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm font-medium text-amber-800">
                Payment will be available in <span className="font-bold">{getDaysUntilPaymentAllowed()} days</span>
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Due date: {format(new Date(dueDate), 'dd MMM yyyy')}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const handlePlanChange = (planId: string) => {
    setSelectedPlanId(planId);
    const plan = plans?.find(p => p.id === planId);
    if (plan) {
      setAmount(String(plan.price));
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    // Show success IMMEDIATELY (optimistic update)
    setShowSuccess(true);
    
    // Then perform the actual DB operation in background
    try {
      // Calculate correct plan type enum
      let planTypeEnum = member.membership_plan as any;
      
      // Look up selected plan from our processed arrays to get the enum
      const selectedPlanObj = regularPlans.find(p => p.id === selectedPlanId) || specialPlans.find(p => p.id === selectedPlanId);
      
      if (selectedPlanObj) {
        planTypeEnum = selectedPlanObj.membershipPlanEnum;
      } else if (selectedPlanId && plans) {
         // Fallback if not found in processed arrays
         const rawPlan = plans.find(p => p.id === selectedPlanId);
         if (rawPlan) {
           const baseMonths = (rawPlan as any).base_duration_months || (rawPlan as any).duration_months || 1;
           const bonusMonths = (rawPlan as any).bonus_duration_months || 0;
           planTypeEnum = getMembershipPlanType(baseMonths + bonusMonths);
         }
      }

      await membershipService.recordPayment({
        member_id: member.id,
        amount: parseFloat(amount),
        payment_method: paymentMethod,
        payment_date: format(new Date(), 'yyyy-MM-dd'),
        due_date: dueDate,
        notes: notes || undefined,
        plan_id: selectedPlanId || undefined,
        plan_type: planTypeEnum,
      });

      // Sync data in background after animation shows
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['member', member.id] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment-records'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['due-payments'] });
      queryClient.invalidateQueries({ queryKey: ['calendarData'] });
    } catch (error) {
      // Revert on error
      setShowSuccess(false);
      console.error('Payment error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SuccessAnimation
        show={showSuccess}
        message="Payment Recorded!"
        subMessage={`₹${parseFloat(amount || '0').toLocaleString()} - Membership Extended`}
        variant="payment"
        duration={1200}
        onComplete={() => {
          setShowSuccess(false);
          onOpenChange(false);
        }}
      />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[90vw] max-w-[340px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Member Info */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="font-medium text-gray-900 dark:text-white">{member.full_name}</p>
            <p className="text-sm text-gray-500">
              Due Date: {format(new Date(dueDate), 'dd MMM yyyy')}
            </p>
          </div>

          {/* Membership Plan Selection */}
          <div className="space-y-2">
            <Label>Membership Plan</Label>
            {plansLoading ? (
              <div className="text-center py-4 text-sm text-gray-500">Loading plans...</div>
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
                        onClick={() => handlePlanChange(plan.id)}
                        className={`p-2 rounded-lg border text-center transition-all ${
                          selectedPlanId === plan.id
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-primary'
                        }`}
                      >
                        <p className="text-[10px] font-bold leading-tight line-clamp-2 break-words">{plan.label}</p>
                        <p className="text-xs font-bold mt-1">₹{plan.amount.toLocaleString('en-IN')}</p>
                        <p className="text-[9px] opacity-70 mt-0.5">{plan.totalMonths} month{plan.totalMonths !== 1 ? 's' : ''}</p>
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
                        onClick={() => handlePlanChange(plan.id)}
                        className={`p-2 rounded-lg border-2 text-center transition-all ${
                          selectedPlanId === plan.id
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white dark:bg-gray-800 border-emerald-200 dark:border-emerald-700 hover:border-emerald-400'
                        }`}
                      >
                        <p className="text-[10px] font-bold leading-tight line-clamp-2 break-words">{plan.label}</p>
                        <p className="text-xs font-bold mt-1">₹{plan.amount.toLocaleString('en-IN')}</p>
                        <p className="text-[9px] opacity-70 mt-0.5">{plan.totalMonths} months</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              min="0"
            />
            <p className="text-xs text-gray-500">You can adjust the amount if different from default</p>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setPaymentMethod(method.value as typeof paymentMethod)}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    paymentMethod === method.value
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-primary'
                  }`}
                >
                  <span className="text-sm font-medium">{method.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Recording...' : `Pay ₹${parseFloat(amount || '0').toLocaleString()}`}
          </Button>
        </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
