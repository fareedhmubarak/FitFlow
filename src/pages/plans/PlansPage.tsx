import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, Clock, Gift,
  Edit, Trash2, X, Check, ToggleLeft, ToggleRight, CreditCard
} from 'lucide-react';
import { settingsService, type MembershipPlan, type CreatePlanInput } from '@/lib/settingsService';
import { useCurrency } from '@/hooks/useCurrency';
import toast from 'react-hot-toast';

export default function PlansPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { fc } = useCurrency();
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

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => settingsService.togglePlanActive(id, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['membership-plans'] }),
  });

  const activePlans = plans.filter(p => p.is_active);
  const inactivePlans = plans.filter(p => !p.is_active);

  const openEdit = (plan: MembershipPlan) => {
    setEditingPlan(plan);
    setShowForm(true);
  };

  const openCreate = () => {
    setEditingPlan(null);
    setShowForm(true);
  };

  return (
    <div className="min-h-screen font-[Urbanist] pb-24" style={{ background: 'var(--theme-bg, linear-gradient(135deg, #e0e7ff 0%, #f0fdfa 50%, #fdf2f8 100%))' }}>
      {/* Header */}
      <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex-shrink-0 px-4 pt-12 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)}
              className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm border border-white/50 active:scale-95 transition-transform"
              style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}>
              <ArrowLeft className="w-4 h-4" style={{ color: 'var(--theme-text-primary, #1e293b)' }} />
            </button>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>Membership Plans</h1>
              <p className="text-[10px] font-medium" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{activePlans.length} active · {inactivePlans.length} inactive</p>
            </div>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={openCreate}
            className="w-10 h-10 flex items-center justify-center"
            style={{ backgroundColor: '#000000', borderRadius: '12px', boxShadow: '0 8px 20px rgba(0,0,0,0.25)' }}>
            <Plus className="w-5 h-5 text-white" />
          </motion.button>
        </div>
      </motion.header>

      {/* Plans List */}
      <div className="px-4 pt-3 space-y-3">
        {isLoading ? (
          [...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.5))' }} />)
        ) : plans.length === 0 ? (
          <div className="text-center py-16">
            <CreditCard className="w-14 h-14 mx-auto mb-3 opacity-20" style={{ color: 'var(--theme-text-muted, #94a3b8)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary, #334155)' }}>No Plans Yet</p>
            <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>Tap + to create your first membership plan</p>
          </div>
        ) : (
          <>
            {activePlans.length > 0 && (
              <>
                <p className="text-[10px] font-bold uppercase tracking-wider px-1" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>Active Plans</p>
                {activePlans.map((plan, idx) => (
                  <PlanCard key={plan.id} plan={plan} idx={idx} fc={fc}
                    onEdit={() => openEdit(plan)}
                    onDelete={() => setDeleteId(plan.id)}
                    onToggle={() => toggleMutation.mutate({ id: plan.id, active: false })} />
                ))}
              </>
            )}
            {inactivePlans.length > 0 && (
              <>
                <p className="text-[10px] font-bold uppercase tracking-wider px-1 mt-4" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>Inactive Plans</p>
                {inactivePlans.map((plan, idx) => (
                  <PlanCard key={plan.id} plan={plan} idx={idx} fc={fc} inactive
                    onEdit={() => openEdit(plan)}
                    onDelete={() => setDeleteId(plan.id)}
                    onToggle={() => toggleMutation.mutate({ id: plan.id, active: true })} />
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <PlanFormModal
            plan={editingPlan}
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
              className="fixed inset-0 bg-black/30 z-50" onClick={() => setDeleteId(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl p-6 z-50 w-[90%] max-w-sm"
              style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.95))' }}>
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--theme-text-primary)' }}>Delete Plan?</h3>
              <p className="text-sm mb-4" style={{ color: 'var(--theme-text-muted)' }}>This cannot be undone. Existing members won't be affected.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl font-medium text-sm" style={{ backgroundColor: 'var(--theme-glass-bg, rgba(241,245,249,0.8))', color: 'var(--theme-text-secondary)' }}>Cancel</button>
                <button onClick={() => deleteMutation.mutate(deleteId)} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-medium text-sm">Delete</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Plan Card ── */
function PlanCard({ plan, idx, fc, inactive, onEdit, onDelete, onToggle }: {
  plan: MembershipPlan;
  idx: number;
  fc: (n: number) => string;
  inactive?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const planAny = plan as any;
  const hasBonus = (planAny.bonus_duration_months || 0) > 0;
  const baseDur = planAny.base_duration_months || planAny.duration_months || 0;
  const bonusDur = planAny.bonus_duration_months || 0;
  const totalDur = planAny.duration_months || (baseDur + bonusDur);
  const price = Number(plan.price) || 0;
  const perMonth = totalDur > 0 ? Math.round(price / totalDur) : price;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(idx * 0.04, 0.25) }}
      className={`rounded-2xl shadow-md border border-white/40 overflow-hidden ${inactive ? 'opacity-50' : ''}`}
      style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}
    >
      {hasBonus && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 flex items-center gap-1">
          <Gift className="w-3 h-3 text-white" />
          <span className="text-[10px] font-bold text-white">
            Pay {baseDur}M, Get {bonusDur}M FREE!
          </span>
        </div>
      )}

      <div className="p-3.5">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-[14px] font-bold leading-tight" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{plan.name}</h3>
            {plan.description && (
              <p className="text-[10px] mt-0.5 line-clamp-1" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{plan.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
            <button onClick={onEdit} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--theme-glass-bg, rgba(241,245,249,0.8))' }}>
              <Edit className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-muted, #64748b)' }} />
            </button>
            <button onClick={onDelete} className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-50">
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
            </button>
          </div>
        </div>

        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-muted, #94a3b8)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--theme-text-secondary, #475569)' }}>
                {totalDur} month{totalDur !== 1 ? 's' : ''}
              </span>
            </div>
            {plan.features && plan.features.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {plan.features.slice(0, 3).map((f, i) => (
                  <span key={i} className="text-[8px] font-medium px-1.5 py-0.5 rounded-full border border-white/30"
                    style={{ backgroundColor: 'var(--theme-glass-bg, rgba(241,245,249,0.6))', color: 'var(--theme-text-muted, #64748b)' }}>
                    {f}
                  </span>
                ))}
                {plan.features.length > 3 && (
                  <span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>+{plan.features.length - 3}</span>
                )}
              </div>
            )}
          </div>

          <div className="text-right">
            <p className="text-lg font-extrabold leading-none" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{fc(price)}</p>
            {totalDur > 1 && (
              <p className="text-[9px] font-medium mt-0.5" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{fc(perMonth)}/mo</p>
            )}
          </div>
        </div>

        <button onClick={onToggle}
          className="w-full mt-2.5 py-1.5 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
          style={{
            backgroundColor: plan.is_active ? 'var(--theme-glass-bg, rgba(241,245,249,0.8))' : 'rgba(16,185,129,0.1)',
            color: plan.is_active ? 'var(--theme-text-muted, #64748b)' : '#10b981'
          }}>
          {plan.is_active ? <><ToggleRight className="w-3.5 h-3.5" /> Deactivate</> : <><ToggleLeft className="w-3.5 h-3.5" /> Activate</>}
        </button>
      </div>
    </motion.div>
  );
}

/* ── Plan Form Modal ── */
function PlanFormModal({ plan, onClose, onSuccess }: {
  plan: MembershipPlan | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { symbol } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const planAny = plan as any;
  const [form, setForm] = useState({
    name: plan?.name || '',
    description: plan?.description || '',
    price: plan?.price || 1000,
    base_duration_months: planAny?.base_duration_months || planAny?.duration_months || 1,
    bonus_duration_months: planAny?.bonus_duration_months || 0,
    is_active: plan?.is_active ?? true,
    features: plan?.features || [] as string[],
  });
  const [featureInput, setFeatureInput] = useState('');

  const totalDuration = form.base_duration_months + form.bonus_duration_months;

  const addFeature = () => {
    const f = featureInput.trim();
    if (f && !form.features.includes(f)) {
      setForm(prev => ({ ...prev, features: [...prev.features, f] }));
      setFeatureInput('');
    }
  };

  const removeFeature = (idx: number) => {
    setForm(prev => ({ ...prev, features: prev.features.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || form.price <= 0) {
      toast.error('Name and price are required');
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

  const inputStyle = {
    backgroundColor: 'var(--theme-input-bg, rgba(248,250,252,0.8))',
    borderColor: 'var(--theme-glass-border, rgba(226,232,240,0.8))',
    color: 'var(--theme-text-primary)',
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-[28px] max-h-[90vh] overflow-hidden shadow-2xl"
        style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.97))' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        <div className="flex items-center justify-between px-5 pb-3">
          <h3 className="text-lg font-bold" style={{ color: 'var(--theme-text-primary)' }}>
            {plan ? 'Edit Plan' : 'New Plan'}
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--theme-glass-bg, rgba(241,245,249,0.8))' }}>
            <X className="w-4 h-4" style={{ color: 'var(--theme-text-muted)' }} />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[70vh] px-5 pb-5 space-y-4">
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--theme-text-secondary)' }}>Plan Name *</label>
            <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g., Monthly, Quarterly, Annual"
              className="w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" style={inputStyle} />
          </div>

          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--theme-text-secondary)' }}>Description</label>
            <input type="text" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Brief description"
              className="w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" style={inputStyle} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--theme-text-secondary)' }}>Duration (months) *</label>
              <input type="number" min={1} value={form.base_duration_months}
                onChange={e => setForm(p => ({ ...p, base_duration_months: parseInt(e.target.value) || 1 }))}
                className="w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" style={inputStyle} />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--theme-text-secondary)' }}>Bonus FREE Months</label>
              <input type="number" min={0} value={form.bonus_duration_months}
                onChange={e => setForm(p => ({ ...p, bonus_duration_months: parseInt(e.target.value) || 0 }))}
                className="w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" style={inputStyle} />
            </div>
          </div>

          {form.bonus_duration_months > 0 && (
            <div className="bg-emerald-50 rounded-xl px-3 py-2">
              <p className="text-xs text-emerald-700 font-medium">
                Total: {totalDuration} months (Pay {form.base_duration_months}, Get {form.bonus_duration_months} FREE)
              </p>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--theme-text-secondary)' }}>Price ({symbol}) *</label>
            <input type="number" min={0} value={form.price}
              onChange={e => setForm(p => ({ ...p, price: parseInt(e.target.value) || 0 }))}
              className="w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" style={inputStyle} />
          </div>

          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--theme-text-secondary)' }}>Features</label>
            <div className="flex gap-2">
              <input type="text" value={featureInput} onChange={e => setFeatureInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                placeholder="e.g., Full gym access"
                className="flex-1 px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" style={inputStyle} />
              <button onClick={addFeature} className="px-3 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-medium">Add</button>
            </div>
            {form.features.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.features.map((f, i) => (
                  <span key={i} className="text-[10px] font-medium pl-2 pr-1 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200 bg-emerald-50 text-emerald-700">
                    {f}
                    <button onClick={() => removeFeature(i)} className="w-3.5 h-3.5 rounded-full bg-emerald-200 flex items-center justify-center">
                      <X className="w-2 h-2" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <motion.button whileTap={{ scale: 0.98 }} onClick={handleSubmit} disabled={isSubmitting}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 text-sm disabled:opacity-50">
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><Check className="w-4 h-4" />{plan ? 'Update Plan' : 'Create Plan'}</>
            )}
          </motion.button>
        </div>
      </motion.div>
    </>
  );
}
