import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, Clock,
  Edit, Trash2, X, Save, CreditCard
} from 'lucide-react';
import { settingsService, type MembershipPlan, type CreatePlanInput } from '@/lib/settingsService';
import { useCurrency } from '@/hooks/useCurrency';
import toast from 'react-hot-toast';
import UserProfileDropdown from '@/components/common/UserProfileDropdown';

export default function PlansPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { fc, symbol } = useCurrency();
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['membership-plans'],
    queryFn: () => settingsService.getMembershipPlans(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => settingsService.deleteMembershipPlan(id),
    onSuccess: () => {
      toast.success('Plan deleted');
      queryClient.invalidateQueries({ queryKey: ['membership-plans'] });
      setDeleteId(null);
    },
    onError: () => toast.error('Failed to delete'),
  });

  const openEdit = (plan: MembershipPlan) => {
    setEditingPlan(plan);
    setShowForm(true);
  };

  const openCreate = () => {
    setEditingPlan(null);
    setShowForm(true);
  };

  return (
    <div className="fixed inset-0 w-screen h-[100dvh] flex flex-col overflow-hidden font-[Urbanist]" style={{ background: 'var(--theme-bg, linear-gradient(135deg, #e0e7ff 0%, #f0fdfa 50%, #fdf2f8 100%))' }}>
      {/* Header */}
      <header className="flex-shrink-0 px-4 pt-16 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-400/30 active:scale-95 transition-transform">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z"/>
              </svg>
            </button>
            <h1 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>Membership Plans</h1>
          </div>
          <UserProfileDropdown />
        </div>
      </header>

      {/* Plans Card */}
      <div className="flex-1 overflow-y-auto min-h-0 pb-24" style={{ overscrollBehavior: 'contain' }}>
      <div className="px-4 pt-3">
        <div className="rounded-[24px] shadow-lg overflow-hidden border border-white/40"
          style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}>

          {/* Card Header */}
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottomWidth: '1px', borderColor: 'var(--theme-glass-border, rgba(226,232,240,0.5))' }}>
            <div>
              <h2 className="text-[15px] font-extrabold" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>Membership Plans</h2>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>Manage your gym's membership options</p>
            </div>
            <motion.button whileTap={{ scale: 0.9 }} onClick={openCreate}
              className="h-8 px-3 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/30 flex items-center justify-center gap-1.5 text-white">
              <Plus className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">Add Plan</span>
            </motion.button>
          </div>

          {/* Plans List */}
          <div className="px-4 py-2">
            {isLoading ? (
              <div className="space-y-3 py-2">
                {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ backgroundColor: 'var(--theme-glass-bg, rgba(241,245,249,0.5))' }} />)}
              </div>
            ) : plans.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-20" style={{ color: 'var(--theme-text-muted, #94a3b8)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary, #334155)' }}>No Plans Yet</p>
                <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>Tap + Add Plan to create your first membership plan</p>
              </div>
            ) : (
              <div className="space-y-2.5 py-1">
                {plans.map((plan) => {
                  const planAny = plan as any;
                  const hasBonus = (planAny.bonus_duration_months || 0) > 0;
                  const baseDur = planAny.base_duration_months || planAny.duration_months || 0;
                  const bonusDur = planAny.bonus_duration_months || 0;
                  const totalDur = planAny.duration_months || (baseDur + bonusDur);
                  const price = Number(plan.price) || 0;

                  return (
                    <div
                      key={plan.id}
                      className={`rounded-2xl p-3.5 border border-white/30 ${!plan.is_active ? 'opacity-50' : ''}`}
                      style={{ backgroundColor: 'var(--theme-glass-bg, rgba(248,250,252,0.6))' }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-[14px] font-extrabold leading-tight" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>
                            {plan.name}
                          </h3>
                          {plan.description && (
                            <p className="text-[11px] mt-0.5 line-clamp-1" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>
                              {plan.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-sm font-extrabold text-emerald-600">{fc(price)}</span>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" style={{ color: 'var(--theme-text-muted, #94a3b8)' }} />
                              <span className="text-[11px] font-medium" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>
                                {totalDur} month{totalDur !== 1 ? 's' : ''}
                                {hasBonus && (
                                  <span className="text-[10px]"> ({baseDur} + {bonusDur} FREE)</span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                          <button onClick={() => openEdit(plan)}
                            className="w-9 h-9 rounded-xl flex items-center justify-center border border-white/40"
                            style={{ backgroundColor: 'var(--theme-glass-bg, rgba(241,245,249,0.8))' }}>
                            <Edit className="w-4 h-4 text-blue-500" />
                          </button>
                          <button onClick={() => setDeleteId(plan.id)}
                            className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-50 border border-red-100">
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Form Dialog Modal - Centered like production */}
      <AnimatePresence>
        {showForm && (
          <PlanFormModal
            plan={editingPlan}
            symbol={symbol}
            onClose={() => { setShowForm(false); setEditingPlan(null); }}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['membership-plans'] });
              setShowForm(false);
              setEditingPlan(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteId && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={() => setDeleteId(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-3xl p-6 z-50 w-[85%] max-w-sm shadow-2xl"
              style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.97))' }}>
              <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--theme-text-primary)' }}>Delete Plan?</h3>
              <p className="text-sm mb-5" style={{ color: 'var(--theme-text-muted)' }}>This cannot be undone. Existing members won't be affected.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-3 rounded-xl font-semibold text-sm border border-slate-200" style={{ color: 'var(--theme-text-secondary)' }}>Cancel</button>
                <button onClick={() => deleteMutation.mutate(deleteId)} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-semibold text-sm">Delete</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Plan Form Modal — Centered Dialog matching production ── */
function PlanFormModal({ plan, symbol, onClose, onSuccess }: {
  plan: MembershipPlan | null;
  symbol: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const planAny = plan as any;
  const [form, setForm] = useState({
    name: plan?.name || '',
    description: plan?.description || '',
    price: plan?.price || 0,
    base_duration_months: planAny?.base_duration_months || planAny?.duration_months || 1,
    bonus_duration_months: planAny?.bonus_duration_months || 0,
    is_active: plan?.is_active ?? true,
    features: plan?.features || [] as string[],
  });

  const totalDuration = form.base_duration_months + form.bonus_duration_months;

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Plan name is required');
      return;
    }
    if (form.price <= 0) {
      toast.error('Price must be greater than 0');
      return;
    }
    setIsSubmitting(true);
    try {
      const input: CreatePlanInput = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: Number(form.price),
        base_duration_months: form.base_duration_months,
        bonus_duration_months: form.bonus_duration_months,
        is_active: form.is_active,
        features: form.features,
      };
      if (plan) {
        await settingsService.updateMembershipPlan(plan.id, input);
        toast.success('Plan updated!');
      } else {
        await settingsService.createMembershipPlan(input);
        toast.success('Plan created!');
      }
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-[380px] rounded-3xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.97))' }}
        onClick={e => e.stopPropagation()}>

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="text-xl font-extrabold" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>
            {plan ? 'Edit Plan' : 'Add New Plan'}
          </h3>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center border border-slate-200 active:scale-90 transition-transform"
            style={{ backgroundColor: 'var(--theme-glass-bg, rgba(241,245,249,0.8))' }}>
            <X className="w-4 h-4" style={{ color: 'var(--theme-text-muted, #64748b)' }} />
          </button>
        </div>

        {/* Form Content */}
        <div className="overflow-y-auto max-h-[65vh] px-5 pb-5 space-y-5">
          {/* Plan Name */}
          <div>
            <label className="text-xs font-bold mb-1.5 block" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>Plan Name *</label>
            <input type="text" value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g., Monthly Basic"
              className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 border"
              style={{
                backgroundColor: 'var(--theme-input-bg, rgba(248,250,252,0.8))',
                borderColor: 'var(--theme-glass-border, rgba(226,232,240,0.8))',
                color: 'var(--theme-text-primary, #1e293b)',
              }} />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold mb-1.5 block" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>Description</label>
            <textarea value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Brief description of the plan..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 border resize-none"
              style={{
                backgroundColor: 'var(--theme-input-bg, rgba(248,250,252,0.8))',
                borderColor: 'var(--theme-glass-border, rgba(226,232,240,0.8))',
                color: 'var(--theme-text-primary, #1e293b)',
              }} />
          </div>

          {/* Price */}
          <div>
            <label className="text-xs font-bold mb-1.5 block" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>Price ({symbol}) *</label>
            <input type="number" min={0} value={form.price}
              onChange={e => setForm(p => ({ ...p, price: parseInt(e.target.value) || 0 }))}
              className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 border"
              style={{
                backgroundColor: 'var(--theme-input-bg, rgba(248,250,252,0.8))',
                borderColor: 'var(--theme-glass-border, rgba(226,232,240,0.8))',
                color: 'var(--theme-text-primary, #1e293b)',
              }} />
          </div>

          {/* Duration Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold mb-1.5 block" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>Base Duration (Months) *</label>
              <input type="number" min={1} value={form.base_duration_months}
                onChange={e => setForm(p => ({ ...p, base_duration_months: parseInt(e.target.value) || 1 }))}
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 border"
                style={{
                  backgroundColor: 'var(--theme-input-bg, rgba(248,250,252,0.8))',
                  borderColor: 'var(--theme-glass-border, rgba(226,232,240,0.8))',
                  color: 'var(--theme-text-primary, #1e293b)',
                }} />
            </div>
            <div>
              <label className="text-xs font-bold mb-1.5 block" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>Bonus Months (FREE)</label>
              <input type="number" min={0} value={form.bonus_duration_months}
                onChange={e => setForm(p => ({ ...p, bonus_duration_months: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 border"
                style={{
                  backgroundColor: 'var(--theme-input-bg, rgba(248,250,252,0.8))',
                  borderColor: 'var(--theme-glass-border, rgba(226,232,240,0.8))',
                  color: 'var(--theme-text-primary, #1e293b)',
                }} />
            </div>
          </div>

          {/* Total Membership Info */}
          {form.bonus_duration_months > 0 && (
            <div className="rounded-xl px-4 py-2.5 bg-emerald-50 border border-emerald-100">
              <p className="text-xs font-bold text-emerald-700">
                Total Membership: <span className="text-emerald-600">{totalDuration} months</span>{' '}
                <span className="font-medium text-emerald-600">(Pay for {form.base_duration_months}, Get {form.bonus_duration_months} FREE!)</span>
              </p>
            </div>
          )}

          {/* Active Toggle */}
          <div className="flex items-center justify-between py-1">
            <span className="text-sm font-bold" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>Active Plan</span>
            <button
              onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
              className={`w-12 h-7 rounded-full transition-colors relative ${form.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Submit Button */}
          <motion.button whileTap={{ scale: 0.98 }} onClick={handleSubmit} disabled={isSubmitting}
            className="w-full py-4 text-white font-bold flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            style={{ background: '#000000', borderRadius: '16px', boxShadow: '0 8px 20px rgba(0,0,0,0.25)' }}>
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><Save className="w-4 h-4" />{plan ? 'Update Plan' : 'Create Plan'}</>
            )}
          </motion.button>
        </div>
      </motion.div>
    </>
  );
}
