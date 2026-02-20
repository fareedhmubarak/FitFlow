import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, Plus, Dumbbell, Clock, ChevronDown } from 'lucide-react';
import { useWorkoutPlans } from '@/hooks/useWorkoutPlans';
import { WORKOUT_GOALS, WORKOUT_LEVELS, type WorkoutGoal, type WorkoutLevel } from '@/types/workoutPlan';
import CreateWorkoutPlan from './CreateWorkoutPlan';

export default function WorkoutPlansPage() {
  const navigate = useNavigate();
  const { data: plans, isLoading } = useWorkoutPlans();
  const [search, setSearch] = useState('');
  const [goalFilter, setGoalFilter] = useState<WorkoutGoal | 'all'>('all');
  const [levelFilter, setLevelFilter] = useState<WorkoutLevel | 'all'>('all');
  const [daysFilter, setDaysFilter] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);

  const filtered = useMemo(() => {
    if (!plans) return [];
    return plans.filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (goalFilter !== 'all' && p.goal !== goalFilter) return false;
      if (levelFilter !== 'all' && p.level !== levelFilter) return false;
      if (daysFilter !== 'all' && p.days_per_week !== Number(daysFilter)) return false;
      return true;
    });
  }, [plans, search, goalFilter, levelFilter, daysFilter]);

  const hasActiveFilters = goalFilter !== 'all' || levelFilter !== 'all' || daysFilter !== 'all' || search !== '';
  const clearFilters = () => { setGoalFilter('all'); setLevelFilter('all'); setDaysFilter('all'); setSearch(''); };

  return (
    <div className="fixed inset-0 w-screen h-[100dvh] flex flex-col overflow-hidden font-[Urbanist]" style={{ background: 'var(--theme-bg, linear-gradient(135deg, #e0e7ff 0%, #f0fdfa 50%, #fdf2f8 100%))' }}>
      <header className="flex-shrink-0 px-4 pt-16 pb-2">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm border border-white/50 active:scale-95 transition-transform"
            style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}>
            <ArrowLeft className="w-4 h-4" style={{ color: 'var(--theme-text-primary, #1e293b)' }} />
          </button>
          <h1 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>Workout Plans</h1>
        </div>
      </header>

      {/* Search & Filters */}
      <div className="flex-shrink-0 px-4 pb-2 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--theme-text-muted, #94a3b8)' }} />
          <input type="text" placeholder="Search plans..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm border border-white/40 outline-none focus:ring-2 focus:ring-indigo-400"
            style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))', color: 'var(--theme-text-primary, #1e293b)' }} />
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <div className="relative">
            <select value={daysFilter} onChange={e => setDaysFilter(e.target.value)}
              className="w-full appearance-none pl-2 pr-6 py-2 rounded-xl text-[10px] font-semibold border border-white/40 focus:outline-none focus:ring-2 focus:ring-violet-400"
              style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))', color: 'var(--theme-text-primary, #1e293b)' }}>
              <option value="all">📅 All Days</option>
              <option value="2">2 Days/wk</option>
              <option value="3">3 Days/wk</option>
              <option value="4">4 Days/wk</option>
              <option value="5">5 Days/wk</option>
              <option value="6">6 Days/wk</option>
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: 'var(--theme-text-muted, #94a3b8)' }} />
          </div>
          <div className="relative">
            <select value={goalFilter} onChange={e => setGoalFilter(e.target.value as WorkoutGoal | 'all')}
              className="w-full appearance-none pl-2 pr-6 py-2 rounded-xl text-[10px] font-semibold border border-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))', color: 'var(--theme-text-primary, #1e293b)' }}>
              <option value="all">🎯 All Goals</option>
              {Object.entries(WORKOUT_GOALS).map(([key, val]) => (
                <option key={key} value={key}>{val.emoji} {val.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: 'var(--theme-text-muted, #94a3b8)' }} />
          </div>
          <div className="relative">
            <select value={levelFilter} onChange={e => setLevelFilter(e.target.value as WorkoutLevel | 'all')}
              className="w-full appearance-none pl-2 pr-6 py-2 rounded-xl text-[10px] font-semibold border border-white/40 focus:outline-none focus:ring-2 focus:ring-purple-400"
              style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))', color: 'var(--theme-text-primary, #1e293b)' }}>
              <option value="all">💪 All Levels</option>
              {Object.entries(WORKOUT_LEVELS).map(([key, val]) => (
                <option key={key} value={key}>{val.emoji} {val.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: 'var(--theme-text-muted, #94a3b8)' }} />
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>
              {filtered.length} plan{filtered.length !== 1 ? 's' : ''} found
            </span>
            <button onClick={clearFilters} className="text-[10px] font-bold text-violet-500 active:scale-95 transition-transform">
              Clear filters
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-4 pb-24 space-y-3" style={{ overscrollBehavior: 'contain' }}>
        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-2 gap-2.5">
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton-shimmer h-32 rounded-2xl" />)}
          </div>
        )}

        {/* Plans */}
        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-2 gap-2.5">
            {filtered.map((plan) => {
              const goalInfo = WORKOUT_GOALS[plan.goal] || WORKOUT_GOALS.general_fitness;
              const levelInfo = WORKOUT_LEVELS[plan.level] || WORKOUT_LEVELS.beginner;
              return (
                <div key={plan.id}
                  onClick={() => navigate(`/workout-plans/${plan.id}`)}
                  className="rounded-2xl p-2.5 shadow-sm border border-white/40 active:scale-[0.96] transition-transform cursor-pointer flex flex-col"
                  style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}>
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="text-[12px] font-bold leading-tight line-clamp-2 flex-1 pr-1" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{plan.name}</h3>
                    {plan.is_template && (
                      <span className="text-[7px] font-bold px-1 py-0.5 rounded-full bg-amber-100 text-amber-700 flex-shrink-0">★</span>
                    )}
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
                </div>
              );
            })}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-12">
            <Dumbbell className="w-10 h-10 mx-auto mb-2 opacity-30" style={{ color: 'var(--theme-text-muted, #94a3b8)' }} />
            <p className="text-sm" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>No workout plans found</p>
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowCreate(true)}
        className="fixed right-4 bottom-24 w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-purple-500/30 flex items-center justify-center z-[110] active:scale-90 transition-transform">
        <Plus className="w-6 h-6 text-white" />
      </button>

      {/* Create Workout Plan Wizard */}
      <AnimatePresence>
        {showCreate && (
          <CreateWorkoutPlan
            open={showCreate}
            onClose={() => setShowCreate(false)}
            onCreated={(id) => {
              setShowCreate(false);
              navigate(`/workout-plans/${id}`);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
