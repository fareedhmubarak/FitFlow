import { supabase, getCurrentGymId } from './supabase';
import type { WorkoutPlan, CreateWorkoutPlanInput, WorkoutAssignment } from '@/types/workoutPlan';
import { gymService } from './gymService';
import { auditLogger } from './auditLogger';

class WorkoutPlanService {
  private static instance: WorkoutPlanService;

  static getInstance(): WorkoutPlanService {
    if (!WorkoutPlanService.instance) {
      WorkoutPlanService.instance = new WorkoutPlanService();
    }
    return WorkoutPlanService.instance;
  }

  async getWorkoutPlans(): Promise<WorkoutPlan[]> {
    const gymId = await getCurrentGymId();
    if (!gymId) return [];

    const { data, error } = await supabase
      .from('gym_workout_plans')
      .select('*')
      .eq('gym_id', gymId)
      .eq('is_active', true)
      .order('is_template', { ascending: false })
      .order('name');

    if (error) throw error;

    const templateCount = (data || []).filter((p: any) => p.is_template).length;
    if (templateCount < 20) {
      await this.seedDefaultTemplates(gymId);
      const { data: seeded } = await supabase
        .from('gym_workout_plans')
        .select('*')
        .eq('gym_id', gymId)
        .eq('is_active', true)
        .order('is_template', { ascending: false })
        .order('name');
      return (seeded || []) as WorkoutPlan[];
    }

    return data as WorkoutPlan[];
  }

  async getWorkoutPlanById(id: string): Promise<WorkoutPlan | null> {
    const gymId = await getCurrentGymId();
    if (!gymId) return null;

    const { data, error } = await supabase
      .from('gym_workout_plans')
      .select('*')
      .eq('id', id)
      .eq('gym_id', gymId)
      .single();

    if (error) return null;
    return data as WorkoutPlan;
  }

  async createWorkoutPlan(input: CreateWorkoutPlanInput): Promise<WorkoutPlan> {
    const gymId = await getCurrentGymId();
    if (!gymId) throw new Error('No gym ID found');

    const { data, error } = await supabase
      .from('gym_workout_plans')
      .insert({ gym_id: gymId, ...input, is_active: true, is_template: input.is_template ?? false })
      .select()
      .single();

    if (error) throw error;
    auditLogger.logWorkoutPlanCreated(data.id, input.name, input.goal, input.level);
    return data as WorkoutPlan;
  }

  async deleteWorkoutPlan(id: string): Promise<void> {
    const gymId = await getCurrentGymId();
    if (!gymId) throw new Error('No gym ID found');

    const { error } = await supabase
      .from('gym_workout_plans')
      .update({ is_active: false })
      .eq('id', id)
      .eq('gym_id', gymId);

    if (error) throw error;
    auditLogger.logWorkoutPlanDeleted(id, '');
  }

