export type DietGoal = 'weight_loss' | 'muscle_gain' | 'maintenance' | 'general_fitness' | 'toning';
export type DietType = 'vegetarian' | 'non_vegetarian' | 'eggetarian';

export type FoodCategory =
  | 'grains' | 'rice' | 'dal' | 'vegetables' | 'paneer_dairy'
  | 'chicken' | 'egg' | 'fish_seafood' | 'snacks' | 'fruits'
  | 'beverages' | 'sweets' | 'salads' | 'supplements';

export interface FoodItem {
  id?: string;
  name: string;
  category: FoodCategory;
  serving: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  isVeg: boolean;
  isEgg: boolean;
}

export interface MealFoodEntry {
  food: FoodItem;
  qty: number;
}

export interface DietMeal {
  meal_name: string;
  time: string;
  items: string[];
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
}

export interface DietPlan {
  id: string;
  gym_id: string;
  name: string;
  description?: string | null;
  goal: DietGoal;
  diet_type: DietType;
  target_calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  meals: DietMeal[];
  notes?: string | null;
  is_template: boolean;
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDietPlanInput {
  name: string;
  description?: string | null;
  goal: DietGoal;
  diet_type: DietType;
  target_calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  meals: DietMeal[];
  notes?: string | null;
  is_template?: boolean;
}

export interface DietAssignment {
  id: string;
  gym_id: string;
  member_id: string;
  diet_plan_id: string;
  assigned_date: string;
  start_date?: string | null;
  end_date?: string | null;
  notes?: string | null;
  assigned_by?: string | null;
  is_active: boolean;
  created_at: string;
  diet_plan?: DietPlan;
}

export const DIET_GOALS: Record<DietGoal, { label: string; color: string }> = {
  weight_loss: { label: 'Weight Loss', color: 'from-red-400 to-orange-400' },
  muscle_gain: { label: 'Muscle Gain', color: 'from-blue-500 to-indigo-500' },
  maintenance: { label: 'Maintenance', color: 'from-emerald-400 to-teal-400' },
  general_fitness: { label: 'General Fitness', color: 'from-purple-400 to-fuchsia-400' },
  toning: { label: 'Toning', color: 'from-pink-400 to-rose-400' },
};

export const DIET_TYPES: Record<DietType, { label: string; emoji: string }> = {
  vegetarian: { label: 'Veg', emoji: '🥬' },
  non_vegetarian: { label: 'Non-Veg', emoji: '🍗' },
  eggetarian: { label: 'Egg', emoji: '🥚' },
};
