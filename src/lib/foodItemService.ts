import { supabase } from './supabase';
import type { FoodItem } from '@/types/dietPlan';

export interface DbFoodItem {
  id: string;
  name: string;
  category: string;
  serving: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  is_veg: boolean;
  is_egg: boolean;
}

function toFoodItem(row: DbFoodItem): FoodItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category as FoodItem['category'],
    serving: row.serving,
    calories: Number(row.calories),
    protein_g: Number(row.protein_g),
    carbs_g: Number(row.carbs_g),
    fat_g: Number(row.fat_g),
    isVeg: row.is_veg,
    isEgg: row.is_egg,
  };
}

class FoodItemService {
  private static instance: FoodItemService;

  static getInstance(): FoodItemService {
    if (!FoodItemService.instance) {
      FoodItemService.instance = new FoodItemService();
    }
    return FoodItemService.instance;
  }

  async getFoodItems(): Promise<FoodItem[]> {
    const { data, error } = await supabase
      .from('gym_food_items')
      .select('id, name, category, serving, calories, protein_g, carbs_g, fat_g, is_veg, is_egg')
      .eq('is_active', true)
      .order('category')
      .order('name');

    if (error) throw error;
    return (data || []).map(toFoodItem);
  }

  async addFoodItem(item: Omit<FoodItem, 'id'>): Promise<FoodItem> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('gym_food_items')
      .insert({
        name: item.name,
        category: item.category,
        serving: item.serving,
        calories: item.calories,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
        is_veg: item.isVeg,
        is_egg: item.isEgg,
        created_by: user?.id ?? null,
      })
      .select('id, name, category, serving, calories, protein_g, carbs_g, fat_g, is_veg, is_egg')
      .single();

    if (error) throw error;
    return toFoodItem(data);
  }
}

export const foodItemService = FoodItemService.getInstance();
