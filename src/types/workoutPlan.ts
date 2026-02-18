export type WorkoutGoal = 'strength' | 'hypertrophy' | 'fat_loss' | 'endurance' | 'general_fitness';
export type WorkoutLevel = 'beginner' | 'intermediate' | 'advanced';
export type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core' | 'full_body' | 'cardio';

export interface WorkoutExercise {
  name: string;
  sets: number;
  reps: string; // e.g. "12" or "8-10" or "30 sec"
  rest?: string; // e.g. "60s"
  notes?: string;
}

export interface WorkoutDay {
  day_name: string; // e.g. "Day 1 - Push" or "Monday - Chest & Triceps"
  muscle_groups: MuscleGroup[];
  exercises: WorkoutExercise[];
}

export interface WorkoutPlan {
  id: string;
  gym_id: string;
  name: string;
  description?: string | null;
  goal: WorkoutGoal;
  level: WorkoutLevel;
  days_per_week: number;
  duration_weeks?: number | null;
  days: WorkoutDay[];
  notes?: string | null;
  is_template: boolean;
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateWorkoutPlanInput {
  name: string;
  description?: string | null;
  goal: WorkoutGoal;
  level: WorkoutLevel;
  days_per_week: number;
  duration_weeks?: number | null;
  days: WorkoutDay[];
  notes?: string | null;
  is_template?: boolean;
}

export interface WorkoutAssignment {
  id: string;
  gym_id: string;
  member_id: string;
  workout_plan_id: string;
  assigned_date: string;
  start_date?: string | null;
  end_date?: string | null;
  notes?: string | null;
  assigned_by?: string | null;
  is_active: boolean;
  created_at: string;
  workout_plan?: WorkoutPlan;
}

export const WORKOUT_GOALS: Record<WorkoutGoal, { label: string; color: string; emoji: string }> = {
  strength: { label: 'Strength', color: 'from-red-500 to-orange-500', emoji: '🏋️' },
  hypertrophy: { label: 'Muscle Gain', color: 'from-blue-500 to-indigo-500', emoji: '💪' },
  fat_loss: { label: 'Fat Loss', color: 'from-amber-400 to-yellow-400', emoji: '🔥' },
  endurance: { label: 'Endurance', color: 'from-teal-400 to-cyan-500', emoji: '🏃' },
  general_fitness: { label: 'General', color: 'from-purple-400 to-fuchsia-400', emoji: '⚡' },
};

export const WORKOUT_LEVELS: Record<WorkoutLevel, { label: string; emoji: string }> = {
  beginner: { label: 'Beginner', emoji: '🌱' },
  intermediate: { label: 'Intermediate', emoji: '💫' },
  advanced: { label: 'Advanced', emoji: '🔥' },
};

export const MUSCLE_GROUPS: Record<MuscleGroup, { label: string; emoji: string }> = {
  chest: { label: 'Chest', emoji: '🫁' },
  back: { label: 'Back', emoji: '🦴' },
  shoulders: { label: 'Shoulders', emoji: '🏔️' },
  arms: { label: 'Arms', emoji: '💪' },
  legs: { label: 'Legs', emoji: '🦵' },
  core: { label: 'Core', emoji: '🎯' },
  full_body: { label: 'Full Body', emoji: '🏋️' },
  cardio: { label: 'Cardio', emoji: '❤️' },
};
