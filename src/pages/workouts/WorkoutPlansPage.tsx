import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, Plus, Dumbbell, Clock } from 'lucide-react';
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
    <div className="min-h-screen font-[Urbanist] pb-24" style={{ background: 'var(--theme-bg, linear-gradient(135deg, #e0e7ff 0%, #f0fdfa 50%, #fdf2f8 100%))' }}>
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 px-4 pt-12 pb-2"
      >
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm border border-white/50 active:scale-95 transition-transform"
            style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}>
            <ArrowLeft className="w-4 h-4" style={{ color: 'var(--theme-text-primary, #1e293b)' }} />
          </button>
          <h1 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>Workout Plans</h1>
        </div>
      </motion.header>

      <div className="px-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--theme-text-muted, #94a3b8)' }} />
          <input type="text" placeholder="Search plans..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm border border-white/40 outline-none focus:ring-1 focus:ring-indigo-300"
            style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))', color: 'var(--theme-text-primary, #1e293b)' }} />
        </div>
      </div>

      <div className="px-4 space-y-3">
        {/* Goal Filter */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button onClick={() => setGoalFilter('all')}
            className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all ${goalFilter === 'all' ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-sm' : ''}`}
            style={goalFilter !== 'all' ? { backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))', color: 'var(--theme-text-secondary, #64748b)' } : {}}>
            All Goals
          </button>
          {Object.entries(WORKOUT_GOALS).map(([key, val]) => (
            <button key={key} onClick={() => setGoalFilter(key as WorkoutGoal)}
              className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all ${goalFilter === key ? `bg-gradient-to-r ${val.color} text-white shadow-sm` : ''}`}
              style={goalFilter !== key ? { backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))', color: 'var(--theme-text-secondary, #64748b)' } : {}}>
              {val.emoji} {val.label}
            </button>
          ))}
        </div>

        {/* Level Filter */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button onClick={() => setLevelFilter('all')}
            className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all ${levelFilter === 'all' ? 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-sm' : ''}`}
            style={levelFilter !== 'all' ? { backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))', color: 'var(--theme-text-secondary, #64748b)' } : {}}>
            All Levels
          </button>
          {Object.entries(WORKOUT_LEVELS).map(([key, val]) => (
            <button key={key} onClick={() => setLevelFilter(key as WorkoutLevel)}
              className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all ${levelFilter === key ? 'bg-gradient-to-r from-gray-700 to-gray-800 text-white shadow-sm' : ''}`}
              style={levelFilter !== key ? { backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))', color: 'var(--theme-text-secondary, #64748b)' } : {}}>
              {val.emoji} {val.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-2 gap-2.5">
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton-shimmer h-32 rounded-2xl" />)}
          </div>
        )}

        {/* Plans */}
        <div className="grid grid-cols-2 gap-2.5">
          <AnimatePresence mode="popLayout">
            {filtered.map((plan, idx) => {
              const goalInfo = WORKOUT_GOALS[plan.goal] || WORKOUT_GOALS.general_fitness;
              const levelInfo = WORKOUT_LEVELS[plan.level] || WORKOUT_LEVELS.beginner;
              return (
                <motion.div key={plan.id} layout initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                  onClick={() => navigate(`/workout-plans/${plan.id}`)}
                  className="rounded-2xl p-2.5 shadow-sm border border-white/40 active:scale-[0.96] transition-transform flex flex-col"
                  style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}>
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="text-[12px] font-bold leading-tight line-clamp-2 flex-1 pr-1" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{plan.name}</h3>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r ${goalInfo.color} text-white`}>{goalInfo.label}</span>
                    <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full bg-white/60 border border-white/30" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>{levelInfo.emoji} {levelInfo.label}</span>
                  </div>
                  {plan.description && (
                    <p className="text-[10px] mb-1.5 line-clamp-1" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>{plan.description}</p>
                  )}
                  <div className="mt-auto flex flex-wrap gap-x-2 gap-y-0.5 text-[9px]" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>
                    <span className="flex items-center gap-0.5">
                      <Dumbbell className="w-2.5 h-2.5" />
                      {plan.days_per_week}d/wk
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {plan.days.reduce((sum, d) => sum + d.exercises.length, 0)} ex
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

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
        className="fixed right-4 bottom-24 w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-purple-500/30 flex items-center justify-center z-[110]">
        <Plus className="w-6 h-6 text-white" />
      </motion.button>
    </div>
  );
}
