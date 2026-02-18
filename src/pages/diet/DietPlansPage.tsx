import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, UtensilsCrossed, Flame, Search, ChevronDown } from 'lucide-react';
import { useDietPlans } from '@/hooks/useDietPlans';
import { DIET_GOALS, DIET_TYPES, type DietGoal, type DietType } from '@/types/dietPlan';
import toast from 'react-hot-toast';

type CalorieRange = 'all' | '0-1500' | '1500-1800' | '1800-2200' | '2200-2500' | '2500-9999';

const CALORIE_RANGES: { value: CalorieRange; label: string }[] = [
  { value: 'all', label: '🔥 All Calories' },
  { value: '0-1500', label: '< 1500 kcal' },
  { value: '1500-1800', label: '1500–1800' },
  { value: '1800-2200', label: '1800–2200' },
  { value: '2200-2500', label: '2200–2500' },
  { value: '2500-9999', label: '2500+ kcal' },
];

export default function DietPlansPage() {
  const navigate = useNavigate();
  const { data: plans = [], isLoading } = useDietPlans();
  const [filterGoal, setFilterGoal] = useState<DietGoal | 'all'>('all');
  const [filterType, setFilterType] = useState<DietType | 'all'>('all');
  const [filterCalories, setFilterCalories] = useState<CalorieRange>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => plans.filter(p => {
    if (filterGoal !== 'all' && p.goal !== filterGoal) return false;
    if (filterType !== 'all' && p.diet_type !== filterType) return false;
    if (filterCalories !== 'all' && p.target_calories) {
      const [min, max] = filterCalories.split('-').map(Number);
      if (p.target_calories < min || p.target_calories > max) return false;
    }
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [plans, filterGoal, filterType, filterCalories, search]);

  const hasActiveFilters = filterGoal !== 'all' || filterType !== 'all' || filterCalories !== 'all' || search !== '';
  const clearFilters = () => { setFilterGoal('all'); setFilterType('all'); setFilterCalories('all'); setSearch(''); };

  return (
    <div className="min-h-screen font-[Urbanist] pb-24" style={{ background: 'var(--theme-bg, linear-gradient(135deg, #e0e7ff 0%, #f0fdfa 50%, #fdf2f8 100%))' }}>
      {/* Header */}
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
          <h1 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>Diet Plans</h1>
        </div>
      </motion.header>

      {/* Search & Filters */}
      <div className="px-4 pb-2 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--theme-text-muted, #94a3b8)' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search plans..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))', color: 'var(--theme-text-primary, #1e293b)' }} />
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <div className="relative">
            <select value={filterCalories} onChange={e => setFilterCalories(e.target.value as CalorieRange)}
              className="w-full appearance-none pl-2 pr-6 py-2 rounded-xl text-[10px] font-semibold border border-white/40 focus:outline-none focus:ring-2 focus:ring-red-400"
              style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))', color: 'var(--theme-text-primary, #1e293b)' }}>
              {CALORIE_RANGES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: 'var(--theme-text-muted, #94a3b8)' }} />
          </div>
          <div className="relative">
            <select value={filterGoal} onChange={e => setFilterGoal(e.target.value as DietGoal | 'all')}
              className="w-full appearance-none pl-2 pr-6 py-2 rounded-xl text-[10px] font-semibold border border-white/40 focus:outline-none focus:ring-2 focus:ring-orange-400"
              style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))', color: 'var(--theme-text-primary, #1e293b)' }}>
              <option value="all">🎯 All Goals</option>
              {Object.entries(DIET_GOALS).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: 'var(--theme-text-muted, #94a3b8)' }} />
          </div>
          <div className="relative">
            <select value={filterType} onChange={e => setFilterType(e.target.value as DietType | 'all')}
              className="w-full appearance-none pl-2 pr-6 py-2 rounded-xl text-[10px] font-semibold border border-white/40 focus:outline-none focus:ring-2 focus:ring-green-400"
              style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))', color: 'var(--theme-text-primary, #1e293b)' }}>
              <option value="all">🍽 All Types</option>
              {Object.entries(DIET_TYPES).map(([key, val]) => (
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
            <button onClick={clearFilters} className="text-[10px] font-bold text-orange-500 active:scale-95 transition-transform">
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Plan Grid */}
      <div className="px-4 pt-3">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2.5">{[...Array(6)].map((_, i) => <div key={i} className="skeleton-shimmer h-32 rounded-2xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <UtensilsCrossed className="w-12 h-12 mx-auto mb-2 opacity-30" style={{ color: 'var(--theme-text-muted, #94a3b8)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary, #334155)' }}>No plans found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {filtered.map((plan, idx) => {
              const goalInfo = DIET_GOALS[plan.goal] || DIET_GOALS.general_fitness;
              const typeInfo = DIET_TYPES[plan.diet_type] || DIET_TYPES.vegetarian;
              return (
                <motion.div key={plan.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.04, 0.3) }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => navigate(`/diet-plans/${plan.id}`)}
                  className="rounded-2xl p-2.5 shadow-md border border-white/40 cursor-pointer flex flex-col"
                  style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}>
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="text-[12px] font-bold leading-tight line-clamp-2 flex-1 pr-1" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{plan.name}</h3>
                    {plan.is_template && (
                      <span className="text-[7px] font-bold px-1 py-0.5 rounded-full bg-amber-100 text-amber-700 flex-shrink-0">★</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r ${goalInfo.color} text-white`}>{goalInfo.label}</span>
                    <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full bg-white/60 border border-white/30" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>{typeInfo.emoji} {typeInfo.label}</span>
                  </div>
                  <div className="mt-auto flex flex-wrap gap-x-2 gap-y-0.5 text-[9px]" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>
                    {plan.target_calories && (
                      <span className="flex items-center gap-0.5"><Flame className="w-2.5 h-2.5 text-orange-400" />{plan.target_calories}</span>
                    )}
                    <span>🍽 {plan.meals?.length || 0}</span>
                    {plan.protein_g && <span>💪 {plan.protein_g}g</span>}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
        onClick={() => toast('Create Diet Plan — Coming Soon!', { icon: '🍽' })}
        className="fixed bottom-24 right-4 z-[110] w-14 h-14 flex items-center justify-center"
        style={{ backgroundColor: '#000000', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', backdropFilter: 'none' }}>
        <Plus className="w-7 h-7 text-white" />
      </motion.button>
    </div>
  );
}
