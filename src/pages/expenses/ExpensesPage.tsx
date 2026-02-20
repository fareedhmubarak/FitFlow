import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Trash2, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { format, addMonths, subMonths, isSameMonth } from 'date-fns';
import toast from 'react-hot-toast';
import { useExpenses, useMonthlyPL, useDeleteExpense } from '@/hooks/useExpenses';
import { EXPENSE_CATEGORIES, type ExpenseCategory } from '@/types/expense';
import { useCurrency } from '@/hooks/useCurrency';
import AddExpenseModal from '@/components/expenses/AddExpenseModal';

export default function ExpensesPage() {
  const navigate = useNavigate();
  const { fc } = useCurrency();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1;

  const { data: expenses = [], isLoading: expensesLoading } = useExpenses(year, month);
  const { data: pl, isLoading: plLoading } = useMonthlyPL(year, month);
  const deleteExpense = useDeleteExpense();

  const canGoNext = !isSameMonth(currentMonth, new Date());

  const handleDelete = (id: string) => {
    deleteExpense.mutate(id, {
      onSuccess: () => toast.success('Expense deleted'),
      onError: () => toast.error('Failed to delete'),
    });
  };

  return (
    <div className="fixed inset-0 w-screen h-[100dvh] flex flex-col overflow-hidden font-[Urbanist]" style={{ background: 'var(--theme-bg, linear-gradient(135deg, #e0e7ff 0%, #f0fdfa 50%, #fdf2f8 100%))' }}>
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 px-4 pt-16 pb-2"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)}
              className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm border border-white/50 active:scale-95 transition-transform"
              style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}>
              <ArrowLeft className="w-4 h-4" style={{ color: 'var(--theme-text-primary, #1e293b)' }} />
            </button>
            <h1 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>Expenses</h1>
          </div>
          <div className="flex items-center rounded-full shadow-sm overflow-hidden border border-white/50" style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}>
            <button onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
              className="w-7 h-7 flex items-center justify-center active:scale-95 transition-transform">
              <ChevronLeft className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-primary, #334155)' }} />
            </button>
            <span className="px-2 text-xs font-medium" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>{format(currentMonth, 'MMM yyyy')}</span>
            <button
              onClick={() => canGoNext && setCurrentMonth(prev => addMonths(prev, 1))}
              disabled={!canGoNext}
              className={`w-7 h-7 flex items-center justify-center active:scale-95 transition-transform ${!canGoNext ? 'opacity-30' : ''}`}>
              <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-primary, #334155)' }} />
            </button>
          </div>
        </div>
      </motion.header>

      <div className="flex-1 overflow-y-auto min-h-0 px-4 pb-24 space-y-4" style={{ overscrollBehavior: 'contain' }}>
        {/* P&L Summary */}
        {!plLoading && pl && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl p-2.5 shadow-md relative overflow-hidden border border-white/40" style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}>
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-400 to-teal-500 rounded-t-2xl" />
              <div className="flex items-center gap-1 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Income</span>
              </div>
              <p className="text-sm font-extrabold text-emerald-600">{fc(pl.totalIncome)}</p>
            </div>
            <div className="rounded-2xl p-2.5 shadow-md relative overflow-hidden border border-white/40" style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}>
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-red-400 to-orange-500 rounded-t-2xl" />
              <div className="flex items-center gap-1 mb-1">
                <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Expenses</span>
              </div>
              <p className="text-sm font-extrabold text-red-500">{fc(pl.totalExpenses)}</p>
            </div>
            <div className="rounded-2xl p-2.5 shadow-md relative overflow-hidden border border-white/40" style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}>
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-400 to-violet-500 rounded-t-2xl" />
              <div className="flex items-center gap-1 mb-1">
                <Wallet className="w-3.5 h-3.5" style={{ color: pl.profit >= 0 ? '#10b981' : '#ef4444' }} />
                <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Profit</span>
              </div>
              <p className={`text-sm font-extrabold ${pl.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fc(pl.profit)}</p>
            </div>
          </motion.div>
        )}

        {/* Category Bars */}
        {!plLoading && pl && pl.totalExpenses > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-2xl p-3 shadow-md border border-white/40 space-y-2"
            style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}>
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>By Category</span>
            {(Object.entries(pl.expensesByCategory) as [ExpenseCategory, number][])
              .filter(([, amount]) => amount > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([cat, amount]) => {
                const pct = Math.round((amount / pl.totalExpenses) * 100);
                const info = EXPENSE_CATEGORIES[cat];
                return (
                  <div key={cat}>
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-[11px] font-semibold" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{info.emoji} {info.label}</span>
                      <span className="text-[11px] font-bold" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{fc(amount)} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-200/50 overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }}
                        className="h-full rounded-full bg-gradient-to-r from-red-400 to-orange-400" />
                    </div>
                  </div>
                );
              })}
          </motion.div>
        )}

        {/* Expense List */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wide px-1" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>
            Transactions ({expenses.length})
          </span>
          {expensesLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <div key={i} className="skeleton-shimmer h-16 rounded-2xl" />)}
            </div>
          ) : expenses.length === 0 ? (
            <div className="rounded-2xl p-6 text-center shadow-md border border-white/40" style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}>
              <p className="text-2xl mb-1">💸</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary, #334155)' }}>No expenses yet</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>Tap + to add your first expense</p>
            </div>
          ) : (
            expenses.map((exp, idx) => {
              const info = EXPENSE_CATEGORIES[exp.category as ExpenseCategory] || EXPENSE_CATEGORIES.other;
              return (
                <motion.div key={exp.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                  className="rounded-2xl pl-3 pr-2 py-2.5 shadow-sm border border-white/40 flex items-center gap-3"
                  style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}>
                  <span className="text-xl">{info.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{exp.description || info.label}</p>
                    <p className="text-[10px]" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>
                      {format(new Date(exp.expense_date), 'dd MMM')} · {exp.payment_method.toUpperCase()}
                    </p>
                  </div>
                  <span className="text-xs font-extrabold text-red-500 whitespace-nowrap">{fc(exp.amount)}</span>
                  <motion.button whileTap={{ scale: 0.8 }} onClick={() => handleDelete(exp.id)}
                    className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-red-50">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </motion.button>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* FAB */}
      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-xl shadow-emerald-500/30 flex items-center justify-center">
        <Plus className="w-6 h-6 text-white" />
      </motion.button>

      <AnimatePresence>
        {showAddModal && <AddExpenseModal onClose={() => setShowAddModal(false)} />}
      </AnimatePresence>
    </div>
  );
}
