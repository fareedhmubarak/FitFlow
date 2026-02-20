import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, MessageCircle, Trash2, Dumbbell } from 'lucide-react';
import { useWorkoutPlanDetail, useDeleteWorkoutPlan } from '@/hooks/useWorkoutPlans';
import { WORKOUT_GOALS, WORKOUT_LEVELS, MUSCLE_GROUPS } from '@/types/workoutPlan';
import toast from 'react-hot-toast';

export default function WorkoutPlanDetail() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { data: plan, isLoading } = useWorkoutPlanDetail(planId);
  const deletePlan = useDeleteWorkoutPlan();

  if (isLoading) {
    return (
      <div className="min-h-screen font-[Urbanist] p-4 space-y-3" style={{ background: 'var(--theme-bg, linear-gradient(135deg, #e0e7ff 0%, #f0fdfa 50%, #fdf2f8 100%))' }}>
        <div className="skeleton-shimmer h-10 w-40 rounded-xl" />
        <div className="skeleton-shimmer h-24 rounded-2xl" />
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton-shimmer h-32 rounded-2xl" />)}
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen font-[Urbanist] flex items-center justify-center" style={{ background: 'var(--theme-bg, linear-gradient(135deg, #e0e7ff 0%, #f0fdfa 50%, #fdf2f8 100%))' }}>
        <p className="text-sm" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>Plan not found</p>
      </div>
    );
  }

  const goalInfo = WORKOUT_GOALS[plan.goal] || WORKOUT_GOALS.general_fitness;
  const levelInfo = WORKOUT_LEVELS[plan.level] || WORKOUT_LEVELS.beginner;

  const handleDelete = () => {
    if (!plan.is_template) {
      deletePlan.mutate(plan.id, {
        onSuccess: () => { toast.success('Plan deleted'); navigate(-1); },
        onError: () => toast.error('Failed to delete'),
      });
    }
  };

  const generateShareText = () => {
    let text = `🏋️ *${plan.name}*\nGoal: ${plan.goal.replace('_', ' ')} | ${levelInfo.label}\n${plan.days_per_week} days/week\n\n`;
    for (const day of plan.days) {
      text += `📅 *${day.day_name}*\n`;
      for (const ex of day.exercises) {
        text += `  • ${ex.name} — ${ex.sets}×${ex.reps}`;
        if (ex.rest) text += ` (rest ${ex.rest})`;
        text += '\n';
      }
      text += '\n';
    }
    if (plan.notes) text += `📝 ${plan.notes}\n`;
    return text;
  };

  return (
    <div className="min-h-screen font-[Urbanist] pb-24" style={{ background: 'var(--theme-bg, linear-gradient(135deg, #e0e7ff 0%, #f0fdfa 50%, #fdf2f8 100%))' }}>
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 px-4 pt-16 pb-2"
      >
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm border border-white/50 active:scale-95 transition-transform"
            style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}>
            <ArrowLeft className="w-4 h-4" style={{ color: 'var(--theme-text-primary, #1e293b)' }} />
          </button>
          <h1 className="text-xl font-extrabold tracking-tight flex-1 truncate" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{plan.name}</h1>
          {!plan.is_template && (
            <button onClick={handleDelete}
              className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm border border-white/50 hover:bg-red-50 active:scale-95 transition-transform"
              style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}>
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          )}
        </div>
      </motion.header>

      <div className="px-4 space-y-3">
        {/* Info Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4 shadow-md border border-white/40"
          style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}>
          {plan.description && (
            <p className="text-xs mb-3" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>{plan.description}</p>
          )}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full bg-gradient-to-r ${goalInfo.color} text-white`}>
              {goalInfo.emoji} {goalInfo.label}
            </span>
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-white/60 border border-white/30" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>
              {levelInfo.emoji} {levelInfo.label}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs font-extrabold" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{plan.days_per_week}</p>
              <p className="text-[8px]" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>Days/Week</p>
            </div>
            <div>
              <p className="text-xs font-extrabold" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{plan.days.reduce((s, d) => s + d.exercises.length, 0)}</p>
              <p className="text-[8px]" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>Exercises</p>
            </div>
            {plan.duration_weeks && (
              <div>
                <p className="text-xs font-extrabold" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{plan.duration_weeks}</p>
                <p className="text-[8px]" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>Weeks</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Workout Days */}
        {plan.days.map((day, idx) => (
          <motion.div key={idx} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(idx * 0.06, 0.4) }}
            className="rounded-2xl overflow-hidden shadow-sm border border-white/40"
            style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}>
            {/* Muscle Group Banner */}
            <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(168,85,247,0.08) 100%)' }}>
              <div className="flex items-center gap-1">
                {day.muscle_groups.map((mg) => (
                  <span key={mg} className="text-base">{MUSCLE_GROUPS[mg]?.emoji}</span>
                ))}
              </div>
              <div className="flex flex-wrap gap-1">
                {day.muscle_groups.map((mg) => (
                  <span key={mg} className="text-[9px] font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ background: 'linear-gradient(135deg, #6366F1, #A855F7)' }}>
                    {MUSCLE_GROUPS[mg]?.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="p-3">
              <h3 className="text-xs font-bold mb-2" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{day.day_name}</h3>
              <div className="space-y-1">
                {day.exercises.map((ex, i) => (
                  <div key={i} className="flex items-center justify-between py-1 border-b border-white/20 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold truncate" style={{ color: 'var(--theme-text-primary, #334155)' }}>{ex.name}</p>
                      {ex.notes && <p className="text-[9px]" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{ex.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-[10px] font-bold text-blue-500">{ex.sets}×{ex.reps}</span>
                    {ex.rest && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/40" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>
                        {ex.rest}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            </div>
          </motion.div>
        ))}

        {/* Notes */}
        {plan.notes && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-2xl p-3 shadow-sm border border-white/40"
            style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}>
            <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>📝 Notes</p>
            <p className="text-xs" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{plan.notes}</p>
          </motion.div>
        )}

        {/* Share Button */}
        <motion.button whileTap={{ scale: 0.95 }}
          onClick={() => {
            const text = generateShareText();
            const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
            window.open(url, '_blank', 'noopener,noreferrer');
          }}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-sm shadow-lg shadow-green-500/25 flex items-center justify-center gap-2">
          <MessageCircle className="w-4 h-4" /> Share via WhatsApp
        </motion.button>
      </div>
    </div>
  );
}
