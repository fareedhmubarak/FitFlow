import { useState } from 'react';
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

const PLAN_OPTIONS = [
  { value: 'monthly', label: 'Monthly (1 month)', months: 1, defaultAmount: 1000 },
  { value: 'quarterly', label: 'Quarterly (3 months)', months: 3, defaultAmount: 2500 },
  { value: 'half_yearly', label: 'Half Yearly (6 months)', months: 6, defaultAmount: 5000 },
  { value: 'annual', label: 'Annual (12 months)', months: 12, defaultAmount: 7500 },
];

const PAYMENT_METHODS = [
  { value: 'cash', label: '💵 Cash' },
  { value: 'upi', label: '📱 UPI' },
  { value: 'card', label: '💳 Card' },
  { value: 'bank_transfer', label: '🏦 Bank Transfer' },
];

export default function PaymentRecordDialog({ member, open, onOpenChange }: PaymentRecordDialogProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [selectedPlan, setSelectedPlan] = useState(member?.membership_plan || 'monthly');
  const [amount, setAmount] = useState(member?.plan_amount?.toString() || '1000');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'bank_transfer'>('cash');
  const [notes, setNotes] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

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
        <DialogContent className="sm:max-w-md">
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

  const handlePlanChange = (plan: string) => {
    setSelectedPlan(plan);
    const planConfig = PLAN_OPTIONS.find(p => p.value === plan);
    if (planConfig) {
      setAmount(planConfig.defaultAmount.toString());
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    // Show success IMMEDIATELY (optimistic update)
    setShowSuccess(true);
    
    // Then perform the actual DB operation in background
    try {
      await membershipService.recordPayment({
        member_id: member.id,
        amount: parseFloat(amount),
        payment_method: paymentMethod,
        payment_date: format(new Date(), 'yyyy-MM-dd'),
        due_date: dueDate,
        notes: notes || undefined,
        plan_type: selectedPlan as 'monthly' | 'quarterly' | 'half_yearly' | 'annual',
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
        <DialogContent className="sm:max-w-md">
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
            <div className="grid grid-cols-2 gap-2">
              {PLAN_OPTIONS.map((plan) => (
                <button
                  key={plan.value}
                  type="button"
                  onClick={() => handlePlanChange(plan.value)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedPlan === plan.value
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-primary'
                  }`}
                >
                  <p className="text-xs font-medium">{plan.label}</p>
                  <p className="text-lg font-bold">₹{plan.defaultAmount.toLocaleString()}</p>
                </button>
              ))}
            </div>
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
