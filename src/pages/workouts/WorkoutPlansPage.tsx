import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Search, Plus, Dumbbell, Clock } from 'lucide-react';
import { useWorkoutPlans } from '@/hooks/useWorkoutPlans';
import { WORKOUT_GOALS, WORKOUT_LEVELS, type WorkoutGoal, type WorkoutLevel } from '@/types/workoutPlan';

export default function WorkoutPlansPage() {
  const navigate = useNavigate();
  const { data: plans, isLoading } = useWorkoutPlans();
  const [search, setSearch] = useState('');
  const [goalFilter, setGoalFilter] = useState<WorkoutGoal | 'all'>('all');
  const [levelFilter, setLevelFilter] = useState<WorkoutLevel | 'all'>('all');

  const filtered = useMemo(() => {
    if (!plans) return [];
    return plans.filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (goalFilter !== 'all' && p.goal !== goalFilter) return false;
      if (levelFilter !== 'all' && p.level !== levelFilter) return false;
      return true;
    });
  }, [plans, search, goalFilter, levelFilter]);

  return (
    <div className="min-h-screen font-[Urbanist] pb-24" style={{ backgroundColor: 'var(--theme-bg, #E0F2FE)' }}>
      <header className="sticky top-0 z-30 px-4 pt-3 pb-2 backdrop-blur-xl" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-3 mb-2">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl flex items-center justify-center backdrop-blur-md"
            style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.5))' }}>
            <ChevronLeft className="w-5 h-5" style={{ color: 'var(--theme-text-primary, #0f172a)' }} />
          </motion.button>
          <h1 className="text-lg font-bold tracking-tight" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>Workout Plans</h1>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--theme-text-muted, #94a3b8)' }} />
          <input type="text" placeholder="Search plans..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm border-0 outline-none backdrop-blur-md"
            style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.6))', color: 'var(--theme-text-primary, #1e293b)' }} />
        </div>
      </header>

      <div className="px-4 space-y-3">
        {/* Goal Filter */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button onClick={() => setGoalFilter('all')}
            className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all ${goalFilter === 'all' ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-sm' : ''}`}
            style={goalFilter !== 'all' ? { backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.5))', color: 'var(--theme-text-secondary, #64748b)' } : {}}>
            All Goals
          </button>
          {Object.entries(WORKOUT_GOALS).map(([key, val]) => (
            <button key={key} onClick={() => setGoalFilter(key as WorkoutGoal)}
              className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all ${goalFilter === key ? `bg-gradient-to-r ${val.color} text-white shadow-sm` : ''}`}
              style={goalFilter !== key ? { backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.5))', color: 'var(--theme-text-secondary, #64748b)' } : {}}>
              {val.emoji} {val.label}
            </button>
          ))}
        </div>

        {/* Level Filter */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button onClick={() => setLevelFilter('all')}
            className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all ${levelFilter === 'all' ? 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-sm' : ''}`}
            style={levelFilter !== 'all' ? { backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.5))', color: 'var(--theme-text-secondary, #64748b)' } : {}}>
            All Levels
          </button>
          {Object.entries(WORKOUT_LEVELS).map(([key, val]) => (
            <button key={key} onClick={() => setLevelFilter(key as WorkoutLevel)}
              className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all ${levelFilter === key ? 'bg-gradient-to-r from-gray-700 to-gray-800 text-white shadow-sm' : ''}`}
              style={levelFilter !== key ? { backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.5))', color: 'var(--theme-text-secondary, #64748b)' } : {}}>
              {val.emoji} {val.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="skeleton-shimmer h-24 rounded-2xl" />)}
          </div>
        )}

        {/* Plans */}
        <AnimatePresence mode="popLayout">
          {filtered.map((plan, idx) => {
            const goalInfo = WORKOUT_GOALS[plan.goal] || WORKOUT_GOALS.general_fitness;
            const levelInfo = WORKOUT_LEVELS[plan.level] || WORKOUT_LEVELS.beginner;
            return (
              <motion.div key={plan.id} layout initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                onClick={() => navigate(`/workout-plans/${plan.id}`)}
                className="backdrop-blur-xl rounded-2xl p-3 shadow-sm border border-white/30 active:scale-[0.98] transition-transform"
                style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.7))' }}>
                <div className="flex items-start justify-between mb-1.5">
                  <h3 className="text-sm font-bold flex-1 pr-2" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{plan.name}</h3>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${goalInfo.color} text-white shrink-0`}>{goalInfo.label}</span>
                </div>
                {plan.description && (
                  <p className="text-[11px] mb-2 line-clamp-1" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>{plan.description}</p>
                )}
                <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>
                  <span className="flex items-center gap-1">
                    <Dumbbell className="w-3 h-3" />
                    {plan.days_per_week} days/week
                  </span>
                  <span>{levelInfo.emoji} {levelInfo.label}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {plan.days.reduce((sum, d) => sum + d.exercises.length, 0)} exercises
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-12">
            <Dumbbell className="w-10 h-10 mx-auto mb-2 opacity-30" style={{ color: 'var(--theme-text-muted, #94a3b8)' }} />
            <p className="text-sm" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>No workout plans found</p>
          </div>
        )}
      </div>

      {/* FAB */}
      <motion.button whileTap={{ scale: 0.9 }}
        onClick={() => { /* TODO: Add workout plan modal */ }}
        className="fixed right-4 bottom-24 w-13 h-13 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-purple-500/30 flex items-center justify-center z-40">
        <Plus className="w-6 h-6 text-white" />
      </motion.button>
    </div>
  );
}
