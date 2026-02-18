import { supabase, getCurrentGymId } from './supabase';
import type { DietPlan, CreateDietPlanInput, DietAssignment, DietMeal } from '@/types/dietPlan';
import { gymService } from './gymService';
import { auditLogger } from './auditLogger';

class DietPlanService {
  private static instance: DietPlanService;

  static getInstance(): DietPlanService {
    if (!DietPlanService.instance) {
      DietPlanService.instance = new DietPlanService();
    }
    return DietPlanService.instance;
  }

  async getDietPlans(): Promise<DietPlan[]> {
    const gymId = await getCurrentGymId();
    if (!gymId) return [];

    const { data, error } = await supabase
      .from('gym_diet_plans')
      .select('*')
      .eq('gym_id', gymId)
      .eq('is_active', true)
      .order('is_template', { ascending: false })
      .order('name');

    if (error) throw error;

    // Seed default templates if none exist, or re-seed if templates are outdated
    const templateCount = (data || []).filter(p => p.is_template).length;
    if (!data || data.length === 0 || templateCount < 20) {
      await this.seedDefaultTemplates(gymId);
      const { data: seeded } = await supabase
        .from('gym_diet_plans')
        .select('*')
        .eq('gym_id', gymId)
        .eq('is_active', true)
        .order('is_template', { ascending: false })
        .order('name');
      return (seeded || []) as DietPlan[];
    }

    return data as DietPlan[];
  }

  async getDietPlanById(id: string): Promise<DietPlan | null> {
    const gymId = await getCurrentGymId();
    if (!gymId) return null;

    const { data, error } = await supabase
      .from('gym_diet_plans')
      .select('*')
      .eq('id', id)
      .eq('gym_id', gymId)
      .single();

    if (error) return null;
    return data as DietPlan;
  }

  async createDietPlan(input: CreateDietPlanInput): Promise<DietPlan> {
    const gymId = await getCurrentGymId();
    if (!gymId) throw new Error('No gym ID found');

    const { data, error } = await supabase
      .from('gym_diet_plans')
      .insert({ gym_id: gymId, ...input, is_active: true, is_template: input.is_template ?? false })
      .select()
      .single();

    if (error) throw error;
    auditLogger.logDietPlanCreated(data.id, input.name, input.goal);
    return data as DietPlan;
  }

  async updateDietPlan(id: string, input: Partial<CreateDietPlanInput>): Promise<DietPlan> {
    const gymId = await getCurrentGymId();
    if (!gymId) throw new Error('No gym ID found');

    const { data, error } = await supabase
      .from('gym_diet_plans')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('gym_id', gymId)
      .select()
      .single();

    if (error) throw error;
    return data as DietPlan;
  }

  async deleteDietPlan(id: string): Promise<void> {
    const gymId = await getCurrentGymId();
    if (!gymId) throw new Error('No gym ID found');

    const { error } = await supabase
      .from('gym_diet_plans')
      .update({ is_active: false })
      .eq('id', id)
      .eq('gym_id', gymId);

    if (error) throw error;
    auditLogger.logDietPlanDeleted(id, '');
  }

