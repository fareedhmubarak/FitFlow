import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Plus, UtensilsCrossed, Flame, Search } from 'lucide-react';
import { useDietPlans } from '@/hooks/useDietPlans';
import { DIET_GOALS, DIET_TYPES, type DietGoal, type DietType } from '@/types/dietPlan';

export default function DietPlansPage() {
  const navigate = useNavigate();
  const { data: plans = [], isLoading } = useDietPlans();
  const [filterGoal, setFilterGoal] = useState<DietGoal | 'all'>('all');
  const [filterType, setFilterType] = useState<DietType | 'all'>('all');
  const [search, setSearch] = useState('');

  const filtered = plans.filter(p => {
    if (filterGoal !== 'all' && p.goal !== filterGoal) return false;
    if (filterType !== 'all' && p.diet_type !== filterType) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen font-[Urbanist] pb-24" style={{ backgroundColor: 'var(--theme-bg, #E0F2FE)' }}>
      {/* Header */}
      <header className="sticky top-0 z-30 px-4 pt-3 pb-2 backdrop-blur-xl" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-3 mb-2">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl flex items-center justify-center backdrop-blur-md"
            style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.5))' }}>
            <ChevronLeft className="w-5 h-5" style={{ color: 'var(--theme-text-primary, #0f172a)' }} />
          </motion.button>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>Diet Plans</h1>
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--theme-text-muted, #94a3b8)' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search plans..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-white/40 backdrop-blur-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.6))', color: 'var(--theme-text-primary, #1e293b)' }} />
        </div>

        {/* Filters */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
          {(['all', ...Object.keys(DIET_GOALS)] as (DietGoal | 'all')[]).map(goal => (
            <motion.button key={goal} whileTap={{ scale: 0.92 }}
              onClick={() => setFilterGoal(goal)}
              className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${filterGoal === goal ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-white/30 bg-white/40'}`}
              style={filterGoal !== goal ? { color: 'var(--theme-text-secondary, #64748b)' } : undefined}>
              {goal === 'all' ? 'All' : DIET_GOALS[goal].label}
            </motion.button>
          ))}
        </div>
        <div className="flex gap-1.5 mt-1.5">
          {(['all', ...Object.keys(DIET_TYPES)] as (DietType | 'all')[]).map(t => (
            <motion.button key={t} whileTap={{ scale: 0.92 }}
              onClick={() => setFilterType(t)}
              className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${filterType === t ? 'border-green-400 bg-green-50 text-green-700' : 'border-white/30 bg-white/40'}`}
              style={filterType !== t ? { color: 'var(--theme-text-secondary, #64748b)' } : undefined}>
              {t === 'all' ? 'All Types' : `${DIET_TYPES[t].emoji} ${DIET_TYPES[t].label}`}
            </motion.button>
          ))}
        </div>
      </header>

      {/* Plan Grid */}
      <div className="px-4 pt-3 space-y-2.5">
        {isLoading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton-shimmer h-24 rounded-2xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <UtensilsCrossed className="w-12 h-12 mx-auto mb-2 opacity-30" style={{ color: 'var(--theme-text-muted, #94a3b8)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary, #334155)' }}>No plans found</p>
          </div>
        ) : (
          filtered.map((plan, idx) => {
            const goalInfo = DIET_GOALS[plan.goal] || DIET_GOALS.general_fitness;
            const typeInfo = DIET_TYPES[plan.diet_type] || DIET_TYPES.vegetarian;
            return (
              <motion.div key={plan.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.04, 0.3) }}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={() => navigate(`/diet-plans/${plan.id}`)}
                className="backdrop-blur-xl rounded-2xl p-3 shadow-md border border-white/30 cursor-pointer"
                style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.7))' }}>
                <div className="flex items-start justify-between mb-1.5">
                  <h3 className="text-sm font-bold flex-1 pr-2" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{plan.name}</h3>
                  {plan.is_template && (
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 flex-shrink-0">TEMPLATE</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${goalInfo.color} text-white`}>{goalInfo.label}</span>
                  <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-white/60 border border-white/30" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>{typeInfo.emoji} {typeInfo.label}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>
                  {plan.target_calories && (
                    <span className="flex items-center gap-0.5"><Flame className="w-3 h-3 text-orange-400" /> {plan.target_calories} kcal</span>
                  )}
                  <span>🍽 {plan.meals?.length || 0} meals</span>
                  {plan.protein_g && <span>💪 {plan.protein_g}g protein</span>}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* FAB */}
      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
        onClick={() => { /* TODO: open create modal */ }}
        className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 shadow-xl shadow-orange-500/30 flex items-center justify-center">
        <Plus className="w-6 h-6 text-white" />
      </motion.button>
    </div>
  );
}
