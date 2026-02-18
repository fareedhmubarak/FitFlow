import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, MessageCircle, Flame, Trash2 } from 'lucide-react';
import { useDietPlanDetail, useDeleteDietPlan } from '@/hooks/useDietPlans';
import { DIET_GOALS, DIET_TYPES } from '@/types/dietPlan';
import toast from 'react-hot-toast';

export default function DietPlanDetail() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { data: plan, isLoading } = useDietPlanDetail(planId);
  const deletePlan = useDeleteDietPlan();

  if (isLoading) {
    return (
      <div className="min-h-screen font-[Urbanist] p-4 space-y-3" style={{ backgroundColor: 'var(--theme-bg, #E0F2FE)' }}>
        <div className="skeleton-shimmer h-10 w-40 rounded-xl" />
        <div className="skeleton-shimmer h-32 rounded-2xl" />
        {[...Array(5)].map((_, i) => <div key={i} className="skeleton-shimmer h-20 rounded-2xl" />)}
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen font-[Urbanist] flex items-center justify-center" style={{ backgroundColor: 'var(--theme-bg, #E0F2FE)' }}>
        <p className="text-sm" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>Plan not found</p>
      </div>
    );
  }

  const goalInfo = DIET_GOALS[plan.goal] || DIET_GOALS.general_fitness;
  const typeInfo = DIET_TYPES[plan.diet_type] || DIET_TYPES.vegetarian;

  const handleDelete = () => {
    if (!plan.is_template) {
      deletePlan.mutate(plan.id, {
        onSuccess: () => { toast.success('Plan deleted'); navigate(-1); },
        onError: () => toast.error('Failed to delete'),
      });
    }
  };

  return (
    <div className="min-h-screen font-[Urbanist] pb-24" style={{ backgroundColor: 'var(--theme-bg, #E0F2FE)' }}>
      {/* Header */}
      <header className="sticky top-0 z-30 px-4 pt-3 pb-2 backdrop-blur-xl" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-3">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl flex items-center justify-center backdrop-blur-md"
            style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.5))' }}>
            <ChevronLeft className="w-5 h-5" style={{ color: 'var(--theme-text-primary, #0f172a)' }} />
          </motion.button>
          <h1 className="text-lg font-bold tracking-tight flex-1 truncate" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>{plan.name}</h1>
          {!plan.is_template && (
            <motion.button whileTap={{ scale: 0.8 }} onClick={handleDelete}
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-red-50">
              <Trash2 className="w-4 h-4 text-red-400" />
            </motion.button>
          )}
        </div>
      </header>

      <div className="px-4 space-y-3">
        {/* Info Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="backdrop-blur-xl rounded-2xl p-4 shadow-md border border-white/30"
          style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.75))' }}>
          {plan.description && (
            <p className="text-xs mb-3" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>{plan.description}</p>
          )}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full bg-gradient-to-r ${goalInfo.color} text-white`}>{goalInfo.label}</span>
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-white/60 border border-white/30" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>{typeInfo.emoji} {typeInfo.label}</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {plan.target_calories && (
              <div className="text-center">
                <Flame className="w-4 h-4 text-orange-400 mx-auto mb-0.5" />
                <p className="text-xs font-extrabold" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{plan.target_calories}</p>
                <p className="text-[8px]" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>kcal</p>
              </div>
            )}
            {plan.protein_g && (
              <div className="text-center">
                <p className="text-sm mb-0.5">💪</p>
                <p className="text-xs font-extrabold" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{plan.protein_g}g</p>
                <p className="text-[8px]" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>Protein</p>
              </div>
            )}
            {plan.carbs_g && (
              <div className="text-center">
                <p className="text-sm mb-0.5">🌾</p>
                <p className="text-xs font-extrabold" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{plan.carbs_g}g</p>
                <p className="text-[8px]" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>Carbs</p>
              </div>
            )}
            {plan.fat_g && (
              <div className="text-center">
                <p className="text-sm mb-0.5">🫒</p>
                <p className="text-xs font-extrabold" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{plan.fat_g}g</p>
                <p className="text-[8px]" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>Fat</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Meals */}
        {(plan.meals || []).map((meal, idx) => (
          <motion.div key={idx} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(idx * 0.05, 0.4) }}
            className="backdrop-blur-xl rounded-2xl p-3 shadow-sm border border-white/30"
            style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.6))' }}>
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-xs font-bold" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{meal.meal_name}</h3>
              <div className="flex items-center gap-2">
                {meal.calories && (
                  <span className="text-[9px] font-semibold text-orange-500">{meal.calories} kcal</span>
                )}
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/50" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>
                  {meal.time}
                </span>
              </div>
            </div>
            <ul className="space-y-0.5">
              {meal.items.map((item, i) => (
                <li key={i} className="text-[11px] flex items-start gap-1.5" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>
                  <span className="text-emerald-400 mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}

        {/* Notes */}
        {plan.notes && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="backdrop-blur-xl rounded-2xl p-3 shadow-sm border border-white/30"
            style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.5))' }}>
            <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>📝 Notes</p>
            <p className="text-xs" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{plan.notes}</p>
          </motion.div>
        )}

        {/* Share Button */}
        <motion.button whileTap={{ scale: 0.95 }}
          onClick={() => {
            let text = `🥗 *${plan.name}*\nGoal: ${plan.goal.replace('_', ' ')} | ${plan.diet_type.replace('_', ' ')}\n`;
            if (plan.target_calories) text += `~${plan.target_calories} kcal\n`;
            text += '\n';
            for (const meal of plan.meals || []) {
              text += `🕐 *${meal.meal_name}* (${meal.time})\n`;
              for (const item of meal.items) text += `  • ${item}\n`;
              text += '\n';
            }
            if (plan.notes) text += `📝 ${plan.notes}\n`;
            if (navigator.share) {
              navigator.share({ title: plan.name, text }).catch(() => {});
            } else {
              navigator.clipboard.writeText(text);
              toast.success('Plan copied to clipboard!');
            }
          }}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-sm shadow-lg shadow-green-500/25 flex items-center justify-center gap-2">
          <MessageCircle className="w-4 h-4" /> Share via WhatsApp
        </motion.button>
      </div>
    </div>
  );
}