  async assignWorkoutPlan(memberId: string, planId: string, notes?: string): Promise<WorkoutAssignment> {
    const gymId = await getCurrentGymId();
    if (!gymId) throw new Error('No gym ID found');

    // Deactivate existing assignments
    await supabase
      .from('gym_member_workout_assignments')
      .update({ is_active: false })
      .eq('member_id', memberId)
      .eq('gym_id', gymId)
      .eq('is_active', true);

    const { data, error } = await supabase
      .from('gym_member_workout_assignments')
      .insert({
        gym_id: gymId,
        member_id: memberId,
        workout_plan_id: planId,
        assigned_date: new Date().toISOString().split('T')[0],
        notes: notes || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    auditLogger.logWorkoutPlanAssigned(planId, '', memberId, '');
    return data as WorkoutAssignment;
  }

  async getMemberWorkoutAssignment(memberId: string): Promise<(WorkoutAssignment & { workout_plan: WorkoutPlan }) | null> {
    const gymId = await getCurrentGymId();
    if (!gymId) return null;

    const { data, error } = await supabase
      .from('gym_member_workout_assignments')
      .select('*, workout_plan:gym_workout_plans(*)')
      .eq('member_id', memberId)
      .eq('gym_id', gymId)
      .eq('is_active', true)
      .order('assigned_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return data as WorkoutAssignment & { workout_plan: WorkoutPlan };
  }

  shareWorkoutPlanViaWhatsApp(plan: WorkoutPlan, memberPhone: string) {
    let text = `🏋️ *${plan.name}*\n`;
    text += `Goal: ${plan.goal.replace('_', ' ')} | Level: ${plan.level}\n`;
    text += `${plan.days_per_week} days/week\n\n`;

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

    const link = gymService.generateWhatsAppLink(memberPhone, text);
    window.open(link, '_blank', 'noopener,noreferrer');
    auditLogger.logWorkoutPlanShared(plan.id, plan.name, memberPhone);
  }

  async seedDefaultTemplates(gymId: string): Promise<void> {
    // Fetch existing template names to avoid duplicates
    const { data: existing } = await supabase
      .from('gym_workout_plans')
      .select('name')
      .eq('gym_id', gymId)
      .eq('is_template', true)
      .eq('is_active', true);
    const existingNames = new Set((existing || []).map((t: any) => t.name));

    const templates: Omit<CreateWorkoutPlanInput, 'is_template'>[] = [
      {
        name: 'Beginner Full Body (3 Days)',
        description: 'Simple full body routine for gym beginners. Perfect for first-timers.',
        goal: 'general_fitness',
        level: 'beginner',
        days_per_week: 3,
        duration_weeks: 8,
        days: [
          {
            day_name: 'Day 1 — Full Body A',
            muscle_groups: ['full_body'],
            exercises: [
              { name: 'Flat Bench Press', sets: 3, reps: '12', rest: '90s' },
              { name: 'Lat Pulldown', sets: 3, reps: '12', rest: '60s' },
              { name: 'Overhead Dumbbell Press', sets: 3, reps: '12', rest: '60s' },
              { name: 'Leg Press', sets: 3, reps: '15', rest: '90s' },
              { name: 'Cable Bicep Curl', sets: 2, reps: '15', rest: '45s' },
              { name: 'Tricep Pushdown', sets: 2, reps: '15', rest: '45s' },
              { name: 'Plank', sets: 3, reps: '30 sec', rest: '30s' },
            ],
          },
          {
            day_name: 'Day 2 — Full Body B',
            muscle_groups: ['full_body'],
            exercises: [
              { name: 'Incline Dumbbell Press', sets: 3, reps: '12', rest: '60s' },
              { name: 'Seated Cable Row', sets: 3, reps: '12', rest: '60s' },
              { name: 'Dumbbell Lateral Raise', sets: 3, reps: '15', rest: '45s' },
              { name: 'Goblet Squat', sets: 3, reps: '12', rest: '90s' },
              { name: 'Dumbbell Hammer Curl', sets: 2, reps: '12', rest: '45s' },
              { name: 'Overhead Tricep Extension', sets: 2, reps: '12', rest: '45s' },
              { name: 'Leg Raise', sets: 3, reps: '12', rest: '30s' },
            ],
          },
          {
            day_name: 'Day 3 — Full Body C',
            muscle_groups: ['full_body'],
            exercises: [
              { name: 'Smith Machine Bench Press', sets: 3, reps: '10', rest: '60s' },
              { name: 'T-Bar Row', sets: 3, reps: '10', rest: '60s' },
              { name: 'Machine Shoulder Press', sets: 3, reps: '12', rest: '60s' },
              { name: 'Leg Extension', sets: 3, reps: '15', rest: '60s' },
              { name: 'Leg Curl', sets: 3, reps: '15', rest: '60s' },
              { name: 'EZ Bar Curl', sets: 2, reps: '12', rest: '45s' },
              { name: 'Crunches', sets: 3, reps: '20', rest: '30s' },
            ],
          },
        ],
        notes: 'Rest 1 day between sessions. Focus on form over weight.',
      },
      {
        name: 'Bro Split (5 Days)',
        description: 'Classic bodybuilder split — one major muscle group per day.',
        goal: 'hypertrophy',
        level: 'intermediate',
        days_per_week: 5,
        duration_weeks: 12,
        days: [
          {
            day_name: 'Monday — Chest',
            muscle_groups: ['chest'],
            exercises: [
              { name: 'Flat Barbell Bench Press', sets: 4, reps: '8-10', rest: '90s' },
              { name: 'Incline Dumbbell Press', sets: 4, reps: '10-12', rest: '60s' },
              { name: 'Cable Flyes', sets: 3, reps: '12-15', rest: '45s' },
              { name: 'Decline Bench Press', sets: 3, reps: '10', rest: '60s' },
              { name: 'Pec Deck Machine', sets: 3, reps: '15', rest: '45s' },
            ],
          },
          {
            day_name: 'Tuesday — Back',
            muscle_groups: ['back'],
            exercises: [
              { name: 'Deadlift', sets: 4, reps: '6-8', rest: '120s' },
              { name: 'Barbell Row', sets: 4, reps: '8-10', rest: '90s' },
              { name: 'Lat Pulldown (Wide Grip)', sets: 3, reps: '10-12', rest: '60s' },
              { name: 'Seated Cable Row', sets: 3, reps: '12', rest: '60s' },
              { name: 'Face Pull', sets: 3, reps: '15', rest: '45s' },
            ],
          },
          {
            day_name: 'Wednesday — Shoulders',
            muscle_groups: ['shoulders'],
            exercises: [
              { name: 'Overhead Press (Barbell)', sets: 4, reps: '8-10', rest: '90s' },
              { name: 'Dumbbell Lateral Raise', sets: 4, reps: '12-15', rest: '45s' },
              { name: 'Reverse Pec Deck', sets: 3, reps: '15', rest: '45s' },
              { name: 'Front Raise', sets: 3, reps: '12', rest: '45s' },
              { name: 'Barbell Shrugs', sets: 3, reps: '12-15', rest: '60s' },
            ],
          },
          {
            day_name: 'Thursday — Legs',
            muscle_groups: ['legs'],
            exercises: [
              { name: 'Barbell Back Squat', sets: 4, reps: '8-10', rest: '120s' },
              { name: 'Leg Press', sets: 4, reps: '10-12', rest: '90s' },
              { name: 'Romanian Deadlift', sets: 3, reps: '10-12', rest: '90s' },
              { name: 'Leg Extension', sets: 3, reps: '12-15', rest: '60s' },
              { name: 'Lying Leg Curl', sets: 3, reps: '12-15', rest: '60s' },
              { name: 'Standing Calf Raise', sets: 4, reps: '15-20', rest: '45s' },
            ],
          },
          {
            day_name: 'Friday — Arms',
            muscle_groups: ['arms'],
            exercises: [
              { name: 'Barbell Curl', sets: 3, reps: '10', rest: '60s' },
              { name: 'Close-Grip Bench Press', sets: 3, reps: '10', rest: '60s' },
              { name: 'Preacher Curl', sets: 3, reps: '12', rest: '45s' },
              { name: 'Skull Crusher', sets: 3, reps: '12', rest: '45s' },
              { name: 'Hammer Curl', sets: 3, reps: '12', rest: '45s' },
              { name: 'Tricep Rope Pushdown', sets: 3, reps: '15', rest: '45s' },
              { name: 'Wrist Curl', sets: 2, reps: '20', rest: '30s' },
            ],
          },
        ],
        notes: 'Weekend rest. Increase weight by 2.5kg when all sets hit the top rep range.',
      },
      {
        name: 'Push Pull Legs (6 Days)',
        description: 'PPL split hitting each muscle group twice per week for maximum growth.',
        goal: 'hypertrophy',
        level: 'advanced',
        days_per_week: 6,
        duration_weeks: 12,
        days: [
          {
            day_name: 'Day 1 — Push',
            muscle_groups: ['chest', 'shoulders', 'arms'],
            exercises: [
              { name: 'Flat Bench Press', sets: 4, reps: '6-8', rest: '120s' },
              { name: 'Incline Dumbbell Press', sets: 3, reps: '8-10', rest: '90s' },
              { name: 'Overhead Press', sets: 4, reps: '8-10', rest: '90s' },
              { name: 'Lateral Raise', sets: 4, reps: '12-15', rest: '45s' },
              { name: 'Tricep Dip', sets: 3, reps: '10-12', rest: '60s' },
              { name: 'Cable Flyes', sets: 3, reps: '12-15', rest: '45s' },
            ],
          },
          {
            day_name: 'Day 2 — Pull',
            muscle_groups: ['back', 'arms'],
            exercises: [
              { name: 'Barbell Row', sets: 4, reps: '6-8', rest: '120s' },
              { name: 'Pull-Up / Lat Pulldown', sets: 4, reps: '8-10', rest: '90s' },
              { name: 'Cable Row (Close Grip)', sets: 3, reps: '10-12', rest: '60s' },
              { name: 'Face Pull', sets: 3, reps: '15-20', rest: '45s' },
              { name: 'Barbell Curl', sets: 3, reps: '10-12', rest: '60s' },
              { name: 'Hammer Curl', sets: 3, reps: '12', rest: '45s' },
            ],
          },
          {
            day_name: 'Day 3 — Legs',
            muscle_groups: ['legs', 'core'],
            exercises: [
              { name: 'Barbell Squat', sets: 4, reps: '6-8', rest: '120s' },
              { name: 'Romanian Deadlift', sets: 4, reps: '8-10', rest: '90s' },
              { name: 'Leg Press', sets: 3, reps: '10-12', rest: '90s' },
              { name: 'Walking Lunges', sets: 3, reps: '12 each', rest: '60s' },
              { name: 'Leg Curl', sets: 3, reps: '12-15', rest: '45s' },
              { name: 'Calf Raise', sets: 4, reps: '15', rest: '45s' },
              { name: 'Hanging Leg Raise', sets: 3, reps: '12', rest: '30s' },
            ],
          },
          {
            day_name: 'Day 4 — Push (Volume)',
            muscle_groups: ['chest', 'shoulders', 'arms'],
            exercises: [
              { name: 'Incline Barbell Press', sets: 4, reps: '8-10', rest: '90s' },
              { name: 'Dumbbell Bench Press', sets: 3, reps: '10-12', rest: '60s' },
              { name: 'Arnold Press', sets: 3, reps: '10-12', rest: '60s' },
              { name: 'Cable Lateral Raise', sets: 4, reps: '15', rest: '45s' },
              { name: 'Pec Deck', sets: 3, reps: '12-15', rest: '45s' },
              { name: 'Overhead Tricep Extension', sets: 3, reps: '12', rest: '45s' },
            ],
          },
          {
            day_name: 'Day 5 — Pull (Volume)',
            muscle_groups: ['back', 'arms'],
            exercises: [
              { name: 'Deadlift', sets: 3, reps: '5', rest: '180s' },
              { name: 'Chin-Up', sets: 4, reps: '8-10', rest: '90s' },
              { name: 'T-Bar Row', sets: 3, reps: '10-12', rest: '60s' },
              { name: 'Straight Arm Pulldown', sets: 3, reps: '12-15', rest: '45s' },
              { name: 'Incline Dumbbell Curl', sets: 3, reps: '12', rest: '45s' },
              { name: 'Reverse Curl', sets: 3, reps: '12', rest: '45s' },
            ],
          },
          {
            day_name: 'Day 6 — Legs (Volume)',
            muscle_groups: ['legs', 'core'],
            exercises: [
              { name: 'Front Squat', sets: 4, reps: '8-10', rest: '90s' },
              { name: 'Bulgarian Split Squat', sets: 3, reps: '10 each', rest: '60s' },
              { name: 'Hip Thrust', sets: 3, reps: '12', rest: '60s' },
              { name: 'Leg Extension', sets: 3, reps: '15', rest: '45s' },
              { name: 'Seated Calf Raise', sets: 4, reps: '15', rest: '45s' },
              { name: 'Cable Crunch', sets: 3, reps: '15', rest: '30s' },
            ],
          },
        ],
        notes: 'Sunday rest. Progressively overload every 2 weeks.',
      },
      {
        name: 'Upper Lower (4 Days)',
        description: 'Balanced upper/lower split — great for intermediates building strength & size.',
        goal: 'strength',
        level: 'intermediate',
        days_per_week: 4,
        duration_weeks: 10,
        days: [
          {
            day_name: 'Mon — Upper (Strength)',
            muscle_groups: ['chest', 'back', 'shoulders', 'arms'],
            exercises: [
              { name: 'Barbell Bench Press', sets: 4, reps: '5-6', rest: '120s' },
              { name: 'Barbell Row', sets: 4, reps: '6-8', rest: '90s' },
              { name: 'Overhead Press', sets: 3, reps: '6-8', rest: '90s' },
              { name: 'Weighted Pull-Up', sets: 3, reps: '6-8', rest: '90s' },
              { name: 'Barbell Curl', sets: 3, reps: '10', rest: '60s' },
              { name: 'Close-Grip Bench', sets: 3, reps: '8-10', rest: '60s' },
            ],
          },
          {
            day_name: 'Tue — Lower (Strength)',
            muscle_groups: ['legs', 'core'],
            exercises: [
              { name: 'Barbell Back Squat', sets: 4, reps: '5-6', rest: '180s' },
              { name: 'Sumo Deadlift', sets: 3, reps: '5', rest: '180s' },
              { name: 'Leg Press', sets: 3, reps: '8-10', rest: '90s' },
              { name: 'Leg Curl', sets: 3, reps: '10-12', rest: '60s' },
              { name: 'Calf Raise', sets: 4, reps: '12-15', rest: '45s' },
              { name: 'Ab Wheel Rollout', sets: 3, reps: '10', rest: '45s' },
            ],
          },
          {
            day_name: 'Thu — Upper (Hypertrophy)',
            muscle_groups: ['chest', 'back', 'shoulders', 'arms'],
            exercises: [
              { name: 'Incline Dumbbell Press', sets: 4, reps: '10-12', rest: '60s' },
              { name: 'Cable Row', sets: 4, reps: '10-12', rest: '60s' },
              { name: 'Dumbbell Lateral Raise', sets: 4, reps: '15', rest: '45s' },
              { name: 'Lat Pulldown', sets: 3, reps: '10-12', rest: '60s' },
              { name: 'Incline Curl', sets: 3, reps: '12', rest: '45s' },
              { name: 'Tricep Pushdown', sets: 3, reps: '12-15', rest: '45s' },
              { name: 'Face Pull', sets: 3, reps: '15', rest: '45s' },
            ],
          },
          {
            day_name: 'Fri — Lower (Hypertrophy)',
            muscle_groups: ['legs', 'core'],
            exercises: [
              { name: 'Front Squat', sets: 3, reps: '8-10', rest: '90s' },
              { name: 'Romanian Deadlift', sets: 3, reps: '10-12', rest: '90s' },
              { name: 'Walking Lunges', sets: 3, reps: '12 each', rest: '60s' },
              { name: 'Leg Extension', sets: 3, reps: '15', rest: '45s' },
              { name: 'Seated Leg Curl', sets: 3, reps: '12-15', rest: '45s' },
              { name: 'Standing Calf Raise', sets: 4, reps: '15', rest: '45s' },
              { name: 'Plank', sets: 3, reps: '45 sec', rest: '30s' },
            ],
          },
        ],
        notes: 'Wed & weekends rest. Focus on progressive overload for compound lifts.',
      },
      {
        name: 'Circuit Training (3 Days)',
        description: 'High-intensity circuit with minimal rest — ideal for fat loss and conditioning.',
        goal: 'fat_loss',
        level: 'intermediate',
        days_per_week: 3,
        duration_weeks: 8,
        days: [
          {
            day_name: 'Day 1 — Upper Body Circuit',
            muscle_groups: ['chest', 'back', 'shoulders', 'arms'],
            exercises: [
              { name: 'Push-Ups', sets: 3, reps: '15', rest: '15s', notes: 'Circuit: no rest between exercises' },
              { name: 'Dumbbell Row', sets: 3, reps: '12', rest: '15s' },
              { name: 'Dumbbell Shoulder Press', sets: 3, reps: '12', rest: '15s' },
              { name: 'Dumbbell Curl', sets: 3, reps: '15', rest: '15s' },
              { name: 'Tricep Dip (Bench)', sets: 3, reps: '15', rest: '15s' },
              { name: 'Jumping Jacks', sets: 3, reps: '30', rest: '60s', notes: '60s rest after each round' },
            ],
          },
          {
            day_name: 'Day 2 — Lower Body Circuit',
            muscle_groups: ['legs', 'core'],
            exercises: [
              { name: 'Bodyweight Squat', sets: 3, reps: '20', rest: '15s' },
              { name: 'Alternating Lunges', sets: 3, reps: '12 each', rest: '15s' },
              { name: 'Dumbbell Goblet Squat', sets: 3, reps: '15', rest: '15s' },
              { name: 'Glute Bridge', sets: 3, reps: '20', rest: '15s' },
              { name: 'Calf Raise', sets: 3, reps: '25', rest: '15s' },
              { name: 'Mountain Climbers', sets: 3, reps: '30', rest: '60s' },
            ],
          },
          {
            day_name: 'Day 3 — Full Body HIIT',
            muscle_groups: ['full_body', 'cardio'],
            exercises: [
              { name: 'Burpees', sets: 4, reps: '10', rest: '20s' },
              { name: 'Kettlebell Swing', sets: 4, reps: '15', rest: '20s' },
              { name: 'Box Jump / Step-Up', sets: 4, reps: '12', rest: '20s' },
              { name: 'Battle Rope Slam', sets: 4, reps: '20', rest: '20s' },
              { name: 'Plank Hold', sets: 4, reps: '30 sec', rest: '20s' },
              { name: 'Jump Rope', sets: 4, reps: '60 sec', rest: '60s' },
            ],
          },
        ],
        notes: 'Alternate days. No rest between exercises within a circuit. 60s between rounds. 3 rounds per circuit.',
      },
      {
        name: "Women's Toning (4 Days)",
        description: 'Lower body & core focused with moderate upper body for a toned physique.',
        goal: 'fat_loss',
        level: 'beginner',
        days_per_week: 4,
        duration_weeks: 8,
        days: [
          {
            day_name: 'Mon — Lower Body',
            muscle_groups: ['legs'],
            exercises: [
              { name: 'Goblet Squat', sets: 3, reps: '15', rest: '60s' },
              { name: 'Hip Thrust', sets: 3, reps: '12', rest: '60s' },
              { name: 'Dumbbell Romanian Deadlift', sets: 3, reps: '12', rest: '60s' },
              { name: 'Sumo Squat', sets: 3, reps: '15', rest: '45s' },
              { name: 'Leg Press (Narrow Stance)', sets: 3, reps: '15', rest: '60s' },
            ],
          },
          {
            day_name: 'Tue — Upper Body & Core',
            muscle_groups: ['chest', 'back', 'shoulders', 'core'],
            exercises: [
              { name: 'Dumbbell Bench Press', sets: 3, reps: '12', rest: '60s' },
              { name: 'Lat Pulldown', sets: 3, reps: '12', rest: '60s' },
              { name: 'Seated Dumbbell Press', sets: 3, reps: '12', rest: '45s' },
              { name: 'Lateral Raise', sets: 3, reps: '15', rest: '30s' },
              { name: 'Russian Twist', sets: 3, reps: '20', rest: '30s' },
              { name: 'Leg Raise', sets: 3, reps: '15', rest: '30s' },
            ],
          },
          {
            day_name: 'Thu — Glutes & Hamstrings',
            muscle_groups: ['legs'],
            exercises: [
              { name: 'Barbell Hip Thrust', sets: 4, reps: '10-12', rest: '60s' },
              { name: 'Bulgarian Split Squat', sets: 3, reps: '10 each', rest: '60s' },
              { name: 'Cable Kickback', sets: 3, reps: '12 each', rest: '45s' },
              { name: 'Lying Leg Curl', sets: 3, reps: '12', rest: '45s' },
              { name: 'Seated Calf Raise', sets: 3, reps: '20', rest: '30s' },
            ],
          },
          {
            day_name: 'Fri — Full Body & Cardio',
            muscle_groups: ['full_body', 'cardio'],
            exercises: [
              { name: 'Dumbbell Squat to Press', sets: 3, reps: '12', rest: '45s' },
              { name: 'Bent Over Dumbbell Row', sets: 3, reps: '12', rest: '45s' },
              { name: 'Step-Up', sets: 3, reps: '10 each', rest: '45s' },
              { name: 'Plank', sets: 3, reps: '45 sec', rest: '30s' },
              { name: 'Treadmill Incline Walk', sets: 1, reps: '15 min', rest: '0s', notes: 'Incline 10-12%, Speed 5-6 km/h' },
            ],
          },
        ],
        notes: 'Wed & weekends rest. Keep weights moderate, focus on mind-muscle connection. Add 5min warm-up & cool-down.',
      },
      {
        name: 'Home Workout (No Equipment)',
        description: 'Full bodyweight routine — no gym required. Great for travel or home training.',
        goal: 'general_fitness',
        level: 'beginner',
        days_per_week: 4,
        duration_weeks: 6,
        days: [
          {
            day_name: 'Day 1 — Upper Body',
            muscle_groups: ['chest', 'back', 'shoulders', 'arms'],
            exercises: [
              { name: 'Push-Ups', sets: 4, reps: '12-15', rest: '45s' },
              { name: 'Diamond Push-Ups', sets: 3, reps: '10', rest: '45s' },
              { name: 'Pike Push-Ups', sets: 3, reps: '10', rest: '45s' },
              { name: 'Superman Hold', sets: 3, reps: '30 sec', rest: '30s' },
              { name: 'Arm Circles', sets: 3, reps: '30 sec', rest: '20s' },
            ],
          },
          {
            day_name: 'Day 2 — Lower Body',
            muscle_groups: ['legs', 'core'],
            exercises: [
              { name: 'Bodyweight Squat', sets: 4, reps: '20', rest: '45s' },
              { name: 'Lunges', sets: 3, reps: '12 each', rest: '45s' },
              { name: 'Glute Bridge', sets: 4, reps: '15', rest: '45s' },
              { name: 'Wall Sit', sets: 3, reps: '30 sec', rest: '30s' },
              { name: 'Calf Raise', sets: 3, reps: '25', rest: '20s' },
            ],
          },
          {
            day_name: 'Day 3 — Core & Abs',
            muscle_groups: ['core'],
            exercises: [
              { name: 'Plank', sets: 3, reps: '45 sec', rest: '30s' },
              { name: 'Bicycle Crunches', sets: 3, reps: '20', rest: '30s' },
              { name: 'Leg Raise', sets: 3, reps: '15', rest: '30s' },
              { name: 'Mountain Climbers', sets: 3, reps: '30', rest: '30s' },
              { name: 'Side Plank', sets: 3, reps: '20 sec each', rest: '20s' },
              { name: 'Flutter Kicks', sets: 3, reps: '20', rest: '20s' },
            ],
          },
          {
            day_name: 'Day 4 — Full Body HIIT',
            muscle_groups: ['full_body', 'cardio'],
            exercises: [
              { name: 'Burpees', sets: 4, reps: '8', rest: '30s' },
              { name: 'Jump Squats', sets: 4, reps: '12', rest: '30s' },
              { name: 'Push-Up to Shoulder Tap', sets: 4, reps: '10', rest: '30s' },
              { name: 'High Knees', sets: 4, reps: '30 sec', rest: '30s' },
              { name: 'Plank Jacks', sets: 4, reps: '15', rest: '30s' },
            ],
          },
        ],
        notes: 'No equipment needed. Perfect for days you can\'t come to the gym.',
      },
      {
        name: '5×5 Strength Program',
        description: 'Heavy compound lifts — the classic strength builder for serious lifters.',
        goal: 'strength',
        level: 'intermediate',
        days_per_week: 3,
        duration_weeks: 12,
        days: [
          {
            day_name: 'Day A — Squat / Bench / Row',
            muscle_groups: ['legs', 'chest', 'back'],
            exercises: [
              { name: 'Barbell Back Squat', sets: 5, reps: '5', rest: '180s' },
              { name: 'Barbell Bench Press', sets: 5, reps: '5', rest: '180s' },
              { name: 'Barbell Row', sets: 5, reps: '5', rest: '120s' },
            ],
          },
          {
            day_name: 'Day B — Squat / OHP / Deadlift',
            muscle_groups: ['legs', 'shoulders', 'back'],
            exercises: [
              { name: 'Barbell Back Squat', sets: 5, reps: '5', rest: '180s' },
              { name: 'Overhead Press', sets: 5, reps: '5', rest: '120s' },
              { name: 'Deadlift', sets: 1, reps: '5', rest: '180s', notes: '1 top set of 5' },
            ],
          },
        ],
        notes: 'Alternate Day A and Day B (e.g. Week 1: A-B-A, Week 2: B-A-B). Add 2.5kg per session for upper body, 5kg for lower body. Deload if you fail 3 sessions in a row on a lift.',
      },
      {
        name: 'Abs & Core Add-On',
        description: 'Quick 15-minute core routine to add after any workout.',
        goal: 'general_fitness',
        level: 'beginner',
        days_per_week: 3,
        duration_weeks: 6,
        days: [
          {
            day_name: 'Core Routine A',
            muscle_groups: ['core'],
            exercises: [
              { name: 'Plank', sets: 3, reps: '45 sec', rest: '20s' },
              { name: 'Crunches', sets: 3, reps: '20', rest: '20s' },
              { name: 'Leg Raise', sets: 3, reps: '12', rest: '20s' },
              { name: 'Russian Twist', sets: 3, reps: '20', rest: '20s' },
            ],
          },
          {
            day_name: 'Core Routine B',
            muscle_groups: ['core'],
            exercises: [
              { name: 'Dead Bug', sets: 3, reps: '10 each', rest: '20s' },
              { name: 'Bicycle Crunch', sets: 3, reps: '20', rest: '20s' },
              { name: 'Mountain Climbers', sets: 3, reps: '20', rest: '20s' },
              { name: 'Side Plank', sets: 3, reps: '25 sec each', rest: '20s' },
            ],
          },
          {
            day_name: 'Core Routine C',
            muscle_groups: ['core'],
            exercises: [
              { name: 'Hanging Leg Raise', sets: 3, reps: '10', rest: '30s' },
              { name: 'Cable Crunch', sets: 3, reps: '15', rest: '20s' },
              { name: 'Ab Wheel Rollout', sets: 3, reps: '8', rest: '30s' },
              { name: 'Flutter Kicks', sets: 3, reps: '20', rest: '20s' },
            ],
          },
        ],
        notes: 'Add this after your main workout. Rotate between A, B, C. Takes ~15 minutes.',
      },
      {
        name: 'Beginner PPL (3 Days)',
        description: 'Simplified Push/Pull/Legs for beginners — 3 days per week to start the PPL journey.',
        goal: 'hypertrophy',
        level: 'beginner',
        days_per_week: 3,
        duration_weeks: 10,
        days: [
          {
            day_name: 'Mon — Push (Chest/Shoulders/Triceps)',
            muscle_groups: ['chest', 'shoulders', 'arms'],
            exercises: [
              { name: 'Flat Bench Press (Smith/Barbell)', sets: 3, reps: '10-12', rest: '90s' },
              { name: 'Incline Dumbbell Press', sets: 3, reps: '12', rest: '60s' },
              { name: 'Machine Shoulder Press', sets: 3, reps: '12', rest: '60s' },
              { name: 'Dumbbell Lateral Raise', sets: 3, reps: '15', rest: '45s' },
              { name: 'Tricep Rope Pushdown', sets: 3, reps: '12-15', rest: '45s' },
            ],
          },
          {
            day_name: 'Wed — Pull (Back/Biceps)',
            muscle_groups: ['back', 'arms'],
            exercises: [
              { name: 'Lat Pulldown', sets: 3, reps: '10-12', rest: '90s' },
              { name: 'Seated Cable Row', sets: 3, reps: '12', rest: '60s' },
              { name: 'Dumbbell Row', sets: 3, reps: '10 each', rest: '60s' },
              { name: 'Face Pull', sets: 3, reps: '15', rest: '45s' },
              { name: 'EZ Bar Curl', sets: 3, reps: '12', rest: '45s' },
            ],
          },
          {
            day_name: 'Fri — Legs',
            muscle_groups: ['legs', 'core'],
            exercises: [
              { name: 'Leg Press', sets: 3, reps: '12-15', rest: '90s' },
              { name: 'Goblet Squat', sets: 3, reps: '12', rest: '60s' },
              { name: 'Leg Extension', sets: 3, reps: '15', rest: '45s' },
              { name: 'Lying Leg Curl', sets: 3, reps: '12', rest: '45s' },
              { name: 'Standing Calf Raise', sets: 3, reps: '20', rest: '30s' },
              { name: 'Plank', sets: 3, reps: '30 sec', rest: '30s' },
            ],
          },
        ],
        notes: 'Great starting point. After 8-10 weeks, graduate to the 6-day PPL split.',
      },
      // ────────────────────  NEW TEMPLATES (11–20)  ────────────────────
      {
        name: 'Powerlifting SBD (4 Days)',
        description: 'Squat, Bench, Deadlift focused program for competitive or aspiring powerlifters.',
        goal: 'strength',
        level: 'advanced',
        days_per_week: 4,
        duration_weeks: 12,
        days: [
          {
            day_name: 'Mon — Heavy Squat',
            muscle_groups: ['legs', 'core'],
            exercises: [
              { name: 'Barbell Back Squat', sets: 5, reps: '3-5', rest: '180s' },
              { name: 'Pause Squat', sets: 3, reps: '3', rest: '120s', notes: '2-sec pause at bottom' },
              { name: 'Front Squat', sets: 3, reps: '6', rest: '120s' },
              { name: 'Leg Press', sets: 3, reps: '10', rest: '90s' },
              { name: 'Ab Wheel Rollout', sets: 3, reps: '10', rest: '45s' },
            ],
          },
          {
            day_name: 'Tue — Heavy Bench',
            muscle_groups: ['chest', 'shoulders', 'arms'],
            exercises: [
              { name: 'Barbell Bench Press', sets: 5, reps: '3-5', rest: '180s' },
              { name: 'Close-Grip Bench Press', sets: 3, reps: '6-8', rest: '120s' },
              { name: 'Incline Dumbbell Press', sets: 3, reps: '8-10', rest: '90s' },
              { name: 'Dumbbell Lateral Raise', sets: 3, reps: '12', rest: '45s' },
              { name: 'Tricep Dip', sets: 3, reps: '8-10', rest: '60s' },
            ],
          },
          {
            day_name: 'Thu — Heavy Deadlift',
            muscle_groups: ['back', 'legs'],
            exercises: [
              { name: 'Conventional Deadlift', sets: 5, reps: '3-5', rest: '180s' },
              { name: 'Deficit Deadlift', sets: 3, reps: '5', rest: '120s' },
              { name: 'Barbell Row', sets: 4, reps: '6-8', rest: '90s' },
              { name: 'Romanian Deadlift', sets: 3, reps: '8', rest: '90s' },
              { name: 'Face Pull', sets: 3, reps: '15', rest: '45s' },
            ],
          },
          {
            day_name: 'Fri — Volume Day',
            muscle_groups: ['chest', 'legs', 'back'],
            exercises: [
              { name: 'Barbell Back Squat (Light)', sets: 4, reps: '8', rest: '90s', notes: '70% of heavy day' },
              { name: 'Barbell Bench Press (Light)', sets: 4, reps: '8', rest: '90s', notes: '70% of heavy day' },
              { name: 'Pull-Up', sets: 4, reps: '8-10', rest: '60s' },
              { name: 'Leg Curl', sets: 3, reps: '12', rest: '45s' },
              { name: 'Plank', sets: 3, reps: '60 sec', rest: '30s' },
            ],
          },
        ],
        notes: 'Competition style. Increase top sets by 2.5kg every 2 weeks. Deload every 4th week.',
      },
      {
        name: 'PHUL (4 Days)',
        description: 'Power Hypertrophy Upper Lower — blend of heavy strength and volume hypertrophy.',
        goal: 'hypertrophy',
        level: 'intermediate',
        days_per_week: 4,
        duration_weeks: 12,
        days: [
          {
            day_name: 'Mon — Upper Power',
            muscle_groups: ['chest', 'back', 'shoulders', 'arms'],
            exercises: [
              { name: 'Barbell Bench Press', sets: 4, reps: '4-6', rest: '120s' },
              { name: 'Barbell Row', sets: 4, reps: '4-6', rest: '120s' },
              { name: 'Overhead Press', sets: 3, reps: '5-7', rest: '90s' },
              { name: 'Weighted Pull-Up', sets: 3, reps: '5-7', rest: '90s' },
              { name: 'Barbell Curl', sets: 2, reps: '6-8', rest: '60s' },
              { name: 'Skull Crusher', sets: 2, reps: '6-8', rest: '60s' },
            ],
          },
          {
            day_name: 'Tue — Lower Power',
            muscle_groups: ['legs', 'core'],
            exercises: [
              { name: 'Barbell Back Squat', sets: 4, reps: '4-6', rest: '180s' },
              { name: 'Deadlift', sets: 3, reps: '3-5', rest: '180s' },
              { name: 'Leg Press', sets: 3, reps: '8-10', rest: '90s' },
              { name: 'Leg Curl', sets: 3, reps: '6-8', rest: '60s' },
              { name: 'Calf Raise', sets: 4, reps: '8-10', rest: '45s' },
              { name: 'Plank', sets: 3, reps: '45 sec', rest: '30s' },
            ],
          },
          {
            day_name: 'Thu — Upper Hypertrophy',
            muscle_groups: ['chest', 'back', 'shoulders', 'arms'],
            exercises: [
              { name: 'Incline Dumbbell Press', sets: 4, reps: '10-12', rest: '60s' },
              { name: 'Cable Row (Close Grip)', sets: 4, reps: '10-12', rest: '60s' },
              { name: 'Dumbbell Lateral Raise', sets: 4, reps: '12-15', rest: '45s' },
              { name: 'Lat Pulldown', sets: 3, reps: '10-12', rest: '60s' },
              { name: 'Cable Flyes', sets: 3, reps: '12-15', rest: '45s' },
              { name: 'Incline Curl', sets: 3, reps: '12', rest: '45s' },
              { name: 'Tricep Pushdown', sets: 3, reps: '12-15', rest: '45s' },
            ],
          },
          {
            day_name: 'Fri — Lower Hypertrophy',
            muscle_groups: ['legs', 'core'],
            exercises: [
              { name: 'Front Squat', sets: 4, reps: '8-10', rest: '90s' },
              { name: 'Romanian Deadlift', sets: 4, reps: '10-12', rest: '90s' },
              { name: 'Walking Lunges', sets: 3, reps: '12 each', rest: '60s' },
              { name: 'Leg Extension', sets: 3, reps: '12-15', rest: '45s' },
              { name: 'Seated Leg Curl', sets: 3, reps: '12-15', rest: '45s' },
              { name: 'Standing Calf Raise', sets: 4, reps: '15-20', rest: '45s' },
              { name: 'Hanging Leg Raise', sets: 3, reps: '12', rest: '30s' },
            ],
          },
        ],
        notes: 'Wed & weekends rest. Power days: heavy weight, low reps. Hypertrophy days: moderate weight, higher reps.',
      },
      {
        name: 'Arnold Split (6 Days)',
        description: 'Arnold Schwarzenegger-inspired split — Chest+Back, Shoulders+Arms, Legs, repeat.',
        goal: 'hypertrophy',
        level: 'advanced',
        days_per_week: 6,
        duration_weeks: 12,
        days: [
          {
            day_name: 'Day 1 — Chest & Back',
            muscle_groups: ['chest', 'back'],
            exercises: [
              { name: 'Flat Bench Press', sets: 4, reps: '8-10', rest: '90s' },
              { name: 'Pull-Up (Wide Grip)', sets: 4, reps: '8-10', rest: '90s' },
              { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', rest: '60s' },
              { name: 'T-Bar Row', sets: 3, reps: '10-12', rest: '60s' },
              { name: 'Cable Crossover', sets: 3, reps: '12-15', rest: '45s' },
              { name: 'Seated Cable Row', sets: 3, reps: '12', rest: '60s' },
            ],
          },
          {
            day_name: 'Day 2 — Shoulders & Arms',
            muscle_groups: ['shoulders', 'arms'],
            exercises: [
              { name: 'Arnold Press', sets: 4, reps: '10-12', rest: '60s' },
              { name: 'Barbell Curl', sets: 3, reps: '10', rest: '60s' },
              { name: 'Dumbbell Lateral Raise', sets: 4, reps: '12-15', rest: '45s' },
              { name: 'Skull Crusher', sets: 3, reps: '10-12', rest: '60s' },
              { name: 'Reverse Pec Deck', sets: 3, reps: '15', rest: '45s' },
              { name: 'Hammer Curl', sets: 3, reps: '12', rest: '45s' },
              { name: 'Tricep Rope Pushdown', sets: 3, reps: '12-15', rest: '45s' },
            ],
          },
          {
            day_name: 'Day 3 — Legs',
            muscle_groups: ['legs', 'core'],
            exercises: [
              { name: 'Barbell Back Squat', sets: 5, reps: '8-10', rest: '120s' },
              { name: 'Leg Press', sets: 4, reps: '10-12', rest: '90s' },
              { name: 'Stiff-Leg Deadlift', sets: 3, reps: '10', rest: '90s' },
              { name: 'Leg Extension', sets: 3, reps: '12-15', rest: '45s' },
              { name: 'Leg Curl', sets: 3, reps: '12', rest: '45s' },
              { name: 'Standing Calf Raise', sets: 5, reps: '15', rest: '45s' },
              { name: 'Crunches', sets: 3, reps: '25', rest: '30s' },
            ],
          },
          {
            day_name: 'Day 4 — Chest & Back (Volume)',
            muscle_groups: ['chest', 'back'],
            exercises: [
              { name: 'Incline Barbell Press', sets: 4, reps: '10-12', rest: '60s' },
              { name: 'Chin-Up', sets: 4, reps: '8-12', rest: '60s' },
              { name: 'Dumbbell Bench Press', sets: 3, reps: '12', rest: '60s' },
              { name: 'Barbell Row', sets: 3, reps: '10-12', rest: '60s' },
              { name: 'Pec Deck', sets: 3, reps: '15', rest: '45s' },
              { name: 'Straight Arm Pulldown', sets: 3, reps: '12-15', rest: '45s' },
            ],
          },
          {
            day_name: 'Day 5 — Shoulders & Arms (Volume)',
            muscle_groups: ['shoulders', 'arms'],
            exercises: [
              { name: 'Military Press', sets: 4, reps: '10', rest: '60s' },
              { name: 'Preacher Curl', sets: 3, reps: '12', rest: '45s' },
              { name: 'Cable Lateral Raise', sets: 4, reps: '15', rest: '45s' },
              { name: 'Overhead Tricep Extension', sets: 3, reps: '12', rest: '45s' },
              { name: 'Face Pull', sets: 3, reps: '15', rest: '45s' },
              { name: 'Concentration Curl', sets: 3, reps: '12', rest: '45s' },
              { name: 'Tricep Kickback', sets: 3, reps: '12', rest: '45s' },
            ],
          },
          {
            day_name: 'Day 6 — Legs (Volume)',
            muscle_groups: ['legs', 'core'],
            exercises: [
              { name: 'Front Squat', sets: 4, reps: '10', rest: '90s' },
              { name: 'Romanian Deadlift', sets: 4, reps: '10-12', rest: '90s' },
              { name: 'Bulgarian Split Squat', sets: 3, reps: '10 each', rest: '60s' },
              { name: 'Hack Squat', sets: 3, reps: '12', rest: '60s' },
              { name: 'Seated Calf Raise', sets: 4, reps: '20', rest: '45s' },
              { name: 'Hanging Leg Raise', sets: 3, reps: '15', rest: '30s' },
            ],
          },
        ],
        notes: 'Sunday rest. High volume program — ensure adequate nutrition and sleep.',
      },
      {
        name: '2-Day Full Body (Minimal)',
        description: 'For busy schedules — 2 efficient sessions per week covering all major muscle groups.',
        goal: 'general_fitness',
        level: 'beginner',
        days_per_week: 2,
        duration_weeks: 8,
        days: [
          {
            day_name: 'Day A — Full Body',
            muscle_groups: ['full_body'],
            exercises: [
              { name: 'Barbell Back Squat', sets: 3, reps: '8-10', rest: '120s' },
              { name: 'Barbell Bench Press', sets: 3, reps: '8-10', rest: '90s' },
              { name: 'Barbell Row', sets: 3, reps: '8-10', rest: '90s' },
              { name: 'Overhead Press', sets: 3, reps: '10', rest: '60s' },
              { name: 'Dumbbell Curl', sets: 2, reps: '12', rest: '45s' },
              { name: 'Tricep Pushdown', sets: 2, reps: '12', rest: '45s' },
              { name: 'Plank', sets: 2, reps: '30 sec', rest: '30s' },
            ],
          },
          {
            day_name: 'Day B — Full Body',
            muscle_groups: ['full_body'],
            exercises: [
              { name: 'Deadlift', sets: 3, reps: '6-8', rest: '120s' },
              { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', rest: '60s' },
              { name: 'Lat Pulldown', sets: 3, reps: '10-12', rest: '60s' },
              { name: 'Dumbbell Lateral Raise', sets: 3, reps: '15', rest: '45s' },
              { name: 'Leg Press', sets: 3, reps: '12', rest: '90s' },
              { name: 'Hammer Curl', sets: 2, reps: '12', rest: '45s' },
              { name: 'Crunches', sets: 3, reps: '20', rest: '30s' },
            ],
          },
        ],
        notes: 'Alternate Day A and Day B each week. Rest 2-3 days between sessions.',
      },
      {
        name: 'HIIT & Functional (3 Days)',
        description: 'Metabolic conditioning circuits for maximum calorie burn and functional strength.',
        goal: 'fat_loss',
        level: 'intermediate',
        days_per_week: 3,
        duration_weeks: 8,
        days: [
          {
            day_name: 'Day 1 — Kettlebell & Bodyweight',
            muscle_groups: ['full_body'],
            exercises: [
              { name: 'Kettlebell Swing', sets: 4, reps: '15', rest: '30s' },
              { name: 'Goblet Squat', sets: 4, reps: '12', rest: '30s' },
              { name: 'Push-Up', sets: 4, reps: '12-15', rest: '30s' },
              { name: 'Kettlebell Clean and Press', sets: 4, reps: '8 each', rest: '30s' },
              { name: 'Mountain Climbers', sets: 4, reps: '30', rest: '30s' },
              { name: 'Plank', sets: 3, reps: '45 sec', rest: '30s' },
            ],
          },
          {
            day_name: 'Day 2 — Dumbbell Complex',
            muscle_groups: ['full_body'],
            exercises: [
              { name: 'Dumbbell Squat to Press', sets: 4, reps: '10', rest: '30s' },
              { name: 'Dumbbell Row', sets: 4, reps: '10 each', rest: '30s' },
              { name: 'Dumbbell Romanian Deadlift', sets: 4, reps: '12', rest: '30s' },
              { name: 'Dumbbell Bench Press', sets: 4, reps: '12', rest: '30s' },
              { name: 'Burpees', sets: 4, reps: '8', rest: '30s' },
              { name: 'Russian Twist', sets: 3, reps: '20', rest: '30s' },
            ],
          },
          {
            day_name: 'Day 3 — Conditioning',
            muscle_groups: ['full_body', 'cardio'],
            exercises: [
              { name: 'Battle Rope Wave', sets: 5, reps: '30 sec', rest: '30s' },
              { name: 'Box Jump / Step-Up', sets: 5, reps: '10', rest: '30s' },
              { name: 'Sled Push', sets: 5, reps: '20m', rest: '30s' },
              { name: 'Wall Ball', sets: 5, reps: '12', rest: '30s' },
              { name: 'Jump Rope', sets: 5, reps: '60 sec', rest: '30s' },
            ],
          },
        ],
        notes: 'Perform exercises back-to-back as a circuit. Rest 90s between rounds. 4 rounds per session.',
      },
      {
        name: 'Powerbuilding (5 Days)',
        description: 'Strength + hypertrophy hybrid — heavy compounds followed by bodybuilding accessory work.',
        goal: 'strength',
        level: 'intermediate',
        days_per_week: 5,
        duration_weeks: 12,
        days: [
          {
            day_name: 'Mon — Heavy Squat + Legs',
            muscle_groups: ['legs'],
            exercises: [
              { name: 'Barbell Back Squat', sets: 5, reps: '5', rest: '180s' },
              { name: 'Leg Press', sets: 4, reps: '10-12', rest: '90s' },
              { name: 'Walking Lunges', sets: 3, reps: '12 each', rest: '60s' },
              { name: 'Leg Extension', sets: 3, reps: '12-15', rest: '45s' },
              { name: 'Leg Curl', sets: 3, reps: '12-15', rest: '45s' },
              { name: 'Calf Raise', sets: 4, reps: '15', rest: '45s' },
            ],
          },
          {
            day_name: 'Tue — Heavy Bench + Chest & Triceps',
            muscle_groups: ['chest', 'arms'],
            exercises: [
              { name: 'Barbell Bench Press', sets: 5, reps: '5', rest: '180s' },
              { name: 'Incline Dumbbell Press', sets: 4, reps: '10-12', rest: '60s' },
              { name: 'Cable Flyes', sets: 3, reps: '12-15', rest: '45s' },
              { name: 'Pec Deck', sets: 3, reps: '15', rest: '45s' },
              { name: 'Close-Grip Bench Press', sets: 3, reps: '8-10', rest: '60s' },
              { name: 'Tricep Pushdown', sets: 3, reps: '12-15', rest: '45s' },
            ],
          },
          {
            day_name: 'Wed — Heavy Deadlift + Back',
            muscle_groups: ['back'],
            exercises: [
              { name: 'Deadlift', sets: 5, reps: '5', rest: '180s' },
              { name: 'Pull-Up / Lat Pulldown', sets: 4, reps: '8-10', rest: '90s' },
              { name: 'Barbell Row', sets: 3, reps: '8-10', rest: '90s' },
              { name: 'Cable Row', sets: 3, reps: '12', rest: '60s' },
              { name: 'Straight Arm Pulldown', sets: 3, reps: '12-15', rest: '45s' },
              { name: 'Face Pull', sets: 3, reps: '15', rest: '45s' },
            ],
          },
          {
            day_name: 'Thu — Heavy OHP + Shoulders',
            muscle_groups: ['shoulders', 'arms'],
            exercises: [
              { name: 'Overhead Press', sets: 5, reps: '5', rest: '120s' },
              { name: 'Dumbbell Lateral Raise', sets: 4, reps: '12-15', rest: '45s' },
              { name: 'Reverse Pec Deck', sets: 3, reps: '15', rest: '45s' },
              { name: 'Barbell Shrugs', sets: 3, reps: '12', rest: '60s' },
              { name: 'Barbell Curl', sets: 3, reps: '10', rest: '45s' },
              { name: 'Hammer Curl', sets: 3, reps: '12', rest: '45s' },
            ],
          },
          {
            day_name: 'Fri — Volume & Weak Points',
            muscle_groups: ['full_body', 'core'],
            exercises: [
              { name: 'Front Squat', sets: 3, reps: '8-10', rest: '90s' },
              { name: 'Incline Barbell Press', sets: 3, reps: '8-10', rest: '60s' },
              { name: 'Chin-Up', sets: 3, reps: '8-12', rest: '60s' },
              { name: 'Romanian Deadlift', sets: 3, reps: '10-12', rest: '60s' },
              { name: 'Cable Crunch', sets: 3, reps: '15', rest: '30s' },
              { name: 'Plank', sets: 3, reps: '60 sec', rest: '30s' },
            ],
          },
        ],
        notes: 'Increase top sets by 2.5kg when all reps are hit. Weekends rest.',
      },
      {
        name: 'Calisthenics Focused (4 Days)',
        description: 'Bodyweight-centric training with minimal equipment — build strength through movement.',
        goal: 'general_fitness',
        level: 'intermediate',
        days_per_week: 4,
        duration_weeks: 10,
        days: [
          {
            day_name: 'Mon — Push',
            muscle_groups: ['chest', 'shoulders', 'arms'],
            exercises: [
              { name: 'Push-Up', sets: 4, reps: '15-20', rest: '60s' },
              { name: 'Diamond Push-Up', sets: 3, reps: '10-12', rest: '60s' },
              { name: 'Pike Push-Up', sets: 3, reps: '10', rest: '60s' },
              { name: 'Tricep Dip (Parallel Bars)', sets: 3, reps: '10-12', rest: '60s' },
              { name: 'Incline Push-Up (Feet Elevated)', sets: 3, reps: '12', rest: '45s' },
              { name: 'Planche Lean', sets: 3, reps: '15 sec', rest: '60s' },
            ],
          },
          {
            day_name: 'Tue — Pull',
            muscle_groups: ['back', 'arms'],
            exercises: [
              { name: 'Pull-Up', sets: 4, reps: '8-12', rest: '90s' },
              { name: 'Chin-Up', sets: 3, reps: '8-10', rest: '60s' },
              { name: 'Australian Row (Inverted Row)', sets: 3, reps: '12-15', rest: '60s' },
              { name: 'Hanging Scapular Pull', sets: 3, reps: '10', rest: '45s' },
              { name: 'Dead Hang', sets: 3, reps: '30 sec', rest: '30s' },
            ],
          },
          {
            day_name: 'Thu — Legs & Core',
            muscle_groups: ['legs', 'core'],
            exercises: [
              { name: 'Pistol Squat (Assisted)', sets: 3, reps: '6 each', rest: '60s' },
              { name: 'Bodyweight Squat', sets: 4, reps: '20', rest: '45s' },
              { name: 'Walking Lunges', sets: 3, reps: '12 each', rest: '45s' },
              { name: 'Glute Bridge', sets: 3, reps: '15', rest: '45s' },
              { name: 'L-Sit', sets: 3, reps: '10 sec', rest: '60s' },
              { name: 'Hollow Body Hold', sets: 3, reps: '20 sec', rest: '30s' },
            ],
          },
          {
            day_name: 'Fri — Skill & Conditioning',
            muscle_groups: ['full_body', 'core'],
            exercises: [
              { name: 'Muscle-Up (or Negative)', sets: 4, reps: '3-5', rest: '120s' },
              { name: 'Handstand Hold (Wall)', sets: 4, reps: '20 sec', rest: '60s' },
              { name: 'Burpees', sets: 3, reps: '10', rest: '60s' },
              { name: 'Bear Crawl', sets: 3, reps: '20m', rest: '45s' },
              { name: 'Dragon Flag (Negative)', sets: 3, reps: '5', rest: '60s' },
            ],
          },
        ],
        notes: 'Progress by adding reps, then moving to harder variations. Wed & weekends rest.',
      },
      {
        name: 'Athletic Performance (4 Days)',
        description: 'Power, agility, and conditioning for sports athletes and active individuals.',
        goal: 'endurance',
        level: 'advanced',
        days_per_week: 4,
        duration_weeks: 10,
        days: [
          {
            day_name: 'Mon — Power & Explosiveness',
            muscle_groups: ['full_body'],
            exercises: [
              { name: 'Power Clean', sets: 5, reps: '3', rest: '120s' },
              { name: 'Box Jump', sets: 4, reps: '5', rest: '60s' },
              { name: 'Barbell Back Squat', sets: 4, reps: '5', rest: '120s' },
              { name: 'Push Press (Barbell)', sets: 3, reps: '6', rest: '90s' },
              { name: 'Broad Jump', sets: 3, reps: '5', rest: '60s' },
            ],
          },
          {
            day_name: 'Tue — Upper Strength',
            muscle_groups: ['chest', 'back', 'shoulders'],
            exercises: [
              { name: 'Barbell Bench Press', sets: 4, reps: '6-8', rest: '90s' },
              { name: 'Weighted Pull-Up', sets: 4, reps: '6-8', rest: '90s' },
              { name: 'Dumbbell Shoulder Press', sets: 3, reps: '8-10', rest: '60s' },
              { name: 'Dumbbell Row', sets: 3, reps: '8-10', rest: '60s' },
              { name: 'Farmers Carry', sets: 3, reps: '40m', rest: '60s' },
            ],
          },
          {
            day_name: 'Thu — Lower Strength & Agility',
            muscle_groups: ['legs', 'core'],
            exercises: [
              { name: 'Front Squat', sets: 4, reps: '5-6', rest: '120s' },
              { name: 'Romanian Deadlift', sets: 4, reps: '8', rest: '90s' },
              { name: 'Lateral Lunges', sets: 3, reps: '10 each', rest: '60s' },
              { name: 'Sled Push', sets: 4, reps: '20m', rest: '60s' },
              { name: 'Ab Wheel Rollout', sets: 3, reps: '10', rest: '45s' },
            ],
          },
          {
            day_name: 'Fri — Conditioning',
            muscle_groups: ['full_body', 'cardio'],
            exercises: [
              { name: 'Rowing Machine (HIIT)', sets: 5, reps: '250m', rest: '60s' },
              { name: 'Kettlebell Swing', sets: 5, reps: '15', rest: '30s' },
              { name: 'Battle Rope Slam', sets: 5, reps: '20', rest: '30s' },
              { name: 'Assault Bike', sets: 5, reps: '30 sec', rest: '60s' },
              { name: 'Burpees', sets: 3, reps: '10', rest: '45s' },
            ],
          },
        ],
        notes: 'Focus on movement quality and explosiveness over weight. Wed & weekends rest.',
      },
      {
        name: 'Lean Bulk (5 Days)',
        description: 'Moderate volume with progressive overload — designed for building lean muscle mass.',
        goal: 'hypertrophy',
        level: 'intermediate',
        days_per_week: 5,
        duration_weeks: 16,
        days: [
          {
            day_name: 'Mon — Chest & Side Delts',
            muscle_groups: ['chest', 'shoulders'],
            exercises: [
              { name: 'Flat Bench Press', sets: 4, reps: '6-8', rest: '120s' },
              { name: 'Incline Dumbbell Press', sets: 4, reps: '8-10', rest: '60s' },
              { name: 'Cable Flyes (Low to High)', sets: 3, reps: '12-15', rest: '45s' },
              { name: 'Pec Deck', sets: 3, reps: '12-15', rest: '45s' },
              { name: 'Cable Lateral Raise', sets: 4, reps: '12-15', rest: '45s' },
              { name: 'Dumbbell Lateral Raise', sets: 3, reps: '15', rest: '30s' },
            ],
          },
          {
            day_name: 'Tue — Back & Rear Delts',
            muscle_groups: ['back', 'shoulders'],
            exercises: [
              { name: 'Barbell Row', sets: 4, reps: '6-8', rest: '120s' },
              { name: 'Pull-Up / Lat Pulldown', sets: 4, reps: '8-10', rest: '90s' },
              { name: 'Cable Row (Close Grip)', sets: 3, reps: '10-12', rest: '60s' },
              { name: 'Dumbbell Pullover', sets: 3, reps: '12', rest: '60s' },
              { name: 'Face Pull', sets: 4, reps: '15', rest: '45s' },
              { name: 'Reverse Pec Deck', sets: 3, reps: '15', rest: '45s' },
            ],
          },
          {
            day_name: 'Wed — Legs',
            muscle_groups: ['legs', 'core'],
            exercises: [
              { name: 'Barbell Back Squat', sets: 4, reps: '6-8', rest: '120s' },
              { name: 'Romanian Deadlift', sets: 4, reps: '8-10', rest: '90s' },
              { name: 'Leg Press', sets: 3, reps: '10-12', rest: '90s' },
              { name: 'Leg Extension', sets: 3, reps: '12-15', rest: '45s' },
              { name: 'Leg Curl', sets: 3, reps: '12', rest: '45s' },
              { name: 'Standing Calf Raise', sets: 4, reps: '12-15', rest: '45s' },
              { name: 'Plank', sets: 3, reps: '45 sec', rest: '30s' },
            ],
          },
          {
            day_name: 'Thu — Shoulders & Arms',
            muscle_groups: ['shoulders', 'arms'],
            exercises: [
              { name: 'Overhead Press', sets: 4, reps: '6-8', rest: '90s' },
              { name: 'Dumbbell Lateral Raise', sets: 4, reps: '12-15', rest: '45s' },
              { name: 'Barbell Curl', sets: 3, reps: '10', rest: '60s' },
              { name: 'Close-Grip Bench Press', sets: 3, reps: '8-10', rest: '60s' },
              { name: 'Incline Curl', sets: 3, reps: '12', rest: '45s' },
              { name: 'Overhead Tricep Extension', sets: 3, reps: '12', rest: '45s' },
              { name: 'Hammer Curl', sets: 2, reps: '12', rest: '45s' },
            ],
          },
          {
            day_name: 'Fri — Legs (Posterior) & Core',
            muscle_groups: ['legs', 'core'],
            exercises: [
              { name: 'Conventional Deadlift', sets: 4, reps: '5-6', rest: '180s' },
              { name: 'Bulgarian Split Squat', sets: 3, reps: '10 each', rest: '60s' },
              { name: 'Hip Thrust', sets: 4, reps: '10-12', rest: '60s' },
              { name: 'Seated Leg Curl', sets: 3, reps: '12', rest: '45s' },
              { name: 'Seated Calf Raise', sets: 4, reps: '15-20', rest: '45s' },
              { name: 'Cable Crunch', sets: 3, reps: '15', rest: '30s' },
              { name: 'Hanging Leg Raise', sets: 3, reps: '12', rest: '30s' },
            ],
          },
        ],
        notes: 'Eat in a slight surplus (200-300 calories above maintenance). Weekends rest. Track all lifts.',
      },
      {
        name: 'Senior Fitness (3 Days)',
        description: 'Joint-friendly, low-impact program with machines and bodyweight for older adults.',
        goal: 'general_fitness',
        level: 'beginner',
        days_per_week: 3,
        duration_weeks: 8,
        days: [
          {
            day_name: 'Mon — Upper Body',
            muscle_groups: ['chest', 'back', 'shoulders'],
            exercises: [
              { name: 'Machine Chest Press', sets: 2, reps: '12-15', rest: '60s' },
              { name: 'Lat Pulldown (Light)', sets: 2, reps: '12-15', rest: '60s' },
              { name: 'Machine Shoulder Press', sets: 2, reps: '12', rest: '60s' },
              { name: 'Seated Cable Row', sets: 2, reps: '12-15', rest: '60s' },
              { name: 'Dumbbell Lateral Raise', sets: 2, reps: '12', rest: '45s', notes: 'Light weight' },
              { name: 'Treadmill Walk', sets: 1, reps: '10 min', rest: '0s', notes: 'Cool-down' },
            ],
          },
          {
            day_name: 'Wed — Lower Body',
            muscle_groups: ['legs', 'core'],
            exercises: [
              { name: 'Leg Press (Light)', sets: 2, reps: '12-15', rest: '60s' },
              { name: 'Leg Extension', sets: 2, reps: '15', rest: '45s' },
              { name: 'Seated Leg Curl', sets: 2, reps: '15', rest: '45s' },
              { name: 'Seated Calf Raise', sets: 2, reps: '15', rest: '45s' },
              { name: 'Glute Bridge', sets: 2, reps: '12', rest: '45s' },
              { name: 'Dead Bug', sets: 2, reps: '8 each', rest: '30s' },
            ],
          },
          {
            day_name: 'Fri — Full Body & Balance',
            muscle_groups: ['full_body'],
            exercises: [
              { name: 'Machine Chest Press', sets: 2, reps: '12', rest: '45s' },
              { name: 'Lat Pulldown', sets: 2, reps: '12', rest: '45s' },
              { name: 'Leg Press', sets: 2, reps: '12', rest: '60s' },
              { name: 'Bird Dog', sets: 2, reps: '8 each', rest: '30s' },
              { name: 'Wall Sit', sets: 2, reps: '20 sec', rest: '30s' },
              { name: 'Recumbent Bike', sets: 1, reps: '10 min', rest: '0s', notes: 'Cool-down' },
            ],
          },
        ],
        notes: 'Low weight, controlled movements. Focus on balance and joint health. Always warm up 5 min on treadmill.',
      },
    ];

    const newTemplates = templates.filter(t => !existingNames.has(t.name));
    if (newTemplates.length === 0) return;

    const inserts = newTemplates.map((t) => ({
      gym_id: gymId,
      ...t,
      is_template: true,
      is_active: true,
    }));

    await supabase.from('gym_workout_plans').insert(inserts);
  }
}

export const workoutPlanService = WorkoutPlanService.getInstance();