  async assignDietPlan(memberId: string, planId: string, notes?: string): Promise<DietAssignment> {
    const gymId = await getCurrentGymId();
    if (!gymId) throw new Error('No gym ID found');

    // Deactivate existing assignments
    await supabase
      .from('gym_member_diet_assignments')
      .update({ is_active: false })
      .eq('gym_id', gymId)
      .eq('member_id', memberId);

    const { data, error } = await supabase
      .from('gym_member_diet_assignments')
      .insert({
        gym_id: gymId,
        member_id: memberId,
        diet_plan_id: planId,
        assigned_date: new Date().toISOString().split('T')[0],
        start_date: new Date().toISOString().split('T')[0],
        notes: notes || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    auditLogger.logDietPlanAssigned(planId, '', memberId, '');
    return data as DietAssignment;
  }

  async getMemberDietAssignment(memberId: string): Promise<(DietAssignment & { diet_plan: DietPlan }) | null> {
    const gymId = await getCurrentGymId();
    if (!gymId) return null;

    const { data, error } = await supabase
      .from('gym_member_diet_assignments')
      .select('*, diet_plan:gym_diet_plans(*)')
      .eq('gym_id', gymId)
      .eq('member_id', memberId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return null;
    return data as (DietAssignment & { diet_plan: DietPlan }) | null;
  }

  shareDietPlanViaWhatsApp(plan: DietPlan, memberPhone: string) {
    let text = `🥗 *${plan.name}*\n`;
    text += `Goal: ${plan.goal.replace('_', ' ')} | Type: ${plan.diet_type.replace('_', ' ')}\n`;
    if (plan.target_calories) text += `Calories: ~${plan.target_calories} kcal\n`;
    if (plan.protein_g || plan.carbs_g || plan.fat_g) {
      text += `Macros: P${plan.protein_g || 0}g | C${plan.carbs_g || 0}g | F${plan.fat_g || 0}g\n`;
    }
    text += `\n`;

    for (const meal of plan.meals) {
      text += `🕐 *${meal.meal_name}* (${meal.time})\n`;
      for (const item of meal.items) {
        text += `  • ${item}\n`;
      }
      text += `\n`;
    }

    if (plan.notes) text += `📝 ${plan.notes}\n`;

    const link = gymService.generateWhatsAppLink(memberPhone, text);
    window.open(link, '_blank', 'noopener,noreferrer');
  }

  async seedDefaultTemplates(gymId: string): Promise<void> {

    const templates: Omit<CreateDietPlanInput, 'is_template'>[] = [
      // 1
      {
        name: '1500 kcal • Weight Loss • Veg',
        description: 'Low-calorie Indian vegetarian diet for sustainable weight loss',
        goal: 'weight_loss',
        diet_type: 'vegetarian',
        target_calories: 1500,
        protein_g: 65,
        carbs_g: 180,
        fat_g: 50,
        meals: [
          { meal_name: 'Early Morning', time: '6:30 AM', items: ['Warm lemon water', 'Soaked almonds (5-6)', 'Soaked methi seeds (1 tsp)'], calories: 80, protein_g: 3, carbs_g: 6, fat_g: 5 },
          { meal_name: 'Breakfast', time: '8:00 AM', items: ['Moong dal chilla (2) with mint chutney', 'Curd (1 small bowl)', 'Green tea'], calories: 280, protein_g: 16, carbs_g: 34, fat_g: 8 },
          { meal_name: 'Mid-Morning', time: '10:30 AM', items: ['Buttermilk (1 glass)', 'Apple or guava (1)'], calories: 100, protein_g: 3, carbs_g: 20, fat_g: 1 },
          { meal_name: 'Lunch', time: '1:00 PM', items: ['Brown rice / 2 roti', 'Dal (1 bowl)', 'Sabzi (lauki/tinda/bhindi)', 'Salad (cucumber, tomato, onion)', 'Curd (small bowl)'], calories: 420, protein_g: 18, carbs_g: 60, fat_g: 12 },
          { meal_name: 'Evening Snack', time: '4:30 PM', items: ['Roasted chana (1 handful)', 'Green tea', 'Sprouts salad (small bowl)'], calories: 120, protein_g: 8, carbs_g: 16, fat_g: 3 },
          { meal_name: 'Dinner', time: '7:30 PM', items: ['2 roti / 1 bajra roti', 'Palak paneer (light oil)', 'Mixed veg soup', 'Salad'], calories: 380, protein_g: 15, carbs_g: 38, fat_g: 18 },
          { meal_name: 'Before Bed', time: '9:30 PM', items: ['Warm haldi doodh (low-fat milk, 1 cup)'], calories: 100, protein_g: 4, carbs_g: 8, fat_g: 4 },
        ],
        notes: 'Avoid sugar, maida, fried food. Use minimal oil (2-3 tsp/day). Drink 3-4L water daily.',
      },
      // 2
      {
        name: '2600 kcal • Muscle Gain • Non-Veg',
        description: 'High protein non-veg diet for muscle building with chicken & fish',
        goal: 'muscle_gain',
        diet_type: 'non_vegetarian',
        target_calories: 2600,
        protein_g: 160,
        carbs_g: 300,
        fat_g: 70,
        meals: [
          { meal_name: 'Early Morning', time: '6:00 AM', items: ['Banana (2)', 'Soaked almonds & walnuts (8-10)', 'Warm water'], calories: 200, protein_g: 5, carbs_g: 30, fat_g: 10 },
          { meal_name: 'Breakfast', time: '8:00 AM', items: ['Egg whites (6) + whole egg (2) omelette', '4 brown bread slices', 'Peanut butter (1 tbsp)', 'Glass of milk'], calories: 520, protein_g: 38, carbs_g: 50, fat_g: 18 },
          { meal_name: 'Mid-Morning', time: '11:00 AM', items: ['Whey protein shake (1 scoop) with banana', 'Handful of dry fruits'], calories: 280, protein_g: 28, carbs_g: 32, fat_g: 6 },
          { meal_name: 'Lunch', time: '1:30 PM', items: ['Rice (1.5 cups) / 4 roti', 'Chicken breast curry (200g)', 'Dal (1 bowl)', 'Salad + curd'], calories: 650, protein_g: 48, carbs_g: 72, fat_g: 14 },
          { meal_name: 'Pre-Workout', time: '4:30 PM', items: ['Banana (1)', 'Peanut butter sandwich', 'Black coffee'], calories: 200, protein_g: 7, carbs_g: 28, fat_g: 8 },
          { meal_name: 'Post-Workout', time: '7:00 PM', items: ['Whey protein (1 scoop)', 'Sweet potato (1 medium)'], calories: 250, protein_g: 26, carbs_g: 34, fat_g: 2 },
          { meal_name: 'Dinner', time: '8:30 PM', items: ['3 roti', 'Grilled fish / chicken (150g)', 'Mixed veg', 'Salad'], calories: 500, protein_g: 40, carbs_g: 48, fat_g: 12 },
        ],
        notes: 'Eat every 2-3 hours. Protein in every meal. Sleep 7-8 hours. Hydrate well.',
      },
      // 3
      {
        name: '2100 kcal • Muscle Gain • Egg',
        description: 'Affordable high-protein diet using eggs and dairy',
        goal: 'muscle_gain',
        diet_type: 'eggetarian',
        target_calories: 2100,
        protein_g: 120,
        carbs_g: 250,
        fat_g: 60,
        meals: [
          { meal_name: 'Early Morning', time: '6:30 AM', items: ['Soaked chana (1 cup boiled)', 'Warm water with honey'], calories: 150, protein_g: 9, carbs_g: 22, fat_g: 3 },
          { meal_name: 'Breakfast', time: '8:00 AM', items: ['Boiled eggs (4-5) + 1 whole egg bhurji', 'Paratha (2) with curd', 'Glass of milk'], calories: 450, protein_g: 32, carbs_g: 40, fat_g: 18 },
          { meal_name: 'Mid-Morning', time: '11:00 AM', items: ['Paneer bhurji (100g)', 'Roti (1)'], calories: 250, protein_g: 18, carbs_g: 20, fat_g: 12 },
          { meal_name: 'Lunch', time: '1:30 PM', items: ['Rice (1.5 cups)', 'Rajma/chole (1.5 bowls)', 'Egg curry (2 eggs)', 'Salad + onion'], calories: 550, protein_g: 28, carbs_g: 72, fat_g: 14 },
          { meal_name: 'Evening Snack', time: '5:00 PM', items: ['Sattu drink (2 tbsp)', 'Roasted peanuts (handful)', 'Banana (1)'], calories: 200, protein_g: 10, carbs_g: 26, fat_g: 7 },
          { meal_name: 'Dinner', time: '8:00 PM', items: ['3 roti', 'Soya chunk curry (1 bowl)', 'Mixed dal', 'Curd (1 bowl)'], calories: 450, protein_g: 24, carbs_g: 56, fat_g: 10 },
          { meal_name: 'Before Bed', time: '10:00 PM', items: ['Warm milk with turmeric'], calories: 80, protein_g: 4, carbs_g: 8, fat_g: 3 },
        ],
        notes: 'Budget-friendly: eggs ₹7, soya ₹80/kg, rajma ₹120/kg, sattu ₹40/kg, peanuts ₹80/kg.',
      },
      // 4
      {
        name: '1900 kcal • Maintenance • Veg',
        description: 'Balanced diet to maintain lean physique',
        goal: 'maintenance',
        diet_type: 'vegetarian',
        target_calories: 1900,
        protein_g: 80,
        carbs_g: 230,
        fat_g: 55,
        meals: [
          { meal_name: 'Early Morning', time: '7:00 AM', items: ['Warm water + lemon', 'Soaked almonds (6)'], calories: 60, protein_g: 2, carbs_g: 3, fat_g: 5 },
          { meal_name: 'Breakfast', time: '8:30 AM', items: ['Poha / Upma with peanuts & veggies', 'Curd (1 bowl)', 'Green tea'], calories: 320, protein_g: 10, carbs_g: 48, fat_g: 10 },
          { meal_name: 'Mid-Morning', time: '11:00 AM', items: ['Seasonal fruit (papaya/apple/guava)', 'Buttermilk'], calories: 120, protein_g: 3, carbs_g: 24, fat_g: 1 },
          { meal_name: 'Lunch', time: '1:00 PM', items: ['2 roti / rice (1 cup)', 'Dal (1 bowl)', 'Seasonal sabzi', 'Raita', 'Salad'], calories: 450, protein_g: 18, carbs_g: 60, fat_g: 14 },
          { meal_name: 'Evening Snack', time: '4:30 PM', items: ['Sprouts chaat (1 bowl)', 'Green tea / coconut water'], calories: 130, protein_g: 8, carbs_g: 18, fat_g: 2 },
          { meal_name: 'Dinner', time: '7:30 PM', items: ['2 roti / jowar roti', 'Paneer / tofu sabzi (low oil)', 'Soup (tomato/veg)', 'Salad'], calories: 400, protein_g: 18, carbs_g: 42, fat_g: 16 },
          { meal_name: 'Before Bed', time: '9:30 PM', items: ['Warm milk (1 cup)'], calories: 100, protein_g: 4, carbs_g: 8, fat_g: 4 },
        ],
        notes: 'Focus on portion control. Include variety. Minimal processed food.',
      },
      // 5
      {
        name: '1900 kcal • General Fitness • Egg',
        description: 'Simple balanced diet for gym beginners',
        goal: 'general_fitness',
        diet_type: 'eggetarian',
        target_calories: 1900,
        protein_g: 90,
        carbs_g: 240,
        fat_g: 55,
        meals: [
          { meal_name: 'Early Morning', time: '7:00 AM', items: ['Warm water', 'Banana (1)'], calories: 100, protein_g: 1, carbs_g: 24, fat_g: 0 },
          { meal_name: 'Breakfast', time: '8:30 AM', items: ['Egg bhurji (3 eggs) / Besan chilla (2)', '2 bread slices / 1 paratha', 'Glass of milk'], calories: 380, protein_g: 22, carbs_g: 36, fat_g: 16 },
          { meal_name: 'Mid-Morning', time: '11:00 AM', items: ['Any seasonal fruit', 'Handful of peanuts/makhana'], calories: 130, protein_g: 5, carbs_g: 16, fat_g: 5 },
          { meal_name: 'Lunch', time: '1:00 PM', items: ['Rice (1 cup) + 1 roti', 'Dal / sambar (1 bowl)', 'Sabzi with paneer / egg curry', 'Curd + salad'], calories: 500, protein_g: 24, carbs_g: 62, fat_g: 14 },
          { meal_name: 'Post-Workout', time: '5:30 PM', items: ['Banana (1)', 'Sattu / protein shake', 'Dry fruits (handful)'], calories: 210, protein_g: 14, carbs_g: 30, fat_g: 5 },
          { meal_name: 'Dinner', time: '8:00 PM', items: ['2 roti', 'Mixed dal', 'Veg soup', 'Salad'], calories: 430, protein_g: 18, carbs_g: 56, fat_g: 12 },
          { meal_name: 'Before Bed', time: '10:00 PM', items: ['Warm milk with turmeric'], calories: 80, protein_g: 4, carbs_g: 8, fat_g: 3 },
        ],
        notes: 'Start simple. Track eating habits. Gradually reduce junk food. Stay consistent.',
      },
      // 6
      {
        name: '1300 kcal • Toning • Veg',
        description: 'Calorie-controlled diet for women focused on toning',
        goal: 'toning',
        diet_type: 'vegetarian',
        target_calories: 1300,
        protein_g: 60,
        carbs_g: 150,
        fat_g: 40,
        meals: [
          { meal_name: 'Early Morning', time: '6:30 AM', items: ['Warm water + lemon + chia seeds (1 tsp)', 'Soaked almonds (4)'], calories: 60, protein_g: 2, carbs_g: 4, fat_g: 4 },
          { meal_name: 'Breakfast', time: '8:00 AM', items: ['Oats porridge with milk + berries', 'or Ragi dosa (2) with chutney', 'Green tea'], calories: 250, protein_g: 10, carbs_g: 38, fat_g: 6 },
          { meal_name: 'Mid-Morning', time: '10:30 AM', items: ['Papaya / watermelon (1 bowl)', 'Buttermilk'], calories: 80, protein_g: 2, carbs_g: 16, fat_g: 1 },
          { meal_name: 'Lunch', time: '1:00 PM', items: ['1 roti / small rice', 'Dal (1 bowl)', 'Baingan / bhindi sabzi (low oil)', 'Salad (generous)', 'Raita (small)'], calories: 350, protein_g: 16, carbs_g: 44, fat_g: 12 },
          { meal_name: 'Evening Snack', time: '4:30 PM', items: ['Roasted makhana (1 cup)', 'Green tea / herbal tea'], calories: 70, protein_g: 3, carbs_g: 10, fat_g: 2 },
          { meal_name: 'Dinner', time: '7:00 PM', items: ['Veg soup (1 big bowl)', 'Grilled paneer (80g) with veggies', 'or Moong dal khichdi (small bowl)'], calories: 300, protein_g: 16, carbs_g: 28, fat_g: 12 },
          { meal_name: 'Before Bed', time: '9:00 PM', items: ['Chamomile tea / warm milk (half cup)'], calories: 40, protein_g: 2, carbs_g: 4, fat_g: 2 },
        ],
        notes: 'Focus on fiber-rich foods. Include iron-rich foods (spinach, dates). Avoid heavy dinner. Walk after meals.',
      },
      // 7
      {
        name: '2300 kcal • Muscle Gain • Veg',
        description: 'Maximizing protein on a pure vegetarian diet',
        goal: 'muscle_gain',
        diet_type: 'vegetarian',
        target_calories: 2300,
        protein_g: 110,
        carbs_g: 280,
        fat_g: 60,
        meals: [
          { meal_name: 'Early Morning', time: '6:30 AM', items: ['Soaked chana + moong (1 cup)', 'Banana (1)', 'Warm water'], calories: 200, protein_g: 12, carbs_g: 32, fat_g: 3 },
          { meal_name: 'Breakfast', time: '8:00 AM', items: ['Paneer paratha (2) or Besan chilla (3)', 'Curd (1 bowl)', 'Glass of soy milk / milk'], calories: 450, protein_g: 22, carbs_g: 44, fat_g: 20 },
          { meal_name: 'Mid-Morning', time: '11:00 AM', items: ['Soy milk smoothie with banana', 'Mixed nuts (handful)'], calories: 220, protein_g: 12, carbs_g: 26, fat_g: 9 },
          { meal_name: 'Lunch', time: '1:30 PM', items: ['Rice (1.5 cups) / 3 roti', 'Rajma / chole / lobia (1.5 bowls)', 'Paneer sabzi (100g)', 'Salad + curd'], calories: 600, protein_g: 28, carbs_g: 72, fat_g: 16 },
          { meal_name: 'Evening Snack', time: '4:30 PM', items: ['Soya chunks dry roasted (1 cup)', 'Peanut butter on roti (1)', 'Sattu drink'], calories: 280, protein_g: 20, carbs_g: 28, fat_g: 10 },
          { meal_name: 'Dinner', time: '8:00 PM', items: ['3 roti', 'Tofu/paneer bhurji', 'Mixed dal (1 bowl)', 'Salad'], calories: 480, protein_g: 22, carbs_g: 56, fat_g: 14 },
          { meal_name: 'Before Bed', time: '10:00 PM', items: ['Warm milk with protein powder / badam powder'], calories: 120, protein_g: 10, carbs_g: 10, fat_g: 4 },
        ],
        notes: 'Veg protein: paneer, soya, rajma, chana, dal, peanuts, tofu. Combine legumes + grains for complete protein.',
      },
      // 8
      {
        name: '2200 kcal • General Fitness • Non-Veg',
        description: 'Nutrition plan focused on workout recovery and muscle repair',
        goal: 'general_fitness',
        diet_type: 'non_vegetarian',
        target_calories: 2200,
        protein_g: 130,
        carbs_g: 260,
        fat_g: 60,
        meals: [
          { meal_name: 'Pre-Workout (1hr before)', time: '5:30 AM', items: ['Banana (1-2)', 'Coffee / green tea', 'Handful of dry fruits'], calories: 200, protein_g: 4, carbs_g: 36, fat_g: 6 },
          { meal_name: 'Post-Workout', time: '7:30 AM', items: ['Whey protein shake with banana & milk', 'Dates (2-3)'], calories: 300, protein_g: 28, carbs_g: 40, fat_g: 4 },
          { meal_name: 'Breakfast', time: '8:30 AM', items: ['Omelette (4 whites + 1 whole)', '3 bread/roti', 'Glass of juice'], calories: 400, protein_g: 24, carbs_g: 48, fat_g: 10 },
          { meal_name: 'Mid-Morning', time: '11:00 AM', items: ['Greek yogurt / curd (1 bowl)', 'Mixed fruits'], calories: 150, protein_g: 8, carbs_g: 20, fat_g: 4 },
          { meal_name: 'Lunch', time: '1:30 PM', items: ['Rice (1.5 cups)', 'Chicken / fish (200g)', 'Dal (1 bowl)', 'Vegetables + salad'], calories: 550, protein_g: 42, carbs_g: 58, fat_g: 12 },
          { meal_name: 'Evening Snack', time: '5:00 PM', items: ['Boiled eggs (2-3)', 'Sweet potato (1)', 'Black coffee'], calories: 250, protein_g: 16, carbs_g: 28, fat_g: 8 },
          { meal_name: 'Dinner', time: '8:00 PM', items: ['2-3 roti', 'Grilled chicken / paneer', 'Veg soup', 'Salad'], calories: 400, protein_g: 32, carbs_g: 38, fat_g: 10 },
        ],
        notes: 'Recovery window: consume protein within 30 mins post-workout. Stay hydrated. Sleep 7-8 hours.',
      },
      // 9
      {
        name: '1700 kcal • Maintenance • Veg (Diabetic)',
        description: 'Low GI diet for gym-goers with diabetes',
        goal: 'maintenance',
        diet_type: 'vegetarian',
        target_calories: 1700,
        protein_g: 70,
        carbs_g: 190,
        fat_g: 50,
        meals: [
          { meal_name: 'Early Morning', time: '6:30 AM', items: ['Methi seeds soaked water', 'Almonds (5) + walnuts (2)'], calories: 80, protein_g: 3, carbs_g: 4, fat_g: 6 },
          { meal_name: 'Breakfast', time: '8:00 AM', items: ['Multigrain / ragi roti (2)', 'Vegetable stuffing', 'Curd (1 bowl)', 'No-sugar green tea'], calories: 300, protein_g: 12, carbs_g: 42, fat_g: 8 },
          { meal_name: 'Mid-Morning', time: '10:30 AM', items: ['Guava / apple / pear (1)', 'Roasted chana (small handful)'], calories: 100, protein_g: 4, carbs_g: 16, fat_g: 2 },
          { meal_name: 'Lunch', time: '12:30 PM', items: ['Brown rice (small) / 2 roti', 'Dal (1 bowl)', 'Karela / methi sabzi', 'Salad with lemon', 'Curd (small)'], calories: 400, protein_g: 18, carbs_g: 52, fat_g: 12 },
          { meal_name: 'Evening Snack', time: '4:00 PM', items: ['Vegetable soup (no cream)', 'Roasted makhana (1 cup)', 'Sugar-free tea'], calories: 100, protein_g: 4, carbs_g: 14, fat_g: 3 },
          { meal_name: 'Dinner', time: '7:00 PM', items: ['Jowar / bajra roti (2)', 'Mixed veg (low oil)', 'Palak paneer (small)', 'Salad'], calories: 350, protein_g: 14, carbs_g: 38, fat_g: 14 },
          { meal_name: 'Before Bed', time: '9:00 PM', items: ['Warm milk (unsweetened, 1 cup)'], calories: 80, protein_g: 4, carbs_g: 8, fat_g: 3 },
        ],
        notes: 'Avoid: sugar, white rice, maida, potatoes, mango, banana, grapes. Use low GI foods. Small frequent meals.',
      },
      // 10
      {
        name: '3000 kcal • Muscle Gain • Egg (Budget)',
        description: 'Affordable high-calorie Indian diet for mass gain',
        goal: 'muscle_gain',
        diet_type: 'eggetarian',
        target_calories: 3000,
        protein_g: 140,
        carbs_g: 400,
        fat_g: 80,
        meals: [
          { meal_name: 'Early Morning', time: '6:00 AM', items: ['Banana shake (2 bananas + milk + oats)', 'Soaked peanuts (handful)', 'Boiled eggs (2)'], calories: 400, protein_g: 18, carbs_g: 52, fat_g: 14 },
          { meal_name: 'Breakfast', time: '8:30 AM', items: ['Aloo paratha (3) with butter & curd', 'Egg bhurji (4 eggs)', 'Lassi (1 glass)'], calories: 700, protein_g: 30, carbs_g: 76, fat_g: 28 },
          { meal_name: 'Mid-Morning', time: '11:00 AM', items: ['Sattu shake (3 tbsp + banana)', 'Peanut butter roti (1)', 'Chana (boiled, 1 cup)'], calories: 350, protein_g: 16, carbs_g: 46, fat_g: 10 },
          { meal_name: 'Lunch', time: '1:30 PM', items: ['Rice (2 cups) + 2 roti', 'Rajma / chole (2 bowls)', 'Egg curry (3 eggs)', 'Curd + salad + onion'], calories: 800, protein_g: 36, carbs_g: 104, fat_g: 18 },
          { meal_name: 'Evening Snack', time: '5:00 PM', items: ['Boiled eggs (3)', 'Sweet potato (2 medium)', 'Peanuts (roasted, handful)', 'Banana (1)'], calories: 400, protein_g: 20, carbs_g: 50, fat_g: 12 },
          { meal_name: 'Dinner', time: '8:30 PM', items: ['4 roti with ghee', 'Soya chunk curry (1.5 bowls)', 'Mixed dal (1 bowl)', 'Salad'], calories: 600, protein_g: 26, carbs_g: 68, fat_g: 16 },
          { meal_name: 'Before Bed', time: '10:30 PM', items: ['Milk (2 cups) with badam powder', 'Dates (3-4)'], calories: 250, protein_g: 10, carbs_g: 30, fat_g: 8 },
        ],
        notes: 'Budget-friendly: eggs ₹7/each, sattu ₹40/kg, peanuts ₹80/kg, bananas ₹40/dozen.',
      },
      // 11
      {
        name: '2000 kcal • General Fitness • Non-Veg (South Indian)',
        description: 'Traditional South Indian meals optimized for fitness',
        goal: 'general_fitness',
        diet_type: 'non_vegetarian',
        target_calories: 2000,
        protein_g: 95,
        carbs_g: 260,
        fat_g: 55,
        meals: [
          { meal_name: 'Early Morning', time: '6:30 AM', items: ['Warm water + lemon', 'Soaked almonds (5)', 'Black coffee'], calories: 70, protein_g: 2, carbs_g: 4, fat_g: 5 },
          { meal_name: 'Breakfast', time: '8:00 AM', items: ['Idli (4) with sambar & coconut chutney', 'Boiled egg (2)', 'Filter coffee'], calories: 420, protein_g: 20, carbs_g: 56, fat_g: 12 },
          { meal_name: 'Mid-Morning', time: '10:30 AM', items: ['Tender coconut water', 'Banana (1)', 'Sundal / boiled chana (1 cup)'], calories: 170, protein_g: 8, carbs_g: 28, fat_g: 3 },
          { meal_name: 'Lunch', time: '1:00 PM', items: ['Rice (1.5 cups)', 'Sambar + Rasam', 'Fish curry / Chicken chettinad (150g)', 'Poriyal (beans/cabbage)', 'Curd rice (small)'], calories: 600, protein_g: 36, carbs_g: 72, fat_g: 14 },
          { meal_name: 'Evening Snack', time: '4:30 PM', items: ['Ragi kanji (1 glass)', 'or Murukku (small portion)', 'Green tea'], calories: 140, protein_g: 4, carbs_g: 26, fat_g: 3 },
          { meal_name: 'Dinner', time: '7:30 PM', items: ['Appam (2) / Ragi dosa (2)', 'Egg curry / fish moilee', 'Vegetable avial', 'Buttermilk'], calories: 450, protein_g: 22, carbs_g: 52, fat_g: 14 },
          { meal_name: 'Before Bed', time: '9:30 PM', items: ['Warm turmeric milk (1 cup)'], calories: 80, protein_g: 4, carbs_g: 8, fat_g: 3 },
        ],
        notes: 'Coconut oil in moderation is healthy. Ragi = calcium rich. Curry leaves & drumstick = iron. Rasam aids digestion.',
      },
      // 12
      {
        name: '1600 kcal • Weight Loss • Egg (Keto)',
        description: 'Low-carb high-fat Indian diet for rapid fat loss',
        goal: 'weight_loss',
        diet_type: 'eggetarian',
        target_calories: 1600,
        protein_g: 85,
        carbs_g: 40,
        fat_g: 120,
        meals: [
          { meal_name: 'Early Morning', time: '7:00 AM', items: ['Bulletproof coffee (coffee + 1 tbsp ghee + coconut oil)', 'or Black coffee with cream'], calories: 200, protein_g: 1, carbs_g: 0, fat_g: 22 },
          { meal_name: 'Breakfast', time: '9:00 AM', items: ['Egg bhurji in desi ghee (4 eggs)', 'Cheese slice (1)', 'Cucumber slices', 'Mint chutney'], calories: 400, protein_g: 26, carbs_g: 4, fat_g: 32 },
          { meal_name: 'Lunch', time: '1:00 PM', items: ['Paneer tikka (150g)', 'Palak / methi sabzi in coconut oil', 'Salad (cucumber, radish, lettuce)', 'Raita with roasted jeera'], calories: 450, protein_g: 28, carbs_g: 12, fat_g: 34 },
          { meal_name: 'Evening Snack', time: '4:30 PM', items: ['Handful of almonds & walnuts', 'Cheese cubes (30g)', 'or Coconut malai (2-3 tbsp)'], calories: 200, protein_g: 8, carbs_g: 6, fat_g: 18 },
          { meal_name: 'Dinner', time: '7:30 PM', items: ['Egg curry in coconut gravy (3 eggs)', 'Cauliflower "rice" (grated gobi)', 'Mushroom butter masala (small)', 'Cucumber raita'], calories: 400, protein_g: 24, carbs_g: 14, fat_g: 30 },
          { meal_name: 'Before Bed', time: '9:00 PM', items: ['Golden milk with coconut milk (unsweetened)'], calories: 60, protein_g: 2, carbs_g: 4, fat_g: 4 },
        ],
        notes: 'NO: rice, roti, bread, potato, sugar, fruits (except berries). YES: paneer, cheese, eggs, nuts, ghee, coconut oil.',
      },
      // 13
      {
        name: '1400 kcal • Weight Loss • Veg (PCOS)',
        description: 'Anti-inflammatory vegetarian diet for hormonal balance',
        goal: 'weight_loss',
        diet_type: 'vegetarian',
        target_calories: 1400,
        protein_g: 60,
        carbs_g: 160,
        fat_g: 45,
        meals: [
          { meal_name: 'Early Morning', time: '6:30 AM', items: ['Warm water + apple cider vinegar (1 tsp)', 'Soaked flax seeds (1 tsp)', 'Soaked walnuts (3)'], calories: 60, protein_g: 2, carbs_g: 4, fat_g: 5 },
          { meal_name: 'Breakfast', time: '8:00 AM', items: ['Ragi dosa (2) with tomato chutney', 'or Oats upma with veggies', 'Green tea (no sugar)'], calories: 260, protein_g: 8, carbs_g: 40, fat_g: 7 },
          { meal_name: 'Mid-Morning', time: '10:30 AM', items: ['Cucumber + carrot sticks', 'Pumpkin seeds (handful)', 'Cinnamon tea'], calories: 80, protein_g: 4, carbs_g: 8, fat_g: 4 },
          { meal_name: 'Lunch', time: '1:00 PM', items: ['Quinoa / brown rice (small)', 'Moong dal (1 bowl)', 'Methi / palak sabzi', 'Salad with lemon + olive oil', 'Curd (small)'], calories: 380, protein_g: 18, carbs_g: 48, fat_g: 12 },
          { meal_name: 'Evening Snack', time: '4:30 PM', items: ['Sprouts salad with lemon & chaat masala', 'Spearmint tea'], calories: 100, protein_g: 6, carbs_g: 14, fat_g: 2 },
          { meal_name: 'Dinner', time: '7:00 PM', items: ['Jowar roti (2)', 'Palak paneer (low oil, 80g paneer)', 'Veg clear soup', 'Mixed salad'], calories: 340, protein_g: 16, carbs_g: 36, fat_g: 12 },
          { meal_name: 'Before Bed', time: '9:00 PM', items: ['Warm turmeric milk (low-fat)'], calories: 80, protein_g: 4, carbs_g: 8, fat_g: 3 },
        ],
        notes: 'Anti-inflammatory: turmeric, cinnamon, fenugreek. Spearmint tea helps with PCOS. Avoid refined sugar & maida.',
      },
      // 14
      {
        name: '1800 kcal • Weight Loss • Egg (IF 16:8)',
        description: '16-hour fast with 8-hour eating window for fat loss',
        goal: 'weight_loss',
        diet_type: 'eggetarian',
        target_calories: 1800,
        protein_g: 95,
        carbs_g: 190,
        fat_g: 60,
        meals: [
          { meal_name: 'Fasting (6AM-12PM)', time: '6:00 AM', items: ['Black coffee / green tea (no sugar)', 'Water, lime water (no sweetener)', 'Nothing else till 12 PM'], calories: 10, protein_g: 0, carbs_g: 0, fat_g: 0 },
          { meal_name: 'Meal 1 (Break Fast)', time: '12:00 PM', items: ['Egg bhurji (3 eggs) with veggies', '2 multigrain roti', 'Curd (1 bowl)', 'Salad (generous)'], calories: 500, protein_g: 26, carbs_g: 44, fat_g: 22 },
          { meal_name: 'Snack', time: '3:00 PM', items: ['Paneer tikka (100g) / boiled eggs (2)', 'Mixed nuts (handful)', 'Green tea'], calories: 280, protein_g: 18, carbs_g: 12, fat_g: 18 },
          { meal_name: 'Meal 2 (Main)', time: '5:30 PM', items: ['Rice (1 cup) / 3 roti', 'Dal (1 bowl)', 'Chole / egg curry', 'Sabzi + salad', 'Buttermilk'], calories: 600, protein_g: 28, carbs_g: 76, fat_g: 16 },
          { meal_name: 'Meal 3 (Last Meal)', time: '7:30 PM', items: ['Moong dal chilla (2)', 'Peanut butter (1 tbsp)', 'Warm milk with protein powder', 'Banana (1)'], calories: 400, protein_g: 22, carbs_g: 48, fat_g: 14 },
        ],
        notes: 'Eating window: 12PM to 8PM. Fasting: 8PM to 12PM. Stay hydrated during fast. Start with 14:10 if 16:8 is hard.',
      },
      // 15
      {
        name: '2500 kcal • Muscle Gain • Non-Veg (Punjabi)',
        description: 'North Indian high-protein diet with traditional Punjabi meals',
        goal: 'muscle_gain',
        diet_type: 'non_vegetarian',
        target_calories: 2500,
        protein_g: 150,
        carbs_g: 290,
        fat_g: 70,
        meals: [
          { meal_name: 'Early Morning', time: '6:00 AM', items: ['Lassi (1 tall glass)', 'Soaked almonds + kaju (8-10)', 'Banana (1)'], calories: 250, protein_g: 8, carbs_g: 34, fat_g: 10 },
          { meal_name: 'Breakfast', time: '8:30 AM', items: ['Stuffed paneer paratha (2) with white butter', 'Boiled eggs (3)', 'Glass of full cream doodh'], calories: 550, protein_g: 32, carbs_g: 48, fat_g: 24 },
          { meal_name: 'Mid-Morning', time: '11:00 AM', items: ['Sattu ka paratha (1)', 'Chach / lassi (1 glass)', 'Apple (1)'], calories: 250, protein_g: 10, carbs_g: 36, fat_g: 6 },
          { meal_name: 'Lunch', time: '1:30 PM', items: ['Tandoori roti (3)', 'Butter chicken / mutton curry (200g)', 'Dal makhani (1 bowl)', 'Salad + onion + green chilli', 'Raita'], calories: 700, protein_g: 48, carbs_g: 68, fat_g: 20 },
          { meal_name: 'Evening Snack', time: '5:00 PM', items: ['Chole kulche (1 plate)', 'or Chicken tikka (100g)', 'Nimbu pani'], calories: 300, protein_g: 18, carbs_g: 34, fat_g: 8 },
          { meal_name: 'Dinner', time: '8:30 PM', items: ['3 roti with ghee', 'Keema matar / fish curry (150g)', 'Mixed dal', 'Salad'], calories: 500, protein_g: 36, carbs_g: 48, fat_g: 14 },
        ],
        notes: 'Authentic Punjabi diet with desi ghee & makhan. Adjust ghee/butter if gaining too much fat. Best for hardgainers.',
      },
      // 16
      {
        name: '1800 kcal • General Fitness • Veg (Student Budget)',
        description: 'Affordable vegetarian diet for college students – ₹120/day',
        goal: 'general_fitness',
        diet_type: 'vegetarian',
        target_calories: 1800,
        protein_g: 70,
        carbs_g: 250,
        fat_g: 45,
        meals: [
          { meal_name: 'Early Morning', time: '7:00 AM', items: ['Warm water', 'Banana (1) – ₹4', 'Soaked chana (1 cup) – ₹5'], calories: 150, protein_g: 6, carbs_g: 28, fat_g: 2 },
          { meal_name: 'Breakfast', time: '8:30 AM', items: ['Poha with peanuts & onion – ₹15', 'Glass of milk – ₹12', 'or Paratha (2) with curd – ₹20'], calories: 350, protein_g: 12, carbs_g: 50, fat_g: 10 },
          { meal_name: 'Mid-Morning', time: '11:00 AM', items: ['Roasted chana (1 cup) – ₹8', 'Seasonal fruit – ₹10'], calories: 130, protein_g: 8, carbs_g: 18, fat_g: 3 },
          { meal_name: 'Lunch', time: '1:00 PM', items: ['Rice (1.5 cups) – ₹8', 'Dal (1 bowl) – ₹10', 'Aloo/gobi sabzi – ₹12', 'Onion + lemon salad', 'Curd – ₹8'], calories: 480, protein_g: 16, carbs_g: 68, fat_g: 12 },
          { meal_name: 'Evening Snack', time: '5:00 PM', items: ['Sattu drink – ₹6', 'Roasted peanuts – ₹8', 'or Murmura chivda – ₹10'], calories: 180, protein_g: 10, carbs_g: 22, fat_g: 6 },
          { meal_name: 'Dinner', time: '8:00 PM', items: ['3 roti – ₹10', 'Rajma / chole – ₹15', 'Soya chunks – ₹12', 'Buttermilk – ₹5'], calories: 450, protein_g: 20, carbs_g: 58, fat_g: 10 },
          { meal_name: 'Before Bed', time: '10:00 PM', items: ['Warm milk with haldi – ₹12'], calories: 80, protein_g: 4, carbs_g: 8, fat_g: 3 },
        ],
        notes: 'Total daily cost: ₹120-150. Buy wholesale: chana, rajma, moong, peanuts, sattu. Cook in bulk on weekends.',
      },
      // 17
      {
        name: '1800 kcal • Maintenance • Veg (Ayurvedic)',
        description: 'Traditional Ayurvedic sattvic diet for holistic wellness',
        goal: 'maintenance',
        diet_type: 'vegetarian',
        target_calories: 1800,
        protein_g: 65,
        carbs_g: 240,
        fat_g: 55,
        meals: [
          { meal_name: 'Early Morning', time: '6:00 AM', items: ['Warm water with tulsi leaves', 'Amla juice (2 tbsp) with honey', 'Soaked badam (5) + kishmish (5)'], calories: 90, protein_g: 3, carbs_g: 12, fat_g: 5 },
          { meal_name: 'Breakfast', time: '8:00 AM', items: ['Daliya / khichdi with ghee (1 bowl)', 'or Idli (3) with coconut chutney', 'Herbal tea (tulsi/ginger)'], calories: 320, protein_g: 10, carbs_g: 50, fat_g: 8 },
          { meal_name: 'Mid-Morning', time: '10:30 AM', items: ['Seasonal fruits (apple, pomegranate)', 'Coconut water'], calories: 120, protein_g: 1, carbs_g: 28, fat_g: 1 },
          { meal_name: 'Lunch', time: '12:30 PM', items: ['Rice (1 cup) with ghee (1 tsp)', 'Moong dal (1 bowl)', 'Lauki / turai sabzi', 'Fresh salad', 'Buttermilk with jeera'], calories: 450, protein_g: 16, carbs_g: 62, fat_g: 14 },
          { meal_name: 'Evening Snack', time: '4:00 PM', items: ['Dry fruits ladoo (1-2)', 'or Til chikki (small)', 'Ginger tea'], calories: 150, protein_g: 4, carbs_g: 20, fat_g: 7 },
          { meal_name: 'Dinner', time: '7:00 PM', items: ['Roti (2) with desi ghee', 'Mixed veg (seasonal)', 'Khichdi (small bowl)', 'Warm soup (tomato/veg)'], calories: 400, protein_g: 12, carbs_g: 52, fat_g: 14 },
          { meal_name: 'Before Bed', time: '9:00 PM', items: ['Warm milk with ashwagandha + kesar'], calories: 100, protein_g: 4, carbs_g: 10, fat_g: 4 },
        ],
        notes: 'Sattvic: no onion, no garlic, no non-veg. Use ghee generously. Eat before sunset ideally. Fresh, seasonal only.',
      },
      // 18
      {
        name: '1200 kcal • Weight Loss • Non-Veg (Extreme)',
        description: 'Aggressive calorie deficit with high protein for rapid fat loss',
        goal: 'weight_loss',
        diet_type: 'non_vegetarian',
        target_calories: 1200,
        protein_g: 100,
        carbs_g: 80,
        fat_g: 50,
        meals: [
          { meal_name: 'Early Morning', time: '6:30 AM', items: ['Black coffee (no sugar)', 'Warm water + lemon', 'Soaked methi seeds (1 tsp)'], calories: 15, protein_g: 0, carbs_g: 2, fat_g: 0 },
          { meal_name: 'Breakfast', time: '8:00 AM', items: ['Egg white omelette (5 whites) with veggies', 'Multigrain bread (1 slice)', 'Green tea'], calories: 200, protein_g: 22, carbs_g: 14, fat_g: 4 },
          { meal_name: 'Mid-Morning', time: '10:30 AM', items: ['Cucumber + carrot sticks', 'Buttermilk (1 glass)', 'Almonds (4)'], calories: 80, protein_g: 4, carbs_g: 8, fat_g: 4 },
          { meal_name: 'Lunch', time: '1:00 PM', items: ['Grilled chicken breast (200g)', 'Large salad (lettuce, cucumber, tomato)', 'Roti (1) / no rice', 'Dal (half bowl)'], calories: 380, protein_g: 42, carbs_g: 24, fat_g: 12 },
          { meal_name: 'Evening Snack', time: '4:30 PM', items: ['Boiled egg (1)', 'Green tea', 'Roasted makhana (small)'], calories: 100, protein_g: 8, carbs_g: 8, fat_g: 5 },
          { meal_name: 'Dinner', time: '7:00 PM', items: ['Grilled fish (150g) / tandoori chicken', 'Stir-fried veggies (broccoli, capsicum)', 'Clear soup (1 bowl)'], calories: 320, protein_g: 34, carbs_g: 12, fat_g: 14 },
          { meal_name: 'Before Bed', time: '9:00 PM', items: ['Warm water + jeera'], calories: 5, protein_g: 0, carbs_g: 0, fat_g: 0 },
        ],
        notes: 'Only for 4-6 weeks. Not sustainable long-term. May feel low energy. Consult trainer first. Drink 4L+ water.',
      },
      // 19
      {
        name: '1400 kcal • Toning • Egg (Pre-Wedding)',
        description: '8-week bridal/groom diet plan for event-ready physique',
        goal: 'toning',
        diet_type: 'eggetarian',
        target_calories: 1400,
        protein_g: 75,
        carbs_g: 150,
        fat_g: 45,
        meals: [
          { meal_name: 'Early Morning', time: '6:30 AM', items: ['Warm water + lemon + honey', 'Chia seeds soaked (1 tbsp)', 'Almonds (5) + walnuts (2)'], calories: 80, protein_g: 3, carbs_g: 8, fat_g: 5 },
          { meal_name: 'Breakfast', time: '8:00 AM', items: ['Egg white omelette (4) with spinach & mushroom', 'Multigrain toast (1)', 'Green tea'], calories: 250, protein_g: 20, carbs_g: 18, fat_g: 8 },
          { meal_name: 'Mid-Morning', time: '10:30 AM', items: ['Papaya (1 bowl) / pomegranate', 'Coconut water'], calories: 90, protein_g: 1, carbs_g: 20, fat_g: 1 },
          { meal_name: 'Lunch', time: '1:00 PM', items: ['Multigrain roti (1.5)', 'Grilled paneer (100g) / egg curry (2)', 'Mixed dal (1 bowl)', 'Large salad with flaxseed', 'Curd (small)'], calories: 400, protein_g: 24, carbs_g: 42, fat_g: 14 },
          { meal_name: 'Evening Snack', time: '4:30 PM', items: ['Roasted makhana + pumpkin seeds', 'Green tea with lemon'], calories: 80, protein_g: 4, carbs_g: 10, fat_g: 3 },
          { meal_name: 'Dinner', time: '7:00 PM', items: ['Grilled fish / paneer tikka (100g)', 'Vegetable soup (1 big bowl)', 'Salad with olive oil dressing'], calories: 320, protein_g: 22, carbs_g: 18, fat_g: 14 },
          { meal_name: 'Before Bed', time: '9:00 PM', items: ['Warm milk (low-fat) + saffron'], calories: 80, protein_g: 4, carbs_g: 8, fat_g: 3 },
        ],
        notes: 'Start 8 weeks before event. No alcohol, sugar, fried food, maida. Skin-friendly: papaya, amla, kesar.',
      },
      // 20
      {
        name: '1600 kcal • Maintenance • Veg (Senior 50+)',
        description: 'Gentle nutrition plan for 50+ age group with joint & bone care',
        goal: 'maintenance',
        diet_type: 'vegetarian',
        target_calories: 1600,
        protein_g: 65,
        carbs_g: 200,
        fat_g: 48,
        meals: [
          { meal_name: 'Early Morning', time: '6:30 AM', items: ['Warm water + lemon', 'Soaked almonds (5) + akhrot (2)', 'Ashwagandha + haldi milk (optional)'], calories: 80, protein_g: 3, carbs_g: 6, fat_g: 6 },
          { meal_name: 'Breakfast', time: '8:00 AM', items: ['Ragi porridge with milk & jaggery', 'or Dalia upma with veggies', 'Amla candy (2 pcs)', 'Herbal tea'], calories: 280, protein_g: 8, carbs_g: 46, fat_g: 6 },
          { meal_name: 'Mid-Morning', time: '10:30 AM', items: ['Seasonal fruit (papaya/banana/apple)', 'Buttermilk (1 glass)'], calories: 100, protein_g: 3, carbs_g: 20, fat_g: 1 },
          { meal_name: 'Lunch', time: '12:30 PM', items: ['Soft roti (2) / rice (1 cup)', 'Moong dal (1 bowl) – easy to digest', 'Lauki / palak sabzi (low oil)', 'Curd (1 bowl)', 'Grated carrot salad'], calories: 400, protein_g: 16, carbs_g: 54, fat_g: 12 },
          { meal_name: 'Evening Snack', time: '4:00 PM', items: ['Makhana (roasted, 1 cup)', 'or Fruit custard (small)', 'Ginger tea'], calories: 120, protein_g: 4, carbs_g: 18, fat_g: 4 },
          { meal_name: 'Dinner', time: '7:00 PM', items: ['Khichdi with ghee (1 bowl)', 'or 1.5 soft roti with paneer bhurji', 'Vegetable soup', 'Salad (light)'], calories: 350, protein_g: 14, carbs_g: 40, fat_g: 14 },
          { meal_name: 'Before Bed', time: '9:00 PM', items: ['Warm milk + turmeric + saffron', 'Triphala powder (optional)'], calories: 80, protein_g: 4, carbs_g: 8, fat_g: 3 },
        ],
        notes: 'Focus: calcium (ragi, curd, milk), joints (turmeric, ashwagandha), fiber (lauki, palak). Walk 20 min daily.',
      },
    ];

    const inserts = templates.map(t => ({
      gym_id: gymId,
      ...t,
      is_template: true,
      is_active: true,
    }));

    await supabase.from('gym_diet_plans').insert(inserts);
  }
}

export const dietPlanService = DietPlanService.getInstance();
