import { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useCreateExpense } from '@/hooks/useExpenses';
import { EXPENSE_CATEGORIES, EXPENSE_PAYMENT_METHODS, type ExpenseCategory, type ExpensePaymentMethod } from '@/types/expense';

interface AddExpenseModalProps {
  onClose: () => void;
}

export default function AddExpenseModal({ onClose }: AddExpenseModalProps) {
  const createExpense = useCreateExpense();
  const [category, setCategory] = useState<ExpenseCategory>('rent');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethod>('cash');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    createExpense.mutate(
      {
        category,
        description: description || EXPENSE_CATEGORIES[category].label,
        amount: amountNum,
        expense_date: expenseDate,
        payment_method: paymentMethod,
        notes: notes || null,
      },
      {
        onSuccess: () => {
          toast.success('Expense added!');
          onClose();
        },
        onError: () => toast.error('Failed to add expense'),
      },
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center"
      onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl p-5 pb-24 space-y-4 max-h-[85vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--theme-bg, #f0f9ff)' }}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>Add Expense</h2>
          <motion.button whileTap={{ scale: 0.8 }} onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100">
            <X className="w-5 h-5" style={{ color: 'var(--theme-text-muted, #94a3b8)' }} />
          </motion.button>
        </div>

        {/* Category */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wide mb-1 block" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Category</label>
          <div className="grid grid-cols-4 gap-2">
            {(Object.entries(EXPENSE_CATEGORIES) as [ExpenseCategory, { label: string; emoji: string }][]).map(([key, val]) => (
              <motion.button key={key} whileTap={{ scale: 0.92 }}
                onClick={() => setCategory(key)}
                className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border transition-all ${category === key ? 'border-emerald-400 bg-emerald-50 shadow-sm' : 'border-white/30 bg-white/50'}`}>
                <span className="text-lg">{val.emoji}</span>
                <span className="text-[9px] font-semibold" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{val.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wide mb-1 block" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Amount</label>
          <input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
            className="w-full px-3 py-2.5 rounded-xl border border-white/40 backdrop-blur-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-400"
            style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.7))', color: 'var(--theme-text-primary, #1e293b)' }} />
        </div>

        {/* Description */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wide mb-1 block" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Description (optional)</label>
          <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder={EXPENSE_CATEGORIES[category].label}
            className="w-full px-3 py-2.5 rounded-xl border border-white/40 backdrop-blur-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.7))', color: 'var(--theme-text-primary, #1e293b)' }} />
        </div>

        {/* Date */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wide mb-1 block" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Date</label>
          <input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-white/40 backdrop-blur-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.7))', color: 'var(--theme-text-primary, #1e293b)' }} />
        </div>

        {/* Payment Method */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wide mb-1 block" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Payment Method</label>
          <div className="flex gap-2">
            {(Object.entries(EXPENSE_PAYMENT_METHODS) as [ExpensePaymentMethod, string][]).map(([key, label]) => (
              <motion.button key={key} whileTap={{ scale: 0.92 }}
                onClick={() => setPaymentMethod(key)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${paymentMethod === key ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-white/30 bg-white/50'}`}
                style={paymentMethod !== key ? { color: 'var(--theme-text-primary, #1e293b)' } : undefined}>
                {label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wide mb-1 block" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Notes (optional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes..." rows={2}
            className="w-full px-3 py-2.5 rounded-xl border border-white/40 backdrop-blur-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400"
            style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.7))', color: 'var(--theme-text-primary, #1e293b)' }} />
        </div>

        {/* Submit */}
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
          onClick={handleSubmit} disabled={createExpense.isPending}
          className="w-full py-3 text-white font-bold text-sm disabled:opacity-50"
          style={{ background: '#000000', borderRadius: '16px', boxShadow: '0 8px 20px rgba(0,0,0,0.25)' }}>
          {createExpense.isPending ? 'Adding...' : 'Add Expense'}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
