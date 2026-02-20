import { supabase, getCurrentGymId } from './supabase';
import type { ExerciseItem, MuscleGroup, Equipment, WorkoutLevel } from '@/types/workoutPlan';

interface DbExercise {
  id: string;
  name: string;
  muscle_group: string;
  equipment: string;
  difficulty: string;
  is_compound: boolean;
}

function toExerciseItem(row: DbExercise): ExerciseItem {
  return {
    id: row.id,
    name: row.name,
    muscle_group: row.muscle_group as MuscleGroup,
    equipment: row.equipment as Equipment,
    difficulty: row.difficulty as WorkoutLevel,
    is_compound: row.is_compound,
  };
}

class ExerciseService {
  private static instance: ExerciseService;

  static getInstance(): ExerciseService {
    if (!ExerciseService.instance) {
      ExerciseService.instance = new ExerciseService();
    }
    return ExerciseService.instance;
  }

  async getExercises(): Promise<ExerciseItem[]> {
    const gymId = await getCurrentGymId();
    if (!gymId) throw new Error('No gym ID found');

    const { data, error } = await supabase
      .from('gym_exercises')
      .select('id, name, muscle_group, equipment, difficulty, is_compound')
      .eq('gym_id', gymId)
      .eq('is_active', true)
      .order('muscle_group')
      .order('name')
      .range(0, 1999);

    if (error) throw error;
    return (data || []).map(toExerciseItem);
  }
}

export const exerciseService = ExerciseService.getInstance();
