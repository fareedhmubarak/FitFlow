/**
 * CreateWorkoutPlan — 4-step workout plan wizard.
 *
 * Step 1: Basic Info (name, description, goal, level, days/week, duration)
 * Step 2: Split Structure (day names + muscle groups per day)
 * Step 3: Exercise Builder (search + add exercises from DB per day)
 * Step 4: Review & Save
 */

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronRight, ChevronLeft, Search, Plus, Minus,
  CheckCircle2, Dumbbell, Trash2,
} from 'lucide-react';
import {
  WORKOUT_GOALS, WORKOUT_LEVELS, MUSCLE_GROUPS,
  type WorkoutGoal, type WorkoutLevel, type MuscleGroup,
  type WorkoutExercise, type WorkoutDay, type CreateWorkoutPlanInput,
  type ExerciseItem,
} from '@/types/workoutPlan';
import { useCreateWorkoutPlan } from '@/hooks/useWorkoutPlans';
import { useExercises } from '@/hooks/useExercises';
import toast from 'react-hot-toast';

// ═══════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════

type Step = 1 | 2 | 3 | 4;
const STEP_LABELS = ['Basic Info', 'Split', 'Exercises', 'Review'];

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
}

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export default function CreateWorkoutPlan({ open, onClose, onCreated }: Props) {
  const [step, setStep] = useState<Step>(1);

  // Step 1 — Basic Info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState<WorkoutGoal | null>(null);
  const [level, setLevel] = useState<WorkoutLevel | null>(null);
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [durationWeeks, setDurationWeeks] = useState(8);

  // Step 2 — Split structure
  const [days, setDays] = useState<{ day_name: string; muscle_groups: MuscleGroup[] }[]>([]);

  // Step 3 — Exercises per day
  const [dayExercises, setDayExercises] = useState<WorkoutExercise[][]>([]);
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | 'all'>('all');

  // Step 4 — Notes
  const [notes, setNotes] = useState('');

  const createPlan = useCreateWorkoutPlan();
  const { data: allExercises = [], isLoading: exercisesLoading } = useExercises();

  // ── Derived ─────────────────────────────────────────────

  // Initialize days when moving from step 1 to step 2
  const initDays = useCallback(() => {
    if (days.length !== daysPerWeek) {
      const next = Array.from({ length: daysPerWeek }, (_, i) => days[i] || { day_name: `Day ${i + 1}`, muscle_groups: [] as MuscleGroup[] });
      setDays(next);
    }
  }, [daysPerWeek, days]);

  // Initialize exercise arrays when moving from step 2 to step 3
  const initExercises = useCallback(() => {
    const next: WorkoutExercise[][] = Array.from({ length: daysPerWeek }, (_, i) => dayExercises[i] || []);
    setDayExercises(next);
    setActiveDayIdx(0);
  }, [daysPerWeek, dayExercises]);

  // Filter exercises from DB
  const filteredExercises = useMemo(() => {
    let items = allExercises;
    // Default: show exercises matching the active day's muscle groups
    const activeDay = days[activeDayIdx];
    const effectiveFilter = muscleFilter !== 'all' ? muscleFilter : null;

    if (effectiveFilter) {
      items = items.filter(e => e.muscle_group === effectiveFilter);
    } else if (activeDay?.muscle_groups.length) {
      items = items.filter(e => activeDay.muscle_groups.includes(e.muscle_group));
    }

    if (exerciseSearch.trim()) {
      const q = exerciseSearch.toLowerCase();
      items = items.filter(e => e.name.toLowerCase().includes(q));
    }
    return items;
  }, [allExercises, muscleFilter, exerciseSearch, days, activeDayIdx]);

  // ── Handlers ────────────────────────────────────────────

  const updateDayName = (idx: number, val: string) => {
    setDays(prev => prev.map((d, i) => i === idx ? { ...d, day_name: val } : d));
  };

  const toggleDayMuscle = (dayIdx: number, mg: MuscleGroup) => {
    setDays(prev => prev.map((d, i) => {
      if (i !== dayIdx) return d;
      const has = d.muscle_groups.includes(mg);
      return { ...d, muscle_groups: has ? d.muscle_groups.filter(m => m !== mg) : [...d.muscle_groups, mg] };
    }));
  };

  const addExerciseToDay = (exercise: ExerciseItem) => {
    setDayExercises(prev => {
      const copy = prev.map(arr => [...arr]);
      const existing = copy[activeDayIdx].findIndex(e => e.name === exercise.name);
      if (existing >= 0) return copy; // already added
      copy[activeDayIdx].push({
        name: exercise.name,
        sets: 3,
        reps: exercise.muscle_group === 'cardio' ? '30 sec' : '10-12',
        rest: '60s',
      });
      return copy;
    });
  };

  const removeExercise = (dayIdx: number, exIdx: number) => {
    setDayExercises(prev => {
      const copy = prev.map(arr => [...arr]);
      copy[dayIdx].splice(exIdx, 1);
      return copy;
    });
  };

  const updateExerciseField = (dayIdx: number, exIdx: number, field: keyof WorkoutExercise, value: string | number) => {
    setDayExercises(prev => {
      const copy = prev.map(arr => [...arr]);
      copy[dayIdx] = copy[dayIdx].map((ex, i) => i === exIdx ? { ...ex, [field]: value } : ex);
      return copy;
    });
  };

  const updateExerciseSets = (dayIdx: number, exIdx: number, delta: number) => {
    setDayExercises(prev => {
      const copy = prev.map(arr => [...arr]);
      const current = copy[dayIdx][exIdx].sets;
      const newVal = Math.max(1, Math.min(10, current + delta));
      copy[dayIdx][exIdx] = { ...copy[dayIdx][exIdx], sets: newVal };
      return copy;
    });
  };

  // Validation
  const canProceed = (s: Step): boolean => {
    switch (s) {
      case 1: return name.trim().length >= 2 && !!goal && !!level;
      case 2: return days.every(d => d.day_name.trim().length > 0 && d.muscle_groups.length > 0);
      case 3: return dayExercises.some(d => d.length > 0);
      default: return true;
    }
  };

  const goNext = () => {
    if (!canProceed(step)) return;
    if (step === 1) initDays();
    if (step === 2) initExercises();
    if (step < 4) setStep((step + 1) as Step);
  };

  const goBack = () => {
    if (step > 1) setStep((step - 1) as Step);
  };

  // Save
  const handleSave = async () => {
    if (!goal || !level) return;
    const workoutDays: WorkoutDay[] = days.map((d, idx) => ({
      day_name: d.day_name,
      muscle_groups: d.muscle_groups,
      exercises: dayExercises[idx] || [],
    }));

    const input: CreateWorkoutPlanInput = {
      name: name.trim(),
      description: description.trim() || null,
      goal,
      level,
      days_per_week: daysPerWeek,
      duration_weeks: durationWeeks || null,
      days: workoutDays,
      notes: notes.trim() || null,
      is_template: true,
    };

    createPlan.mutate(input, {
      onSuccess: (plan) => {
        toast.success('Workout plan created!');
        onCreated?.(plan.id);
        resetAndClose();
      },
      onError: () => toast.error('Failed to create workout plan'),
    });
  };

  const resetAndClose = () => {
    setStep(1); setName(''); setDescription(''); setGoal(null); setLevel(null);
    setDaysPerWeek(4); setDurationWeeks(8); setDays([]); setDayExercises([]);
    setActiveDayIdx(0); setExerciseSearch(''); setMuscleFilter('all'); setNotes('');
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
        style={{ top: '25%', backgroundColor: 'var(--theme-popup-bg, #ffffff)' }}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-2 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 pb-1 shrink-0">
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button onClick={goBack}
                className="w-9 h-9 rounded-full flex items-center justify-center active:scale-95"
                style={{ backgroundColor: '#f1f5f9', position: 'relative', zIndex: 10 }}>
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
            )}
            <h2 className="text-base font-extrabold" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>
              Create Workout Plan
            </h2>
          </div>
          <button onClick={resetAndClose}
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-95"
            style={{ backgroundColor: '#f1f5f9', position: 'relative', zIndex: 10 }}>
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-1 px-4 py-2 shrink-0">
          {STEP_LABELS.map((label, i) => {
            const s = (i + 1) as Step;
            const isActive = step === s;
            const isDone = step > s;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div className={`h-1 w-full rounded-full transition-all ${
                  isDone ? 'bg-emerald-500' : isActive ? 'bg-violet-500' : 'bg-slate-200'
                }`} />
                <span className={`text-[8px] font-bold uppercase tracking-wide ${
                  isActive ? 'text-violet-600' : isDone ? 'text-emerald-600' : 'text-slate-400'
                }`}>{label}</span>
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <Step1BasicInfo key="s1"
                name={name} setName={setName}
                description={description} setDescription={setDescription}
                goal={goal} setGoal={setGoal}
                level={level} setLevel={setLevel}
                daysPerWeek={daysPerWeek} setDaysPerWeek={setDaysPerWeek}
                durationWeeks={durationWeeks} setDurationWeeks={setDurationWeeks}
              />
            )}
            {step === 2 && (
              <Step2Split key="s2"
                days={days}
                updateDayName={updateDayName}
                toggleDayMuscle={toggleDayMuscle}
              />
            )}
            {step === 3 && (
              <Step3ExerciseBuilder key="s3"
                days={days}
                dayExercises={dayExercises}
                activeDayIdx={activeDayIdx}
                setActiveDayIdx={setActiveDayIdx}
                filteredExercises={filteredExercises}
                exerciseSearch={exerciseSearch}
                setExerciseSearch={setExerciseSearch}
                muscleFilter={muscleFilter}
                setMuscleFilter={setMuscleFilter}
                addExerciseToDay={addExerciseToDay}
                removeExercise={removeExercise}
                updateExerciseField={updateExerciseField}
                updateExerciseSets={updateExerciseSets}
                exercisesLoading={exercisesLoading}
              />
            )}
            {step === 4 && (
              <Step4Review key="s4"
                name={name} description={description}
                goal={goal!} level={level!}
                daysPerWeek={daysPerWeek} durationWeeks={durationWeeks}
                days={days} dayExercises={dayExercises}
                notes={notes} setNotes={setNotes}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-4 pb-5 pt-2 border-t border-slate-100" style={{ position: 'relative', zIndex: 10 }}>
          <div className="flex gap-3">
            {step > 1 && (
              <button onClick={goBack}
                className="py-3 px-5 font-bold text-sm rounded-xl flex items-center justify-center gap-1 active:scale-[0.98] transition-all"
                style={{ background: '#f1f5f9', color: '#334155', borderRadius: '14px', position: 'relative', zIndex: 10 }}>
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            )}
            {step < 4 ? (
              <button onClick={goNext} disabled={!canProceed(step)}
                className="flex-1 py-3 font-bold text-sm rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                style={{
                  background: canProceed(step) ? '#000000' : '#d1d5db',
                  color: canProceed(step) ? '#ffffff' : '#9ca3af',
                  cursor: canProceed(step) ? 'pointer' : 'not-allowed',
                  borderRadius: '14px',
                  boxShadow: canProceed(step) ? '0 6px 16px rgba(0,0,0,0.25)' : 'none',
                  position: 'relative', zIndex: 10,
                }}>
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSave} disabled={createPlan.isPending}
                className="flex-1 py-3 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                style={{ background: '#000000', borderRadius: '14px', boxShadow: '0 6px 16px rgba(0,0,0,0.25)', position: 'relative', zIndex: 10 }}>
                {createPlan.isPending ? (
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> Save Workout Plan</>
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
  name, setName, description, setDescription,
  goal, setGoal, level, setLevel,
  daysPerWeek, setDaysPerWeek, durationWeeks, setDurationWeeks,
}: {
  name: string; setName: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  goal: WorkoutGoal | null; setGoal: (v: WorkoutGoal) => void;
  level: WorkoutLevel | null; setLevel: (v: WorkoutLevel) => void;
  daysPerWeek: number; setDaysPerWeek: (v: number) => void;
  durationWeeks: number; setDurationWeeks: (v: number) => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.2 }} className="space-y-4 pt-2">

      {/* Name */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Plan Name *</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Push Pull Legs (6 Days)"
          className="w-full px-3 py-2.5 rounded-xl border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-400"
          style={{ backgroundColor: 'var(--theme-input-bg, #f8fafc)', borderColor: 'var(--theme-input-border, #e2e8f0)', color: 'var(--theme-text-primary, #0f172a)' }}
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Description (optional)</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief notes about this plan..."
          rows={2}
          className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
          style={{ backgroundColor: 'var(--theme-input-bg, #f8fafc)', borderColor: 'var(--theme-input-border, #e2e8f0)', color: 'var(--theme-text-primary, #0f172a)' }}
        />
      </div>

      {/* Goal */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 block">Goal *</label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(WORKOUT_GOALS) as [WorkoutGoal, { label: string; color: string; emoji: string }][]).map(([key, val]) => (
            <button key={key} onClick={() => setGoal(key)}
              className={`p-2.5 rounded-xl border-2 text-left transition-all active:scale-95 ${goal === key ? 'selection-active' : ''}`}
              style={{
                backgroundColor: goal === key ? '#1c1c1e' : 'var(--theme-card-bg, #ffffff)',
                borderColor: goal === key ? '#1c1c1e' : '#f1f5f9',
                boxShadow: goal === key ? '0 2px 8px rgba(0,0,0,0.18)' : 'none',
              }}>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${val.color} text-white`}>{val.emoji} {val.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Level */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 block">Level *</label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.entries(WORKOUT_LEVELS) as [WorkoutLevel, { label: string; emoji: string }][]).map(([key, val]) => (
            <button key={key} onClick={() => setLevel(key)}
              className={`p-3 rounded-xl border-2 text-center transition-all active:scale-95 ${level === key ? 'selection-active' : ''}`}
              style={{
                backgroundColor: level === key ? '#1c1c1e' : 'var(--theme-card-bg, #ffffff)',
                borderColor: level === key ? '#1c1c1e' : '#f1f5f9',
                boxShadow: level === key ? '0 2px 8px rgba(0,0,0,0.18)' : 'none',
              }}>
              <span className="text-2xl block mb-1">{val.emoji}</span>
              <span className={`text-[10px] font-bold ${level === key ? 'text-white' : ''}`}
                style={level === key ? {} : { color: 'var(--theme-text-primary, #0f172a)' }}>{val.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Days per week */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 block">Days per Week</label>
        <div className="grid grid-cols-6 gap-1.5">
          {[2, 3, 4, 5, 6, 7].map(n => (
            <button key={n} onClick={() => setDaysPerWeek(n)}
              className={`py-2.5 rounded-xl text-center transition-all active:scale-95 border-2 ${daysPerWeek === n ? 'selection-active' : ''}`}
              style={{
                backgroundColor: daysPerWeek === n ? '#1c1c1e' : 'var(--theme-card-bg, #ffffff)',
                borderColor: daysPerWeek === n ? '#1c1c1e' : '#f1f5f9',
                boxShadow: daysPerWeek === n ? '0 2px 8px rgba(0,0,0,0.18)' : 'none',
              }}>
              <span className={`text-sm font-extrabold ${daysPerWeek === n ? 'text-white' : ''}`}
                style={daysPerWeek === n ? {} : { color: 'var(--theme-text-primary, #0f172a)' }}>{n}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Duration */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
          Duration — <span className="text-violet-500">{durationWeeks} weeks</span>
        </label>
        <input type="range" min="4" max="24" step="1" value={durationWeeks}
          onChange={e => setDurationWeeks(Number(e.target.value))}
          className="w-full accent-violet-500" />
        <div className="flex justify-between text-[9px] text-slate-400 font-semibold">
          <span>4 weeks</span><span>24 weeks</span>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// Step 2 — Split Structure
// ═══════════════════════════════════════════════════════════

function Step2Split({
  days, updateDayName, toggleDayMuscle,
}: {
  days: { day_name: string; muscle_groups: MuscleGroup[] }[];
  updateDayName: (idx: number, val: string) => void;
  toggleDayMuscle: (dayIdx: number, mg: MuscleGroup) => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.2 }} className="space-y-3 pt-2">

      <p className="text-[10px] text-slate-400 font-semibold">Name each day and select the muscle groups targeted.</p>

      {days.map((day, idx) => (
        <div key={idx} className="rounded-xl p-3 border border-slate-100 space-y-2"
          style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.9))' }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
              {idx + 1}
            </div>
            <input type="text" value={day.day_name} onChange={e => updateDayName(idx, e.target.value)}
              placeholder={`Day ${idx + 1} name`}
              className="flex-1 px-2 py-1.5 rounded-lg border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-violet-400"
              style={{ backgroundColor: 'var(--theme-input-bg, #f8fafc)', borderColor: 'var(--theme-input-border, #e2e8f0)', color: 'var(--theme-text-primary, #0f172a)' }}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(Object.entries(MUSCLE_GROUPS) as [MuscleGroup, { label: string; emoji: string }][]).map(([mg, info]) => {
              const selected = day.muscle_groups.includes(mg);
              return (
                <button key={mg} onClick={() => toggleDayMuscle(idx, mg)}
                  className={`px-2 py-1 rounded-full text-[9px] font-bold transition-all active:scale-95 ${selected ? 'selection-active' : ''}`}
                  style={{
                    backgroundColor: selected ? '#1c1c1e' : '#f1f5f9',
                    color: selected ? '#ffffff' : 'var(--theme-text-secondary, #64748b)',
                    boxShadow: selected ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
                  }}>
                  {info.emoji} {info.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// Step 3 — Exercise Builder
// ═══════════════════════════════════════════════════════════

function Step3ExerciseBuilder({
  days, dayExercises, activeDayIdx, setActiveDayIdx,
  filteredExercises, exerciseSearch, setExerciseSearch,
  muscleFilter, setMuscleFilter,
  addExerciseToDay, removeExercise, updateExerciseField, updateExerciseSets,
  exercisesLoading,
}: {
  days: { day_name: string; muscle_groups: MuscleGroup[] }[];
  dayExercises: WorkoutExercise[][];
  activeDayIdx: number; setActiveDayIdx: (v: number) => void;
  filteredExercises: ExerciseItem[];
  exerciseSearch: string; setExerciseSearch: (v: string) => void;
  muscleFilter: MuscleGroup | 'all'; setMuscleFilter: (v: MuscleGroup | 'all') => void;
  addExerciseToDay: (e: ExerciseItem) => void;
  removeExercise: (d: number, e: number) => void;
  updateExerciseField: (d: number, e: number, f: keyof WorkoutExercise, v: string | number) => void;
  updateExerciseSets: (d: number, e: number, delta: number) => void;
  exercisesLoading: boolean;
}) {
  const activeDay = days[activeDayIdx];
  const exercises = dayExercises[activeDayIdx] || [];

  return (
    <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.2 }} className="space-y-3 pt-1">

      {/* Day tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {days.map((day, idx) => {
          const isActive = activeDayIdx === idx;
          const hasExercises = (dayExercises[idx] || []).length > 0;
          return (
            <button key={idx} onClick={() => { setActiveDayIdx(idx); setMuscleFilter('all'); setExerciseSearch(''); }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap shrink-0 transition-all ${
                isActive ? 'bg-violet-500 text-white shadow-md' : hasExercises ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
              }`}>
              {day.day_name}
              {hasExercises && !isActive && <CheckCircle2 className="w-3 h-3" />}
            </button>
          );
        })}
      </div>

      {/* Day info */}
      <div className="rounded-xl p-2.5 border border-slate-100" style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.9))' }}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-500">{activeDay?.day_name}</span>
          <span className="text-[10px] font-extrabold text-violet-600">{exercises.length} exercise{exercises.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {activeDay?.muscle_groups.map(mg => (
            <span key={mg} className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700">
              {MUSCLE_GROUPS[mg].emoji} {MUSCLE_GROUPS[mg].label}
            </span>
          ))}
        </div>
      </div>

      {/* Added exercises for this day */}
      {exercises.length > 0 && (
        <div className="space-y-1">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Added Exercises</span>
          {exercises.map((ex, eIdx) => (
            <div key={eIdx} className="p-2 rounded-xl border border-slate-100"
              style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.9))' }}>
              <div className="flex items-center gap-2 mb-1.5">
                <p className="text-[11px] font-bold truncate flex-1" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>{ex.name}</p>
                <button onClick={() => removeExercise(activeDayIdx, eIdx)}
                  className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center active:scale-90 shrink-0">
                  <Trash2 className="w-3 h-3 text-red-400" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                {/* Sets */}
                <div className="flex items-center gap-1">
                  <button onClick={() => updateExerciseSets(activeDayIdx, eIdx, -1)}
                    className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center active:scale-90">
                    <Minus className="w-2.5 h-2.5 text-slate-500" />
                  </button>
                  <span className="text-[10px] font-extrabold w-4 text-center" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>{ex.sets}</span>
                  <button onClick={() => updateExerciseSets(activeDayIdx, eIdx, 1)}
                    className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center active:scale-90">
                    <Plus className="w-2.5 h-2.5 text-slate-500" />
                  </button>
                  <span className="text-[9px] text-slate-400">sets</span>
                </div>
                {/* Reps */}
                <input type="text" value={ex.reps} onChange={e => updateExerciseField(activeDayIdx, eIdx, 'reps', e.target.value)}
                  className="w-16 px-1.5 py-1 rounded-lg border text-[10px] font-bold text-center focus:outline-none focus:ring-1 focus:ring-violet-400"
                  style={{ backgroundColor: 'var(--theme-input-bg, #f8fafc)', borderColor: '#e2e8f0', color: 'var(--theme-text-primary, #0f172a)' }}
                  placeholder="reps" />
                {/* Rest */}
                <input type="text" value={ex.rest || ''} onChange={e => updateExerciseField(activeDayIdx, eIdx, 'rest', e.target.value)}
                  className="w-14 px-1.5 py-1 rounded-lg border text-[10px] font-bold text-center focus:outline-none focus:ring-1 focus:ring-violet-400"
                  style={{ backgroundColor: 'var(--theme-input-bg, #f8fafc)', borderColor: '#e2e8f0', color: 'var(--theme-text-primary, #0f172a)' }}
                  placeholder="rest" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input type="text" value={exerciseSearch} onChange={e => setExerciseSearch(e.target.value)}
          placeholder="Search exercises..."
          className="w-full pl-8 pr-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-violet-400"
          style={{ backgroundColor: 'var(--theme-input-bg, #f8fafc)', borderColor: 'var(--theme-input-border, #e2e8f0)', color: 'var(--theme-text-primary, #0f172a)' }}
        />
      </div>

      {/* Muscle group filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        <button onClick={() => setMuscleFilter('all')}
          className={`px-2.5 py-1 rounded-full text-[9px] font-bold whitespace-nowrap shrink-0 ${
            muscleFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'
          }`}>
          {activeDay?.muscle_groups.length ? 'Day Muscles' : 'All'}
        </button>
        {(Object.entries(MUSCLE_GROUPS) as [MuscleGroup, { label: string; emoji: string }][]).map(([mg, info]) => (
          <button key={mg} onClick={() => setMuscleFilter(mg)}
            className={`px-2.5 py-1 rounded-full text-[9px] font-bold whitespace-nowrap shrink-0 ${
              muscleFilter === mg ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'
            }`}>
            {info.emoji} {info.label}
          </button>
        ))}
      </div>

      {/* Exercise list from DB */}
      <div className="space-y-1.5 pb-4">
        {exercisesLoading ? (
          <div className="text-center py-8">
            <span className="animate-spin inline-block w-6 h-6 border-2 border-slate-300 border-t-violet-500 rounded-full" />
            <p className="text-[11px] text-slate-400 mt-2">Loading exercises...</p>
          </div>
        ) : filteredExercises.length === 0 ? (
          <div className="text-center py-8">
            <Dumbbell className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-[11px] text-slate-400">No exercises found</p>
          </div>
        ) : (
          filteredExercises.slice(0, 50).map((ex, idx) => {
            const alreadyAdded = exercises.some(e => e.name === ex.name);
            return (
              <button key={`${ex.name}-${idx}`} onClick={() => !alreadyAdded && addExerciseToDay(ex)}
                disabled={alreadyAdded}
                className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                  alreadyAdded ? 'opacity-50 border-emerald-200' : 'border-slate-100 active:scale-[0.98]'
                }`}
                style={{ backgroundColor: alreadyAdded ? 'rgba(16,185,129,0.05)' : 'var(--theme-card-bg, rgba(255,255,255,0.9))' }}>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center text-lg shrink-0">
                  {MUSCLE_GROUPS[ex.muscle_group]?.emoji || '🏋️'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold truncate" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>{ex.name}</p>
                  <div className="flex gap-1.5 mt-0.5">
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                      {MUSCLE_GROUPS[ex.muscle_group]?.label}
                    </span>
                    <span className="text-[8px] font-semibold text-slate-400">{ex.equipment}</span>
                    {ex.is_compound && (
                      <span className="text-[8px] font-bold text-amber-500">compound</span>
                    )}
                  </div>
                </div>
                {alreadyAdded ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <Plus className="w-4 h-4 text-slate-300 shrink-0" />
                )}
              </button>
            );
          })
        )}
        {filteredExercises.length > 50 && (
          <p className="text-center text-[10px] text-slate-400 py-2">
            Showing 50 of {filteredExercises.length} — use search to narrow
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// Step 4 — Review & Save
// ═══════════════════════════════════════════════════════════

function Step4Review({
  name, description, goal, level,
  daysPerWeek, durationWeeks,
  days, dayExercises,
  notes, setNotes,
}: {
  name: string; description: string;
  goal: WorkoutGoal; level: WorkoutLevel;
  daysPerWeek: number; durationWeeks: number;
  days: { day_name: string; muscle_groups: MuscleGroup[] }[];
  dayExercises: WorkoutExercise[][];
  notes: string; setNotes: (v: string) => void;
}) {
  const goalInfo = WORKOUT_GOALS[goal];
  const levelInfo = WORKOUT_LEVELS[level];
  const totalExercises = dayExercises.reduce((sum, d) => sum + d.length, 0);

  return (
    <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.2 }} className="space-y-3 pt-2">

      {/* Summary card */}
      <div className="rounded-2xl p-4 border border-white/40 shadow-sm"
        style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.9))' }}>
        <h3 className="text-sm font-extrabold mb-1" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>{name}</h3>
        {description && <p className="text-[11px] text-slate-500 mb-2">{description}</p>}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${goalInfo.color} text-white`}>{goalInfo.emoji} {goalInfo.label}</span>
          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{levelInfo.emoji} {levelInfo.label}</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded-xl bg-violet-50">
            <p className="text-sm font-extrabold text-violet-600">{daysPerWeek}</p>
            <p className="text-[8px] text-slate-400">Days/Week</p>
          </div>
          <div className="text-center p-2 rounded-xl bg-blue-50">
            <p className="text-sm font-extrabold text-blue-600">{durationWeeks}</p>
            <p className="text-[8px] text-slate-400">Weeks</p>
          </div>
          <div className="text-center p-2 rounded-xl bg-amber-50">
            <p className="text-sm font-extrabold text-amber-600">{totalExercises}</p>
            <p className="text-[8px] text-slate-400">Exercises</p>
          </div>
        </div>
      </div>

      {/* Days breakdown */}
      {days.map((day, idx) => {
        const exercises = dayExercises[idx] || [];
        if (exercises.length === 0) return null;
        return (
          <div key={idx} className="rounded-xl p-3 border border-slate-100"
            style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.9))' }}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>{day.day_name}</span>
              <div className="flex gap-1">
                {day.muscle_groups.map(mg => (
                  <span key={mg} className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700">
                    {MUSCLE_GROUPS[mg].emoji} {MUSCLE_GROUPS[mg].label}
                  </span>
                ))}
              </div>
            </div>
            <ul className="space-y-0.5">
              {exercises.map((ex, i) => (
                <li key={i} className="text-[10px] flex items-center gap-1.5" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>
                  <span className="text-violet-400">•</span>
                  <span className="flex-1">{ex.name}</span>
                  <span className="text-[9px] font-bold text-slate-400">{ex.sets}x{ex.reps}</span>
                  {ex.rest && <span className="text-[9px] text-slate-300">({ex.rest})</span>}
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {/* Notes */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Notes (optional)</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Rest days, progressive overload tips..."
          rows={2}
          className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
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
