/**
 * CreateDietPlan — 5-step HealthifyMe-inspired diet plan wizard.
 *
 * Step 1: Basic Info (name, description, goal, diet type)
 * Step 2: Macro Targets (calories, protein, carbs, fat)
 * Step 3: Meal Structure (3/4/5/6 meals)
 * Step 4: Meal Builder (search + add food items per meal)
 * Step 5: Review & Save
 */

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronRight, ChevronLeft, Search, Plus, Minus,
  Flame, CheckCircle2, UtensilsCrossed, Trash2, Pencil,
} from 'lucide-react';
import {
  DIET_GOALS, DIET_TYPES,
  type DietGoal, type DietType, type DietMeal,
  type CreateDietPlanInput, type FoodItem, type MealFoodEntry, type FoodCategory,
} from '@/types/dietPlan';
import { useCreateDietPlan } from '@/hooks/useDietPlans';
import { useFoodItems, useAddFoodItem } from '@/hooks/useFoodItems';
import toast from 'react-hot-toast';

// Category metadata (static — only labels/emojis, no food data)
const FOOD_CATEGORIES: { id: FoodCategory; label: string; emoji: string }[] = [
  { id: 'grains', label: 'Roti / Bread', emoji: '🫓' },
  { id: 'rice', label: 'Rice', emoji: '🍚' },
  { id: 'dal', label: 'Dal / Lentils', emoji: '🫘' },
  { id: 'vegetables', label: 'Vegetables', emoji: '🥦' },
  { id: 'paneer_dairy', label: 'Paneer / Dairy', emoji: '🧀' },
  { id: 'chicken', label: 'Chicken / Meat', emoji: '🍗' },
  { id: 'egg', label: 'Egg', emoji: '🥚' },
  { id: 'fish_seafood', label: 'Fish / Seafood', emoji: '🐟' },
  { id: 'snacks', label: 'Snacks', emoji: '🥪' },
  { id: 'fruits', label: 'Fruits', emoji: '🍎' },
  { id: 'beverages', label: 'Beverages', emoji: '☕' },
  { id: 'salads', label: 'Salads', emoji: '🥗' },
  { id: 'sweets', label: 'Sweets', emoji: '🍯' },
  { id: 'supplements', label: 'Supplements', emoji: '💊' },
];

// ═══════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════

const CALORIE_PRESETS = [1200, 1500, 1800, 2000, 2200, 2500, 3000];

const MACRO_RATIOS: Record<DietGoal, { protein: number; carbs: number; fat: number }> = {
  weight_loss:     { protein: 0.40, carbs: 0.30, fat: 0.30 },
  muscle_gain:     { protein: 0.35, carbs: 0.45, fat: 0.20 },
  maintenance:     { protein: 0.30, carbs: 0.40, fat: 0.30 },
  general_fitness: { protein: 0.25, carbs: 0.50, fat: 0.25 },
  toning:          { protein: 0.35, carbs: 0.35, fat: 0.30 },
};

interface MealSlot {
  name: string;
  time: string;
  calorieRatio: number; // fraction of total
}

const MEAL_PRESETS: Record<number, MealSlot[]> = {
  3: [
    { name: 'Breakfast', time: '8:00 AM', calorieRatio: 0.30 },
    { name: 'Lunch', time: '1:00 PM', calorieRatio: 0.40 },
    { name: 'Dinner', time: '8:00 PM', calorieRatio: 0.30 },
  ],
  4: [
    { name: 'Breakfast', time: '8:00 AM', calorieRatio: 0.25 },
    { name: 'Lunch', time: '1:00 PM', calorieRatio: 0.35 },
    { name: 'Evening Snack', time: '5:00 PM', calorieRatio: 0.10 },
    { name: 'Dinner', time: '8:00 PM', calorieRatio: 0.30 },
  ],
  5: [
    { name: 'Early Morning', time: '6:30 AM', calorieRatio: 0.10 },
    { name: 'Breakfast', time: '8:30 AM', calorieRatio: 0.25 },
    { name: 'Lunch', time: '1:00 PM', calorieRatio: 0.30 },
    { name: 'Evening Snack', time: '5:00 PM', calorieRatio: 0.10 },
    { name: 'Dinner', time: '8:30 PM', calorieRatio: 0.25 },
  ],
  6: [
    { name: 'Early Morning', time: '6:30 AM', calorieRatio: 0.08 },
    { name: 'Breakfast', time: '8:30 AM', calorieRatio: 0.22 },
    { name: 'Mid-Morning', time: '11:00 AM', calorieRatio: 0.10 },
    { name: 'Lunch', time: '1:00 PM', calorieRatio: 0.28 },
    { name: 'Evening Snack', time: '5:00 PM', calorieRatio: 0.10 },
    { name: 'Dinner', time: '8:30 PM', calorieRatio: 0.22 },
  ],
};

type Step = 1 | 2 | 3 | 4 | 5;

const STEP_LABELS = ['Basic Info', 'Macros', 'Meals', 'Add Food', 'Review'];

