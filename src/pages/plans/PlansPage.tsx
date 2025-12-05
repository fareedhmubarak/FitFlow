import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
// date-fns format can be used for date display if needed
import { 
  Plus, Edit, Trash2, Gift, Clock, 
  Tag, Star, X, Check
} from 'lucide-react';
import { supabase, getCurrentGymId } from '@/lib/supabase';
import { gymService, MembershipPlanWithPromo } from '@/lib/gymService';
import { GymLoader } from '@/components/ui/GymLoader';
import toast from 'react-hot-toast';

export default function PlansPage() {
  // Navigation handled inline
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlanWithPromo | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Fetch plans
  const { data: plans, isLoading } = useQuery({
    queryKey: ['membership-plans'],
    queryFn: () => gymService.getMembershipPlans(),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (planId: string) => {
      const gymId = await getCurrentGymId();
      const { error } = await supabase
        .from('gym_membership_plans')
        .delete()
        .eq('id', planId)
        .eq('gym_id', gymId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Plan deleted');
      queryClient.invalidateQueries({ queryKey: ['membership-plans'] });
      setShowDeleteConfirm(null);
    },
    onError: () => {
      toast.error('Failed to delete plan');
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ planId, isActive }: { planId: string; isActive: boolean }) => {
      const gymId = await getCurrentGymId();
      const { error } = await supabase
        .from('gym_membership_plans')
        .update({ is_active: isActive })
        .eq('id', planId)
        .eq('gym_id', gymId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-plans'] });
    },
  });

  const activePlans = plans?.filter(p => p.is_active) || [];
  const inactivePlans = plans?.filter(p => !p.is_active) || [];

  if (isLoading) {
    return <GymLoader message="Loading plans..." />;
  }

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#E0F2FE] flex flex-col overflow-hidden font-[Urbanist]" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
      {/* Static gradient blobs - CSS animation for better performance */}
      <div 
        className="fixed top-[-15%] left-[-15%] w-[70%] h-[55%] bg-[#6EE7B7] rounded-full blur-3xl opacity-40 pointer-events-none z-0 animate-blob" 
      />
      <div 
        className="fixed bottom-[-15%] right-[-15%] w-[70%] h-[55%] bg-[#FCA5A5] rounded-full blur-3xl opacity-40 pointer-events-none z-0 animate-blob animation-delay-4000" 
      />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 px-4 pb-3 relative z-50"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--theme-text-primary)' }}>Membership Plans</h1>
            <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{activePlans.length} active plans</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddModal(true)}
            className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30"
          >
            <Plus className="w-5 h-5 text-white" />
          </motion.button>
        </div>
      </motion.header>

      {/* Plans List */}
      <div className="flex-1 overflow-auto px-4 relative z-10 space-y-4 pb-4">
        {/* Active Plans */}
        {activePlans.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-3 px-1" style={{ color: 'var(--theme-text-muted)' }}>Active Plans</h3>
            <div className="space-y-3">
              {activePlans.map(plan => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  onEdit={() => setEditingPlan(plan)}
                  onDelete={() => setShowDeleteConfirm(plan.id)}
                  onToggleActive={() => toggleActiveMutation.mutate({ planId: plan.id, isActive: false })}
                />
              ))}
            </div>
          </div>
        )}

        {/* Inactive Plans */}
        {inactivePlans.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium mb-3 px-1" style={{ color: 'var(--theme-text-light)' }}>Inactive Plans</h3>
            <div className="space-y-3 opacity-60">
              {inactivePlans.map(plan => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  onEdit={() => setEditingPlan(plan)}
                  onDelete={() => setShowDeleteConfirm(plan.id)}
                  onToggleActive={() => toggleActiveMutation.mutate({ planId: plan.id, isActive: true })}
                />
              ))}
            </div>
          </div>
        )}

        {plans?.length === 0 && (
          <div className="text-center py-12 bg-white/40 backdrop-blur-xl rounded-2xl border border-white/40">
            <Tag className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-600 mb-2">No Plans Yet</h3>
            <p className="text-slate-400 mb-4">Create your first membership plan</p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/30"
            >
              Create Plan
            </motion.button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {(showAddModal || editingPlan) && (
          <PlanFormModal
            plan={editingPlan}
            onClose={() => {
              setShowAddModal(false);
              setEditingPlan(null);
            }}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['membership-plans'] });
              setShowAddModal(false);
              setEditingPlan(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-50"
              onClick={() => setShowDeleteConfirm(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl p-6 z-50 w-[90%] max-w-sm"
              style={{ backgroundColor: 'var(--theme-card-bg, rgba(255, 255, 255, 0.95))' }}
            >
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--theme-text-primary)' }}>Delete Plan?</h3>
              <p className="text-sm mb-4" style={{ color: 'var(--theme-text-muted)' }}>
                This action cannot be undone. Members using this plan won't be affected.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteMutation.mutate(showDeleteConfirm)}
                  className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-medium"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Plan Card Component
function PlanCard({ plan, onEdit, onDelete, onToggleActive }: {
  plan: MembershipPlanWithPromo;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}) {
  const isPromo = plan.promo_type === 'promotional' || (plan.bonus_duration_months && plan.bonus_duration_months > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl shadow-sm border overflow-hidden ${
        isPromo ? 'border-amber-200' : ''
      }`}
      style={{ 
        backgroundColor: 'var(--theme-card-bg, rgba(255, 255, 255, 0.9))',
        borderColor: isPromo ? undefined : 'var(--theme-glass-border, rgba(226, 232, 240, 0.8))'
      }}
    >
      {/* Promo Banner */}
      {isPromo && plan.highlight_text && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-1">
          <p className="text-xs font-medium text-white flex items-center gap-1">
            <Star className="w-3 h-3" />
            {plan.highlight_text}
          </p>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{plan.name}</h3>
            {plan.description && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>{plan.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onEdit} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
              <Edit className="w-4 h-4 text-slate-500" />
            </button>
            <button onClick={onDelete} className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
              <Trash2 className="w-4 h-4 text-red-500" />
            </button>
          </div>
        </div>

        {/* Duration & Price */}
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" style={{ color: 'var(--theme-text-light)' }} />
            <span className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
              {plan.total_duration_months || plan.duration_months} month{(plan.total_duration_months || plan.duration_months) !== 1 ? 's' : ''}
              {plan.bonus_duration_months && plan.bonus_duration_months > 0 && (
                <span className="text-emerald-600 font-medium"> (+{plan.bonus_duration_months} FREE)</span>
              )}
            </span>
          </div>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-2xl font-bold" style={{ color: 'var(--theme-text-primary)' }}>
            ₹{(plan.final_price || plan.price).toLocaleString('en-IN')}
          </span>
          {plan.discount_type !== 'none' && plan.base_price && (
            <span className="text-sm line-through" style={{ color: 'var(--theme-text-light)' }}>
              ₹{plan.base_price.toLocaleString('en-IN')}
            </span>
          )}
          {plan.discount_type === 'percentage' && plan.discount_value && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
              {plan.discount_value}% OFF
            </span>
          )}
        </div>

        {/* Promo Description */}
        {plan.promo_description && (
          <div className="bg-amber-50 rounded-lg px-3 py-2 mb-3">
            <p className="text-xs text-amber-700 flex items-center gap-1">
              <Gift className="w-3 h-3" />
              {plan.promo_description}
            </p>
          </div>
        )}

        {/* Toggle Active */}
        <button
          onClick={onToggleActive}
          className={`w-full py-2 rounded-lg text-sm font-medium ${
            plan.is_active 
              ? 'bg-slate-100 text-slate-600' 
              : 'bg-emerald-500 text-white'
          }`}
        >
          {plan.is_active ? 'Deactivate' : 'Activate'}
        </button>
      </div>
    </motion.div>
  );
}

// Plan Form Modal
function PlanFormModal({ plan, onClose, onSuccess }: {
  plan: MembershipPlanWithPromo | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: plan?.name || '',
    description: plan?.description || '',
    base_duration_months: plan?.base_duration_months || plan?.duration_months || 1,
    bonus_duration_months: plan?.bonus_duration_months || 0,
    base_price: plan?.base_price || plan?.price || 1000,
    discount_type: plan?.discount_type || 'none' as 'none' | 'percentage' | 'flat',
    discount_value: plan?.discount_value || 0,
    promo_description: plan?.promo_description || '',
    highlight_text: plan?.highlight_text || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate final price
  const finalPrice = formData.discount_type === 'percentage'
    ? formData.base_price * (1 - formData.discount_value / 100)
    : formData.discount_type === 'flat'
    ? formData.base_price - formData.discount_value
    : formData.base_price;

  const totalDuration = formData.base_duration_months + formData.bonus_duration_months;

  const handleSubmit = async () => {
    if (!formData.name || formData.base_price <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID');

      const planData = {
        gym_id: gymId,
        name: formData.name,
        description: formData.description || null,
        duration_months: formData.base_duration_months,
        base_duration_months: formData.base_duration_months,
        bonus_duration_months: formData.bonus_duration_months,
        price: formData.base_price,
        base_price: formData.base_price,
        final_price: finalPrice,
        discount_type: formData.discount_type,
        discount_value: formData.discount_value,
        promo_type: formData.bonus_duration_months > 0 || formData.discount_type !== 'none' ? 'promotional' : 'standard',
        promo_description: formData.promo_description || null,
        highlight_text: formData.highlight_text || null,
        is_active: true,
      };

      if (plan) {
        // Update
        const { error } = await supabase
          .from('gym_membership_plans')
          .update(planData)
          .eq('id', plan.id)
          .eq('gym_id', gymId);
        if (error) throw error;
        toast.success('Plan updated!');
      } else {
        // Create
        const { error } = await supabase
          .from('gym_membership_plans')
          .insert(planData);
        if (error) throw error;
        toast.success('Plan created!');
      }

      onSuccess();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save plan';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="backdrop-blur-2xl rounded-[28px] w-full max-w-[420px] max-h-[85vh] overflow-hidden shadow-2xl"
          style={{ backgroundColor: 'var(--theme-card-bg, rgba(255, 255, 255, 0.95))' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b bg-gradient-to-r from-emerald-50 to-cyan-50" style={{ borderColor: 'var(--theme-glass-border, rgba(226, 232, 240, 0.8))' }}>
            <h3 className="font-semibold text-lg" style={{ color: 'var(--theme-text-primary)' }}>
              {plan ? 'Edit Plan' : 'Create Plan'}
            </h3>
            <button onClick={onClose} className="w-9 h-9 rounded-full shadow-sm flex items-center justify-center transition-colors" style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255, 255, 255, 0.8))' }}>
              <X className="w-4 h-4" style={{ color: 'var(--theme-text-muted)' }} />
            </button>
          </div>

        {/* Form */}
        <div className="overflow-y-auto max-h-[70vh] p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--theme-text-secondary)' }}>Plan Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Monthly, Annual, etc."
              className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              style={{ 
                backgroundColor: 'var(--theme-input-bg, rgba(248, 250, 252, 0.8))',
                borderColor: 'var(--theme-glass-border, rgba(226, 232, 240, 0.8))',
                color: 'var(--theme-text-primary)'
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--theme-text-secondary)' }}>Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description"
              className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              style={{ 
                backgroundColor: 'var(--theme-input-bg, rgba(248, 250, 252, 0.8))',
                borderColor: 'var(--theme-glass-border, rgba(226, 232, 240, 0.8))',
                color: 'var(--theme-text-primary)'
              }}
            />
          </div>

          {/* Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--theme-text-secondary)' }}>Duration (months) *</label>
              <input
                type="number"
                min="1"
                value={formData.base_duration_months}
                onChange={e => setFormData(prev => ({ ...prev, base_duration_months: parseInt(e.target.value) || 1 }))}
                className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                style={{ 
                  backgroundColor: 'var(--theme-input-bg, rgba(248, 250, 252, 0.8))',
                  borderColor: 'var(--theme-glass-border, rgba(226, 232, 240, 0.8))',
                  color: 'var(--theme-text-primary)'
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--theme-text-secondary)' }}>Bonus Months (FREE)</label>
              <input
                type="number"
                min="0"
                value={formData.bonus_duration_months}
                onChange={e => setFormData(prev => ({ ...prev, bonus_duration_months: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                style={{ 
                  backgroundColor: 'var(--theme-input-bg, rgba(248, 250, 252, 0.8))',
                  borderColor: 'var(--theme-glass-border, rgba(226, 232, 240, 0.8))',
                  color: 'var(--theme-text-primary)'
                }}
              />
            </div>
          </div>

          {/* Total Duration Preview */}
          {formData.bonus_duration_months > 0 && (
            <div className="bg-emerald-50 rounded-xl px-4 py-3">
              <p className="text-sm text-emerald-700">
                <span className="font-semibold">Total validity:</span> {totalDuration} months 
                <span className="text-emerald-600"> (Pay for {formData.base_duration_months}, Get {formData.bonus_duration_months} FREE!)</span>
              </p>
            </div>
          )}

          {/* Price */}
          <div>
            <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--theme-text-secondary)' }}>Base Price (₹) *</label>
            <input
              type="number"
              min="0"
              value={formData.base_price}
              onChange={e => setFormData(prev => ({ ...prev, base_price: parseInt(e.target.value) || 0 }))}
              className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              style={{ 
                backgroundColor: 'var(--theme-input-bg, rgba(248, 250, 252, 0.8))',
                borderColor: 'var(--theme-glass-border, rgba(226, 232, 240, 0.8))',
                color: 'var(--theme-text-primary)'
              }}
            />
          </div>

          {/* Discount Type */}
          <div>
            <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--theme-text-secondary)' }}>Discount Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(['none', 'percentage', 'flat'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setFormData(prev => ({ ...prev, discount_type: type, discount_value: 0 }))}
                  className={`py-2.5 rounded-xl text-sm font-medium border ${
                    formData.discount_type === type
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : ''
                  }`}
                  style={formData.discount_type !== type ? {
                    backgroundColor: 'var(--theme-glass-bg, rgba(255, 255, 255, 0.8))',
                    borderColor: 'var(--theme-glass-border, rgba(226, 232, 240, 0.8))',
                    color: 'var(--theme-text-secondary)'
                  } : undefined}
                >
                  {type === 'none' ? 'No Discount' : type === 'percentage' ? 'Percentage' : 'Flat Amount'}
                </button>
              ))}
            </div>
          </div>

          {/* Discount Value */}
          {formData.discount_type !== 'none' && (
            <div>
              <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--theme-text-secondary)' }}>
                Discount {formData.discount_type === 'percentage' ? '(%)' : '(₹)'}
              </label>
              <input
                type="number"
                min="0"
                max={formData.discount_type === 'percentage' ? 100 : formData.base_price}
                value={formData.discount_value}
                onChange={e => setFormData(prev => ({ ...prev, discount_value: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                style={{ 
                  backgroundColor: 'var(--theme-input-bg, rgba(248, 250, 252, 0.8))',
                  borderColor: 'var(--theme-glass-border, rgba(226, 232, 240, 0.8))',
                  color: 'var(--theme-text-primary)'
                }}
              />
            </div>
          )}

          {/* Final Price Preview */}
          <div className="rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--theme-glass-bg, rgba(241, 245, 249, 0.8))' }}>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>Final Price:</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold" style={{ color: 'var(--theme-text-primary)' }}>₹{finalPrice.toLocaleString('en-IN')}</span>
                {formData.discount_type !== 'none' && formData.discount_value > 0 && (
                  <span className="text-sm line-through" style={{ color: 'var(--theme-text-light)' }}>₹{formData.base_price.toLocaleString('en-IN')}</span>
                )}
              </div>
            </div>
          </div>

          {/* Promo Description */}
          <div>
            <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--theme-text-secondary)' }}>Promo Description</label>
            <input
              type="text"
              value={formData.promo_description}
              onChange={e => setFormData(prev => ({ ...prev, promo_description: e.target.value }))}
              placeholder="e.g., Buy 12 months, Get 6 months FREE!"
              className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              style={{ 
                backgroundColor: 'var(--theme-input-bg, rgba(248, 250, 252, 0.8))',
                borderColor: 'var(--theme-glass-border, rgba(226, 232, 240, 0.8))',
                color: 'var(--theme-text-primary)'
              }}
            />
          </div>

          {/* Highlight Text */}
          <div>
            <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--theme-text-secondary)' }}>Banner Text (optional)</label>
            <input
              type="text"
              value={formData.highlight_text}
              onChange={e => setFormData(prev => ({ ...prev, highlight_text: e.target.value }))}
              placeholder="e.g., BEST VALUE!, LIMITED OFFER"
              className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              style={{ 
                backgroundColor: 'var(--theme-input-bg, rgba(248, 250, 252, 0.8))',
                borderColor: 'var(--theme-glass-border, rgba(226, 232, 240, 0.8))',
                color: 'var(--theme-text-primary)'
              }}
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="p-4 border-t" style={{ borderColor: 'var(--theme-glass-border, rgba(226, 232, 240, 0.8))' }}>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Check className="w-5 h-5" />
                {plan ? 'Update Plan' : 'Create Plan'}
              </>
            )}
          </motion.button>
        </div>
        </motion.div>
      </motion.div>
    </>
  );
}