// ═══════════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════════

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
}

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export default function CreateDietPlan({ open, onClose, onCreated }: Props) {
  // Step state
  const [step, setStep] = useState<Step>(1);

  // Step 1 — Basic Info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState<DietGoal | null>(null);
  const [dietType, setDietType] = useState<DietType | null>(null);

  // Step 2 — Macros
  const [calories, setCalories] = useState(1800);
  const [proteinG, setProteinG] = useState(0);
  const [carbsG, setCarbsG] = useState(0);
  const [fatG, setFatG] = useState(0);
  const [macroManual, setMacroManual] = useState(false);

  // Step 3 — Meal structure
  const [mealCount, setMealCount] = useState(4);

  // Step 4 — Food per meal
  const [mealFoods, setMealFoods] = useState<MealFoodEntry[][]>([]);
  const [activeMealIdx, setActiveMealIdx] = useState(0);
  const [foodSearch, setFoodSearch] = useState('');
  const [foodCatFilter, setFoodCatFilter] = useState<FoodCategory | 'all'>('all');

  // Step 5 — Notes
  const [notes, setNotes] = useState('');

  // Custom food entry
  const [showCustomFood, setShowCustomFood] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customServing, setCustomServing] = useState('');
  const [customCal, setCustomCal] = useState('');
  const [customP, setCustomP] = useState('');
  const [customC, setCustomC] = useState('');
  const [customF, setCustomF] = useState('');

  const createPlan = useCreateDietPlan();
  const { data: allFoodItems = [], isLoading: foodsLoading } = useFoodItems();
  const addFoodItemMutation = useAddFoodItem();

  // ── Derived values ──────────────────────────────────────
  const mealSlots = MEAL_PRESETS[mealCount] || MEAL_PRESETS[4];

  // Auto-calculate macros when goal/calories change (unless manual)
  const autoMacros = useMemo(() => {
    if (!goal) return null;
    const r = MACRO_RATIOS[goal];
    return {
      protein: Math.round((calories * r.protein) / 4),
      carbs: Math.round((calories * r.carbs) / 4),
      fat: Math.round((calories * r.fat) / 9),
    };
  }, [goal, calories]);

  // Apply auto macros when not manual
  const effectiveProtein = macroManual ? proteinG : (autoMacros?.protein ?? 0);
  const effectiveCarbs = macroManual ? carbsG : (autoMacros?.carbs ?? 0);
  const effectiveFat = macroManual ? fatG : (autoMacros?.fat ?? 0);

  // Food filtering (from DB)
  const filteredFoods = useMemo(() => {
    let items = allFoodItems;
    // Filter by diet type
    if (dietType === 'vegetarian') {
      items = items.filter(f => f.isVeg);
    } else if (dietType === 'eggetarian') {
      items = items.filter(f => f.isVeg || f.isEgg);
    }
    // Filter by category
    if (foodCatFilter !== 'all') {
      items = items.filter(f => f.category === foodCatFilter);
    }
    // Filter by search
    if (foodSearch.trim()) {
      const q = foodSearch.toLowerCase();
      items = items.filter(f => f.name.toLowerCase().includes(q) || f.category.includes(q));
    }
    return items;
  }, [allFoodItems, dietType, foodCatFilter, foodSearch]);

  // Meal calorie totals
  const mealCalorieTotals = useMemo(() =>
    mealFoods.map(entries =>
      entries.reduce((sum, e) => sum + e.food.calories * e.qty, 0)
    ), [mealFoods]);

  const totalCaloriesUsed = mealCalorieTotals.reduce((s, v) => s + v, 0);

  // ── Handlers ────────────────────────────────────────────
  const initMealFoods = useCallback(() => {
    if (mealFoods.length !== mealCount) {
      const next: MealFoodEntry[][] = Array.from({ length: mealCount }, (_, i) => mealFoods[i] || []);
      setMealFoods(next);
      setActiveMealIdx(0);
    }
  }, [mealCount, mealFoods]);

  const addFoodToMeal = (food: FoodItem) => {
    setMealFoods(prev => {
      const copy = prev.map(arr => [...arr]);
      const existing = copy[activeMealIdx].findIndex(e => e.food.name === food.name);
      if (existing >= 0) {
        copy[activeMealIdx][existing] = { ...copy[activeMealIdx][existing], qty: copy[activeMealIdx][existing].qty + 1 };
      } else {
        copy[activeMealIdx].push({ food, qty: 1 });
      }
      return copy;
    });
  };

  const removeFoodFromMeal = (mealIdx: number, foodIdx: number) => {
    setMealFoods(prev => {
      const copy = prev.map(arr => [...arr]);
      copy[mealIdx].splice(foodIdx, 1);
      return copy;
    });
  };

  const updateFoodQty = (mealIdx: number, foodIdx: number, delta: number) => {
    setMealFoods(prev => {
      const copy = prev.map(arr => [...arr]);
      const newQty = copy[mealIdx][foodIdx].qty + delta;
      if (newQty <= 0) {
        copy[mealIdx].splice(foodIdx, 1);
      } else {
        copy[mealIdx][foodIdx] = { ...copy[mealIdx][foodIdx], qty: newQty };
      }
      return copy;
    });
  };

  const addCustomFood = () => {
    if (!customName.trim() || !customCal.trim()) return;
    const food: FoodItem = {
      name: customName.trim(),
      category: 'snacks',
      serving: customServing.trim() || '1 serving',
      calories: parseInt(customCal) || 0,
      protein_g: parseInt(customP) || 0,
      carbs_g: parseInt(customC) || 0,
      fat_g: parseInt(customF) || 0,
      isVeg: dietType === 'vegetarian',
      isEgg: dietType === 'eggetarian',
    };
    addFoodToMeal(food);
    // Save to DB so it's available globally for all gyms
    addFoodItemMutation.mutate(food);
    setShowCustomFood(false);
    setCustomName(''); setCustomServing(''); setCustomCal(''); setCustomP(''); setCustomC(''); setCustomF('');
  };

  // Validation per step
  const canProceed = (s: Step): boolean => {
    switch (s) {
      case 1: return name.trim().length >= 2 && !!goal && !!dietType;
      case 2: return calories >= 800 && calories <= 5000;
      case 3: return true;
      case 4: return mealFoods.some(m => m.length > 0);
      default: return true;
    }
  };

  const goNext = () => {
    if (!canProceed(step)) return;
    if (step === 3) initMealFoods();
    if (step < 5) setStep((step + 1) as Step);
  };

  const goBack = () => {
    if (step > 1) setStep((step - 1) as Step);
  };

  // Save
  const handleSave = async () => {
    if (!goal || !dietType) return;
    const meals: DietMeal[] = mealSlots.map((slot, idx) => {
      const entries = mealFoods[idx] || [];
      return {
        meal_name: slot.name,
        time: slot.time,
        items: entries.map(e => e.qty > 1 ? `${e.food.name} x${e.qty} (${e.food.serving})` : `${e.food.name} (${e.food.serving})`),
        calories: entries.reduce((s, e) => s + e.food.calories * e.qty, 0),
        protein_g: entries.reduce((s, e) => s + e.food.protein_g * e.qty, 0),
        carbs_g: entries.reduce((s, e) => s + e.food.carbs_g * e.qty, 0),
        fat_g: entries.reduce((s, e) => s + e.food.fat_g * e.qty, 0),
      };
    });

    const input: CreateDietPlanInput = {
      name: name.trim(),
      description: description.trim() || null,
      goal,
      diet_type: dietType,
      target_calories: calories,
      protein_g: effectiveProtein,
      carbs_g: effectiveCarbs,
      fat_g: effectiveFat,
      meals,
      notes: notes.trim() || null,
      is_template: true,
    };

    createPlan.mutate(input, {
      onSuccess: (plan) => {
        toast.success('Diet plan created!');
        onCreated?.(plan.id);
        resetAndClose();
      },
      onError: () => toast.error('Failed to create diet plan'),
    });
  };

  const resetAndClose = () => {
    setStep(1); setName(''); setDescription(''); setGoal(null); setDietType(null);
    setCalories(1800); setProteinG(0); setCarbsG(0); setFatG(0); setMacroManual(false);
    setMealCount(4); setMealFoods([]); setActiveMealIdx(0); setFoodSearch(''); setFoodCatFilter('all');
    setNotes(''); setShowCustomFood(false);
    onClose();
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-[200]"
        onClick={resetAndClose}
      />

      {/* Wizard */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 z-[201] rounded-t-3xl shadow-2xl flex flex-col"
        style={{
          top: '3%',
          backgroundColor: 'var(--theme-popup-bg, #ffffff)',
        }}
      >
        {/* ── Top Handle + Close ──────────────────────── */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1 shrink-0">
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button onClick={goBack} className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center active:scale-95">
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
            )}
            <h2 className="text-base font-extrabold" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>
              Create Diet Plan
            </h2>
          </div>
          <button onClick={resetAndClose} className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center active:scale-95">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* ── Step indicators ────────────────────────── */}
        <div className="flex items-center gap-1 px-4 py-2 shrink-0">
          {STEP_LABELS.map((label, i) => {
            const s = (i + 1) as Step;
            const isActive = step === s;
            const isDone = step > s;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div className={`h-1 w-full rounded-full transition-all ${
                  isDone ? 'bg-emerald-500' : isActive ? 'bg-orange-500' : 'bg-slate-200'
                }`} />
                <span className={`text-[8px] font-bold uppercase tracking-wide ${
                  isActive ? 'text-orange-600' : isDone ? 'text-emerald-600' : 'text-slate-400'
                }`}>{label}</span>
              </div>
            );
          })}
        </div>

        {/* ── Step Content (scrollable) ──────────────── */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <AnimatePresence mode="wait">
            {step === 1 && <Step1BasicInfo key="s1" {...{ name, setName, description, setDescription, goal, setGoal, dietType, setDietType }} />}
            {step === 2 && <Step2Macros key="s2" {...{ goal, calories, setCalories, effectiveProtein, effectiveCarbs, effectiveFat, proteinG, setProteinG, carbsG, setCarbsG, fatG, setFatG, macroManual, setMacroManual }} />}
            {step === 3 && <Step3Meals key="s3" {...{ mealCount, setMealCount, mealSlots, calories }} />}
            {step === 4 && (
              <Step4FoodBuilder key="s4"
                foodsLoading={foodsLoading}
                mealSlots={mealSlots}
                mealFoods={mealFoods}
                activeMealIdx={activeMealIdx}
                setActiveMealIdx={setActiveMealIdx}
                filteredFoods={filteredFoods}
                foodSearch={foodSearch}
                setFoodSearch={setFoodSearch}
                foodCatFilter={foodCatFilter}
                setFoodCatFilter={setFoodCatFilter}
                calories={calories}
                mealCalorieTotals={mealCalorieTotals}
                addFoodToMeal={addFoodToMeal}
                removeFoodFromMeal={removeFoodFromMeal}
                updateFoodQty={updateFoodQty}
                showCustomFood={showCustomFood}
                setShowCustomFood={setShowCustomFood}
                customName={customName} setCustomName={setCustomName}
                customServing={customServing} setCustomServing={setCustomServing}
                customCal={customCal} setCustomCal={setCustomCal}
                customP={customP} setCustomP={setCustomP}
                customC={customC} setCustomC={setCustomC}
                customF={customF} setCustomF={setCustomF}
                addCustomFood={addCustomFood}
                dietType={dietType}
              />
            )}
            {step === 5 && (
              <Step5Review key="s5"
                name={name} description={description} goal={goal!} dietType={dietType!}
                calories={calories} proteinG={effectiveProtein} carbsG={effectiveCarbs} fatG={effectiveFat}
                mealSlots={mealSlots} mealFoods={mealFoods} mealCalorieTotals={mealCalorieTotals}
                totalCaloriesUsed={totalCaloriesUsed}
                notes={notes} setNotes={setNotes}
              />
            )}
          </AnimatePresence>
        </div>

        {/* ── Footer buttons ─────────────────────────── */}
        <div className="shrink-0 px-4 pb-5 pt-2 border-t border-slate-100">
          <div className="flex gap-3">
            {step > 1 && (
              <button
                onClick={goBack}
                className="py-3 px-5 font-bold text-sm rounded-xl flex items-center justify-center gap-1 active:scale-[0.98] transition-all"
                style={{ background: '#f1f5f9', color: '#334155', borderRadius: '14px' }}
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            )}
            {step < 5 ? (
              <button
                onClick={goNext}
                disabled={!canProceed(step)}
                className="flex-1 py-3 font-bold text-sm rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                style={{
                  background: canProceed(step) ? '#000000' : '#d1d5db',
                  color: canProceed(step) ? '#ffffff' : '#9ca3af',
                  cursor: canProceed(step) ? 'pointer' : 'not-allowed',
                  borderRadius: '14px',
                  boxShadow: canProceed(step) ? '0 6px 16px rgba(0,0,0,0.25)' : 'none',
                }}
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={createPlan.isPending}
                className="flex-1 py-3 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                style={{ background: '#000000', borderRadius: '14px', boxShadow: '0 6px 16px rgba(0,0,0,0.25)' }}
              >
                {createPlan.isPending ? (
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> Save Diet Plan</>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// Step 1 — Basic Info
// ═══════════════════════════════════════════════════════════

function Step1BasicInfo({
  name, setName, description, setDescription, goal, setGoal, dietType, setDietType,
}: {
  name: string; setName: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  goal: DietGoal | null; setGoal: (v: DietGoal) => void;
  dietType: DietType | null; setDietType: (v: DietType) => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.2 }} className="space-y-4 pt-2">
      {/* Name */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Plan Name *</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. 1500 kcal Weight Loss Veg"
          className="w-full px-3 py-2.5 rounded-xl border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-400"
          style={{ backgroundColor: 'var(--theme-input-bg, #f8fafc)', borderColor: 'var(--theme-input-border, #e2e8f0)', color: 'var(--theme-text-primary, #0f172a)' }}
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Description (optional)</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief notes about this plan..."
          rows={2}
          className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
          style={{ backgroundColor: 'var(--theme-input-bg, #f8fafc)', borderColor: 'var(--theme-input-border, #e2e8f0)', color: 'var(--theme-text-primary, #0f172a)' }}
        />
      </div>

      {/* Goal */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 block">Goal *</label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(DIET_GOALS) as [DietGoal, { label: string; color: string }][]).map(([key, val]) => (
            <button key={key} onClick={() => setGoal(key)}
              className="p-2.5 rounded-xl border-2 text-left transition-all active:scale-95"
              style={{
                backgroundColor: goal === key ? 'rgba(0,0,0,0.06)' : 'var(--theme-card-bg, #ffffff)',
                borderColor: goal === key ? '#000000' : '#f1f5f9',
                boxShadow: goal === key ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
              }}
            >
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${val.color} text-white`}>{val.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Diet Type */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 block">Diet Type *</label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.entries(DIET_TYPES) as [DietType, { label: string; emoji: string }][]).map(([key, val]) => (
            <button key={key} onClick={() => setDietType(key)}
              className="p-3 rounded-xl border-2 text-center transition-all active:scale-95"
              style={{
                backgroundColor: dietType === key ? 'rgba(0,0,0,0.06)' : 'var(--theme-card-bg, #ffffff)',
                borderColor: dietType === key ? '#000000' : '#f1f5f9',
                boxShadow: dietType === key ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
              }}
            >
              <span className="text-2xl block mb-1">{val.emoji}</span>
              <span className="text-[10px] font-bold" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>{val.label}</span>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// Step 2 — Macros
// ═══════════════════════════════════════════════════════════

function Step2Macros({
  goal, calories, setCalories, effectiveProtein, effectiveCarbs, effectiveFat,
  proteinG, setProteinG, carbsG, setCarbsG, fatG, setFatG,
  macroManual, setMacroManual,
}: {
  goal: DietGoal | null;
  calories: number; setCalories: (v: number) => void;
  effectiveProtein: number; effectiveCarbs: number; effectiveFat: number;
  proteinG: number; setProteinG: (v: number) => void;
  carbsG: number; setCarbsG: (v: number) => void;
  fatG: number; setFatG: (v: number) => void;
  macroManual: boolean; setMacroManual: (v: boolean) => void;
}) {
  const totalMacroCal = effectiveProtein * 4 + effectiveCarbs * 4 + effectiveFat * 9;
  const pPct = totalMacroCal > 0 ? Math.round((effectiveProtein * 4 / totalMacroCal) * 100) : 0;
  const cPct = totalMacroCal > 0 ? Math.round((effectiveCarbs * 4 / totalMacroCal) * 100) : 0;
  const fPct = 100 - pPct - cPct;

  return (
    <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.2 }} className="space-y-4 pt-2">

      {/* Calorie Presets */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 block">
          Daily Calorie Target — <span className="text-orange-500">{calories} kcal</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {CALORIE_PRESETS.map(p => (
            <button key={p} onClick={() => setCalories(p)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                calories === p ? 'bg-orange-500 text-white shadow-md' : 'bg-slate-100 text-slate-600'
              }`}>
              {p}
            </button>
          ))}
        </div>
        <div className="mt-2">
          <input type="range" min="800" max="4000" step="50" value={calories}
            onChange={e => setCalories(Number(e.target.value))}
            className="w-full accent-orange-500"
          />
          <div className="flex justify-between text-[9px] text-slate-400 font-semibold">
            <span>800</span><span>4000 kcal</span>
          </div>
        </div>
      </div>

      {/* Macro Distribution Visual */}
      <div className="rounded-2xl p-4 border border-white/40 shadow-sm"
        style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.9))' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Macro Split</span>
          <button onClick={() => {
            if (!macroManual) { setProteinG(effectiveProtein); setCarbsG(effectiveCarbs); setFatG(effectiveFat); }
            setMacroManual(!macroManual);
          }}
            className="text-[9px] font-bold text-orange-500 flex items-center gap-1">
            <Pencil className="w-3 h-3" /> {macroManual ? 'Auto' : 'Manual'}
          </button>
        </div>

        {/* Bar */}
        <div className="flex h-3 rounded-full overflow-hidden mb-3">
          <div className="bg-blue-500 transition-all" style={{ width: `${pPct}%` }} />
          <div className="bg-amber-500 transition-all" style={{ width: `${cPct}%` }} />
          <div className="bg-rose-400 transition-all" style={{ width: `${fPct}%` }} />
        </div>

        {/* Macro Cards */}
        <div className="grid grid-cols-3 gap-2">
          <MacroCard label="Protein" grams={effectiveProtein} pct={pPct} color="text-blue-600" bg="bg-blue-50" emoji="💪"
            editable={macroManual} onChange={v => setProteinG(v)} />
          <MacroCard label="Carbs" grams={effectiveCarbs} pct={cPct} color="text-amber-600" bg="bg-amber-50" emoji="🌾"
            editable={macroManual} onChange={v => setCarbsG(v)} />
          <MacroCard label="Fat" grams={effectiveFat} pct={fPct} color="text-rose-500" bg="bg-rose-50" emoji="🫒"
            editable={macroManual} onChange={v => setFatG(v)} />
        </div>
      </div>

      {goal && (
        <p className="text-[10px] text-center text-slate-400">
          Auto-calculated for <span className="font-bold text-slate-600">{DIET_GOALS[goal].label}</span> goal
        </p>
      )}
    </motion.div>
  );
}

function MacroCard({ label, grams, pct, color, bg, emoji, editable, onChange }: {
  label: string; grams: number; pct: number; color: string; bg: string; emoji: string;
  editable: boolean; onChange: (v: number) => void;
}) {
  return (
    <div className={`${bg} rounded-xl p-2.5 text-center`}>
      <span className="text-lg">{emoji}</span>
      {editable ? (
        <input type="number" value={grams} onChange={e => onChange(Math.max(0, parseInt(e.target.value) || 0))}
          className={`w-full text-center text-lg font-extrabold bg-transparent ${color} focus:outline-none`}
        />
      ) : (
        <p className={`text-lg font-extrabold ${color}`}>{grams}g</p>
      )}
      <p className="text-[9px] font-bold text-slate-500">{label} · {pct}%</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Step 3 — Meal Structure
// ═══════════════════════════════════════════════════════════

function Step3Meals({
  mealCount, setMealCount, mealSlots, calories,
}: {
  mealCount: number; setMealCount: (v: number) => void;
  mealSlots: MealSlot[]; calories: number;
}) {
  return (
    <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.2 }} className="space-y-4 pt-2">

      {/* Count selector */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 block">Number of Meals</label>
        <div className="grid grid-cols-4 gap-2">
          {[3, 4, 5, 6].map(n => (
            <button key={n} onClick={() => setMealCount(n)}
              className="py-3 rounded-xl text-center transition-all active:scale-95 border-2"
              style={{
                backgroundColor: mealCount === n ? 'rgba(0,0,0,0.06)' : 'var(--theme-card-bg, #ffffff)',
                borderColor: mealCount === n ? '#000000' : '#f1f5f9',
                boxShadow: mealCount === n ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
              }}
            >
              <span className="text-2xl block">🍽</span>
              <span className="text-sm font-extrabold" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>{n}</span>
              <span className="text-[9px] block text-slate-400 font-semibold">meals</span>
            </button>
          ))}
        </div>
      </div>

      {/* Meal slots preview */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 block">Meal Schedule</label>
        <div className="space-y-2">
          {mealSlots.map((slot, idx) => {
            const mealCal = Math.round(calories * slot.calorieRatio);
            return (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100"
                style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.9))' }}>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-white text-xs font-bold">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>{slot.name}</p>
                  <p className="text-[10px] text-slate-400">{slot.time}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-extrabold text-orange-500">{mealCal} kcal</p>
                  <p className="text-[9px] text-slate-400">{Math.round(slot.calorieRatio * 100)}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// Step 4 — Food Builder
// ═══════════════════════════════════════════════════════════

function Step4FoodBuilder({
  mealSlots, mealFoods, activeMealIdx, setActiveMealIdx,
  filteredFoods, foodSearch, setFoodSearch,
  foodCatFilter, setFoodCatFilter,
  calories, mealCalorieTotals,
  addFoodToMeal, removeFoodFromMeal, updateFoodQty,
  showCustomFood, setShowCustomFood,
  customName, setCustomName, customServing, setCustomServing,
  customCal, setCustomCal, customP, setCustomP, customC, setCustomC, customF, setCustomF,
  addCustomFood, dietType, foodsLoading,
}: {
  foodsLoading: boolean;
  mealSlots: MealSlot[];
  mealFoods: MealFoodEntry[][];
  activeMealIdx: number; setActiveMealIdx: (v: number) => void;
  filteredFoods: FoodItem[];
  foodSearch: string; setFoodSearch: (v: string) => void;
  foodCatFilter: FoodCategory | 'all'; setFoodCatFilter: (v: FoodCategory | 'all') => void;
  calories: number;
  mealCalorieTotals: number[];
  addFoodToMeal: (f: FoodItem) => void;
  removeFoodFromMeal: (m: number, f: number) => void;
  updateFoodQty: (m: number, f: number, d: number) => void;
  showCustomFood: boolean; setShowCustomFood: (v: boolean) => void;
  customName: string; setCustomName: (v: string) => void;
  customServing: string; setCustomServing: (v: string) => void;
  customCal: string; setCustomCal: (v: string) => void;
  customP: string; setCustomP: (v: string) => void;
  customC: string; setCustomC: (v: string) => void;
  customF: string; setCustomF: (v: string) => void;
  addCustomFood: () => void;
  dietType: DietType | null;
}) {
  const activeSlot = mealSlots[activeMealIdx];
  const targetCal = Math.round(calories * (activeSlot?.calorieRatio || 0));
  const usedCal = mealCalorieTotals[activeMealIdx] || 0;
  const entries = mealFoods[activeMealIdx] || [];

  // Relevant categories for the current diet type
  const visibleCategories = FOOD_CATEGORIES.filter(c => {
    if (dietType === 'vegetarian') return !['chicken', 'egg', 'fish_seafood'].includes(c.id);
    if (dietType === 'eggetarian') return !['chicken', 'fish_seafood'].includes(c.id);
    return true;
  });

  return (
    <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.2 }} className="space-y-3 pt-1">

      {/* Meal tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {mealSlots.map((slot, idx) => {
          const isActive = activeMealIdx === idx;
          const hasFoods = (mealFoods[idx] || []).length > 0;
          return (
            <button key={idx} onClick={() => setActiveMealIdx(idx)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap shrink-0 transition-all ${
                isActive ? 'bg-orange-500 text-white shadow-md' : hasFoods ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {slot.name}
              {hasFoods && !isActive && <CheckCircle2 className="w-3 h-3" />}
            </button>
          );
        })}
      </div>

      {/* Calorie bar for this meal */}
      <div className="rounded-xl p-2.5 border border-slate-100" style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.9))' }}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold text-slate-500">{activeSlot?.name} · {activeSlot?.time}</span>
          <span className={`text-[10px] font-extrabold ${usedCal > targetCal ? 'text-red-500' : 'text-emerald-600'}`}>
            {usedCal} / {targetCal} kcal
          </span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className={`h-full rounded-full transition-all ${usedCal > targetCal ? 'bg-red-400' : 'bg-emerald-400'}`}
            style={{ width: `${Math.min((usedCal / Math.max(targetCal, 1)) * 100, 100)}%` }} />
        </div>
      </div>

      {/* Added foods for this meal */}
      {entries.length > 0 && (
        <div className="space-y-1">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Added Items</span>
          {entries.map((entry, fIdx) => (
            <div key={fIdx} className="flex items-center gap-2 p-2 rounded-xl border border-slate-100"
              style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.9))' }}>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold truncate" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>{entry.food.name}</p>
                <p className="text-[9px] text-slate-400">{entry.food.serving} · {entry.food.calories * entry.qty} kcal</p>
                <div className="flex gap-1.5">
                  <span className="text-[8px] font-bold text-blue-500">P:{entry.food.protein_g * entry.qty}g</span>
                  <span className="text-[8px] font-bold text-amber-500">C:{entry.food.carbs_g * entry.qty}g</span>
                  <span className="text-[8px] font-bold text-rose-400">F:{entry.food.fat_g * entry.qty}g</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => updateFoodQty(activeMealIdx, fIdx, -1)}
                  className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center active:scale-90">
                  <Minus className="w-3 h-3 text-slate-500" />
                </button>
                <span className="text-xs font-extrabold w-5 text-center" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>{entry.qty}</span>
                <button onClick={() => updateFoodQty(activeMealIdx, fIdx, 1)}
                  className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center active:scale-90">
                  <Plus className="w-3 h-3 text-slate-500" />
                </button>
                <button onClick={() => removeFoodFromMeal(activeMealIdx, fIdx)}
                  className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center active:scale-90 ml-1">
                  <Trash2 className="w-3 h-3 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input type="text" value={foodSearch} onChange={e => setFoodSearch(e.target.value)}
          placeholder="Search dishes... (paneer, chicken, idli...)"
          className="w-full pl-8 pr-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-orange-400"
          style={{ backgroundColor: 'var(--theme-input-bg, #f8fafc)', borderColor: 'var(--theme-input-border, #e2e8f0)', color: 'var(--theme-text-primary, #0f172a)' }}
        />
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        <button onClick={() => setFoodCatFilter('all')}
          className={`px-2.5 py-1 rounded-full text-[9px] font-bold whitespace-nowrap shrink-0 ${
            foodCatFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'
          }`}>
          All
        </button>
        {visibleCategories.map(cat => (
          <button key={cat.id} onClick={() => setFoodCatFilter(cat.id)}
            className={`px-2.5 py-1 rounded-full text-[9px] font-bold whitespace-nowrap shrink-0 ${
              foodCatFilter === cat.id ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'
            }`}>
            {cat.emoji} {cat.label}
          </button>
        ))}
      </div>

      {/* Custom food button */}
      <button onClick={() => setShowCustomFood(!showCustomFood)}
        className="text-[10px] font-bold text-orange-500 flex items-center gap-1">
        <Plus className="w-3 h-3" /> Add custom food item
      </button>

      {/* Custom food form */}
      {showCustomFood && (
        <div className="rounded-xl p-3 border border-orange-200 bg-orange-50/50 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Food name *"
              className="px-2 py-1.5 rounded-lg border text-[11px] focus:outline-none" style={{ borderColor: '#e2e8f0' }} />
            <input type="text" value={customServing} onChange={e => setCustomServing(e.target.value)} placeholder="Serving (e.g. 1 bowl)"
              className="px-2 py-1.5 rounded-lg border text-[11px] focus:outline-none" style={{ borderColor: '#e2e8f0' }} />
          </div>
          <div className="grid grid-cols-4 gap-2">
            <input type="number" value={customCal} onChange={e => setCustomCal(e.target.value)} placeholder="Cal *"
              className="px-2 py-1.5 rounded-lg border text-[11px] focus:outline-none text-center" style={{ borderColor: '#e2e8f0' }} />
            <input type="number" value={customP} onChange={e => setCustomP(e.target.value)} placeholder="P (g)"
              className="px-2 py-1.5 rounded-lg border text-[11px] focus:outline-none text-center" style={{ borderColor: '#e2e8f0' }} />
            <input type="number" value={customC} onChange={e => setCustomC(e.target.value)} placeholder="C (g)"
              className="px-2 py-1.5 rounded-lg border text-[11px] focus:outline-none text-center" style={{ borderColor: '#e2e8f0' }} />
            <input type="number" value={customF} onChange={e => setCustomF(e.target.value)} placeholder="F (g)"
              className="px-2 py-1.5 rounded-lg border text-[11px] focus:outline-none text-center" style={{ borderColor: '#e2e8f0' }} />
          </div>
          <button onClick={addCustomFood} disabled={!customName.trim() || !customCal.trim()}
            className="w-full py-1.5 rounded-lg text-[10px] font-bold text-white disabled:opacity-40"
            style={{ background: '#000', borderRadius: '8px' }}>
            Add to {mealSlots[activeMealIdx]?.name || 'Meal'}
          </button>
        </div>
      )}

      {/* Food list */}
      <div className="space-y-1.5 pb-4">
        {foodsLoading ? (
          <div className="text-center py-8">
            <span className="animate-spin inline-block w-6 h-6 border-2 border-slate-300 border-t-orange-500 rounded-full" />
            <p className="text-[11px] text-slate-400 mt-2">Loading food items...</p>
          </div>
        ) : filteredFoods.length === 0 ? (
          <div className="text-center py-8">
            <UtensilsCrossed className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-[11px] text-slate-400">No dishes found</p>
          </div>
        ) : (
          filteredFoods.slice(0, 50).map((food, idx) => (
            <button key={`${food.name}-${idx}`} onClick={() => addFoodToMeal(food)}
              className="w-full flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-100 text-left active:scale-[0.98] transition-all"
              style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.9))' }}>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center text-lg shrink-0">
                {FOOD_CATEGORIES.find(c => c.id === food.category)?.emoji || '🍽'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold truncate" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>{food.name}</p>
                <p className="text-[9px] text-slate-400">{food.serving}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[11px] font-extrabold text-orange-500">{food.calories} kcal</p>
                <div className="flex gap-1 justify-end">
                  <span className="text-[8px] font-bold text-blue-500">P:{food.protein_g}g</span>
                  <span className="text-[8px] font-bold text-amber-500">C:{food.carbs_g}g</span>
                  <span className="text-[8px] font-bold text-rose-400">F:{food.fat_g}g</span>
                </div>
              </div>
              <Plus className="w-4 h-4 text-slate-300 shrink-0" />
            </button>
          ))
        )}
        {filteredFoods.length > 50 && (
          <p className="text-center text-[10px] text-slate-400 py-2">
            Showing 50 of {filteredFoods.length} — use search to narrow
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// Step 5 — Review & Save
// ═══════════════════════════════════════════════════════════

function Step5Review({
  name, description, goal, dietType,
  calories, proteinG, carbsG, fatG,
  mealSlots, mealFoods, mealCalorieTotals, totalCaloriesUsed,
  notes, setNotes,
}: {
  name: string; description: string;
  goal: DietGoal; dietType: DietType;
  calories: number; proteinG: number; carbsG: number; fatG: number;
  mealSlots: MealSlot[]; mealFoods: MealFoodEntry[][]; mealCalorieTotals: number[];
  totalCaloriesUsed: number;
  notes: string; setNotes: (v: string) => void;
}) {
  const goalInfo = DIET_GOALS[goal];
  const typeInfo = DIET_TYPES[dietType];

  return (
    <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.2 }} className="space-y-3 pt-2">

      {/* Plan summary card */}
      <div className="rounded-2xl p-4 border border-white/40 shadow-sm"
        style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.9))' }}>
        <h3 className="text-sm font-extrabold mb-1" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>{name}</h3>
        {description && <p className="text-[11px] text-slate-500 mb-2">{description}</p>}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${goalInfo.color} text-white`}>{goalInfo.label}</span>
          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{typeInfo.emoji} {typeInfo.label}</span>
        </div>

        {/* Macro summary */}
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center p-2 rounded-xl bg-orange-50">
            <Flame className="w-3.5 h-3.5 text-orange-500 mx-auto" />
            <p className="text-sm font-extrabold" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>{calories}</p>
            <p className="text-[8px] text-slate-400">kcal target</p>
          </div>
          <div className="text-center p-2 rounded-xl bg-blue-50">
            <p className="text-xs">💪</p>
            <p className="text-sm font-extrabold text-blue-600">{proteinG}g</p>
            <p className="text-[8px] text-slate-400">Protein</p>
          </div>
          <div className="text-center p-2 rounded-xl bg-amber-50">
            <p className="text-xs">🌾</p>
            <p className="text-sm font-extrabold text-amber-600">{carbsG}g</p>
            <p className="text-[8px] text-slate-400">Carbs</p>
          </div>
          <div className="text-center p-2 rounded-xl bg-rose-50">
            <p className="text-xs">🫒</p>
            <p className="text-sm font-extrabold text-rose-500">{fatG}g</p>
            <p className="text-[8px] text-slate-400">Fat</p>
          </div>
        </div>

        <div className="mt-2 text-center">
          <p className={`text-[10px] font-bold ${Math.abs(totalCaloriesUsed - calories) < 100 ? 'text-emerald-600' : 'text-amber-500'}`}>
            Total from meals: {totalCaloriesUsed} kcal ({totalCaloriesUsed > calories ? '+' : ''}{totalCaloriesUsed - calories})
          </p>
        </div>
      </div>

      {/* Meals breakdown */}
      {mealSlots.map((slot, idx) => {
        const entries = mealFoods[idx] || [];
        if (entries.length === 0) return null;
        const mealCal = mealCalorieTotals[idx] || 0;
        const mealP = entries.reduce((s, e) => s + e.food.protein_g * e.qty, 0);
        const mealC = entries.reduce((s, e) => s + e.food.carbs_g * e.qty, 0);
        const mealF = entries.reduce((s, e) => s + e.food.fat_g * e.qty, 0);

        return (
          <div key={idx} className="rounded-xl p-3 border border-slate-100"
            style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.9))' }}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>{slot.name}</span>
              <div className="flex items-center gap-2 text-[9px]">
                <span className="text-orange-500 font-bold">{mealCal} kcal</span>
                <span className="text-slate-400">P:{mealP} C:{mealC} F:{mealF}</span>
              </div>
            </div>
            <ul className="space-y-0.5">
              {entries.map((e, i) => (
                <li key={i} className="text-[10px] flex items-center gap-1.5" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>
                  <span className="text-emerald-400">•</span>
                  {e.food.name} {e.qty > 1 && <span className="text-[9px] font-bold text-slate-400">x{e.qty}</span>}
                  <span className="text-[9px] text-slate-300 ml-auto">{e.food.calories * e.qty} kcal</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {/* Notes */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Notes (optional)</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Drink 3L water daily, avoid sugar..."
          rows={2}
          className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
          style={{ backgroundColor: 'var(--theme-input-bg, #f8fafc)', borderColor: 'var(--theme-input-border, #e2e8f0)', color: 'var(--theme-text-primary, #0f172a)' }}
        />
      </div>

      {/* Template notice */}
      <div className="flex items-center gap-2 p-3 rounded-xl border border-emerald-100"
        style={{ backgroundColor: 'rgba(16,185,129,0.06)' }}>
        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
        <p className="text-[10px] text-slate-500">This plan will be saved as a template for your gym</p>
      </div>
    </motion.div>
  );
}
