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

    // Seed default templates if none exist
    if (!data || data.length === 0) {
      await this.seedDefaultTemplates(gymId);
      const { data: seeded } = await supabase
        .from('gym_diet_plans')
        .select('*')
        .eq('gym_id', gymId)
        .eq('is_active', true)
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
      {
        name: 'Weight Loss - Vegetarian',
        description: 'Low-calorie Indian vegetarian diet for sustainable weight loss',
        goal: 'weight_loss',
        diet_type: 'vegetarian',
        target_calories: 1500,
        protein_g: 65,
        carbs_g: 180,
        fat_g: 50,
        meals: [
          { meal_name: 'Early Morning', time: '6:30 AM', items: ['Warm lemon water', 'Soaked almonds (5-6)', 'Soaked methi seeds (1 tsp)'], calories: 80 },
          { meal_name: 'Breakfast', time: '8:00 AM', items: ['Moong dal chilla (2) with mint chutney', 'Curd (1 small bowl)', 'Green tea'], calories: 280 },
          { meal_name: 'Mid-Morning', time: '10:30 AM', items: ['Buttermilk (1 glass)', 'Apple or guava (1)'], calories: 100 },
          { meal_name: 'Lunch', time: '1:00 PM', items: ['Brown rice / 2 roti', 'Dal (1 bowl)', 'Sabzi (lauki/tinda/bhindi)', 'Salad (cucumber, tomato, onion)', 'Curd (small bowl)'], calories: 420 },
          { meal_name: 'Evening Snack', time: '4:30 PM', items: ['Roasted chana (1 handful)', 'Green tea / black coffee', 'Sprouts salad (small bowl)'], calories: 120 },
          { meal_name: 'Dinner', time: '7:30 PM', items: ['2 roti / 1 bajra roti', 'Palak paneer (light oil)', 'Mixed veg soup', 'Salad'], calories: 380 },
          { meal_name: 'Before Bed', time: '9:30 PM', items: ['Warm haldi doodh (low-fat milk, 1 cup)'], calories: 100 },
        ],
        notes: 'Avoid sugar, maida, fried food. Use minimal oil (2-3 tsp/day). Drink 3-4L water daily.',
      },
      {
        name: 'Muscle Gain - Non-Veg',
        description: 'High protein non-veg diet for muscle building',
        goal: 'muscle_gain',
        diet_type: 'non_vegetarian',
        target_calories: 2600,
        protein_g: 160,
        carbs_g: 300,
        fat_g: 70,
        meals: [
          { meal_name: 'Early Morning', time: '6:00 AM', items: ['Banana (2)', 'Soaked almonds & walnuts (8-10)', 'Warm water'], calories: 200 },
          { meal_name: 'Breakfast', time: '8:00 AM', items: ['Egg whites (6) + whole egg (2) omelette', '4 brown bread slices', 'Peanut butter (1 tbsp)', 'Glass of milk'], calories: 520 },
          { meal_name: 'Mid-Morning', time: '11:00 AM', items: ['Whey protein shake (1 scoop) with banana', 'Handful of dry fruits'], calories: 280 },
          { meal_name: 'Lunch', time: '1:30 PM', items: ['Rice (1.5 cups) / 4 roti', 'Chicken breast curry (200g)', 'Dal (1 bowl)', 'Salad + curd'], calories: 650 },
          { meal_name: 'Pre-Workout', time: '4:30 PM', items: ['Banana (1)', 'Peanut butter sandwich', 'Black coffee'], calories: 200 },
          { meal_name: 'Post-Workout', time: '7:00 PM', items: ['Whey protein (1 scoop)', 'Sweet potato (1 medium)'], calories: 250 },
          { meal_name: 'Dinner', time: '8:30 PM', items: ['3 roti', 'Grilled fish / chicken (150g)', 'Mixed veg', 'Salad'], calories: 500 },
        ],
        notes: 'Eat every 2-3 hours. Protein in every meal. Sleep 7-8 hours. Hydrate well.',
      },
      {
        name: 'Budget Protein - Eggetarian',
        description: 'Affordable high-protein diet using eggs and dairy',
        goal: 'muscle_gain',
        diet_type: 'eggetarian',
        target_calories: 2100,
        protein_g: 120,
        carbs_g: 250,
        fat_g: 60,
        meals: [
          { meal_name: 'Early Morning', time: '6:30 AM', items: ['Soaked chana (1 cup boiled)', 'Warm water with honey'], calories: 150 },
          { meal_name: 'Breakfast', time: '8:00 AM', items: ['Boiled eggs (4-5) + 1 whole egg bhurji', 'Paratha (2) with curd', 'Glass of milk'], calories: 450 },
          { meal_name: 'Mid-Morning', time: '11:00 AM', items: ['Paneer bhurji (100g)', 'Roti (1)'], calories: 250 },
          { meal_name: 'Lunch', time: '1:30 PM', items: ['Rice (1.5 cups)', 'Rajma/chole (1.5 bowls)', 'Egg curry (2 eggs)', 'Salad + onion'], calories: 550 },
          { meal_name: 'Evening Snack', time: '5:00 PM', items: ['Sattu drink (2 tbsp)', 'Roasted peanuts (handful)', 'Banana (1)'], calories: 200 },
          { meal_name: 'Dinner', time: '8:00 PM', items: ['3 roti', 'Soya chunk curry (1 bowl)', 'Mixed dal', 'Curd (1 bowl)'], calories: 450 },
          { meal_name: 'Before Bed', time: '10:00 PM', items: ['Warm milk with turmeric'], calories: 80 },
        ],
        notes: 'Budget-friendly: eggs, soya, rajma, chana, sattu, peanuts are cheapest protein sources in India.',
      },
      {
        name: 'Lean Maintenance',
        description: 'Balanced diet to maintain lean physique',
        goal: 'maintenance',
        diet_type: 'vegetarian',
        target_calories: 1900,
        protein_g: 80,
        carbs_g: 230,
        fat_g: 55,
        meals: [
          { meal_name: 'Early Morning', time: '7:00 AM', items: ['Warm water + lemon', 'Soaked almonds (6)'], calories: 60 },
          { meal_name: 'Breakfast', time: '8:30 AM', items: ['Poha / Upma (1 plate) with peanuts & veggies', 'Curd (1 bowl)', 'Green tea'], calories: 320 },
          { meal_name: 'Mid-Morning', time: '11:00 AM', items: ['Fruits (seasonal) - papaya/apple/guava', 'Buttermilk'], calories: 120 },
          { meal_name: 'Lunch', time: '1:00 PM', items: ['2 roti / rice (1 cup)', 'Dal (1 bowl)', 'Seasonal sabzi', 'Raita', 'Salad'], calories: 450 },
          { meal_name: 'Evening Snack', time: '4:30 PM', items: ['Sprouts chaat (1 bowl)', 'Green tea / coconut water'], calories: 130 },
          { meal_name: 'Dinner', time: '7:30 PM', items: ['2 roti / jowar roti', 'Paneer / tofu sabzi (low oil)', 'Soup (tomato/veg)', 'Salad'], calories: 400 },
          { meal_name: 'Before Bed', time: '9:30 PM', items: ['Warm milk (1 cup)'], calories: 100 },
        ],
        notes: 'Focus on portion control. Include variety. Minimal processed food.',
      },
      {
        name: "Beginner's Balanced",
        description: 'Simple balanced diet for gym beginners',
        goal: 'general_fitness',
        diet_type: 'eggetarian',
        target_calories: 1900,
        protein_g: 90,
        carbs_g: 240,
        fat_g: 55,
        meals: [
          { meal_name: 'Early Morning', time: '7:00 AM', items: ['Warm water', 'Banana (1)'], calories: 100 },
          { meal_name: 'Breakfast', time: '8:30 AM', items: ['Egg bhurji (3 eggs) / Besan chilla (2)', '2 bread slices / 1 paratha', 'Glass of milk'], calories: 380 },
          { meal_name: 'Mid-Morning', time: '11:00 AM', items: ['Any seasonal fruit', 'Handful of peanuts/makhana'], calories: 130 },
          { meal_name: 'Lunch', time: '1:00 PM', items: ['Rice (1 cup) + 1 roti', 'Dal / sambar (1 bowl)', 'Sabzi with paneer / egg curry', 'Curd + salad'], calories: 500 },
          { meal_name: 'Post-Workout', time: '5:30 PM', items: ['Banana (1)', 'Sattu / protein shake', 'Dry fruits (handful)'], calories: 210 },
          { meal_name: 'Dinner', time: '8:00 PM', items: ['2 roti', 'Light chicken curry / mixed dal', 'Veg soup', 'Salad'], calories: 430 },
          { meal_name: 'Before Bed', time: '10:00 PM', items: ['Warm milk with turmeric'], calories: 80 },
        ],
        notes: 'Start simple. Track eating habits. Gradually reduce junk food. Stay consistent.',
      },
      {
        name: "Women's Toning Diet",
        description: 'Calorie-controlled diet for women focused on toning',
        goal: 'toning',
        diet_type: 'vegetarian',
        target_calories: 1300,
        protein_g: 60,
        carbs_g: 150,
        fat_g: 40,
        meals: [
          { meal_name: 'Early Morning', time: '6:30 AM', items: ['Warm water + lemon + chia seeds (1 tsp)', 'Soaked almonds (4)'], calories: 60 },
          { meal_name: 'Breakfast', time: '8:00 AM', items: ['Oats porridge with milk + berries', 'or Ragi dosa (2) with chutney', 'Green tea'], calories: 250 },
          { meal_name: 'Mid-Morning', time: '10:30 AM', items: ['Papaya / watermelon (1 bowl)', 'Buttermilk'], calories: 80 },
          { meal_name: 'Lunch', time: '1:00 PM', items: ['1 roti / small rice', 'Dal (1 bowl)', 'Baingan / bhindi sabzi (low oil)', 'Salad (generous)', 'Raita (small)'], calories: 350 },
          { meal_name: 'Evening Snack', time: '4:30 PM', items: ['Roasted makhana (1 cup)', 'Green tea / herbal tea'], calories: 70 },
          { meal_name: 'Dinner', time: '7:00 PM', items: ['Veg soup (1 big bowl)', 'Grilled paneer (80g) with veggies', 'or Moong dal khichdi (small bowl)'], calories: 300 },
          { meal_name: 'Before Bed', time: '9:00 PM', items: ['Chamomile tea / warm milk (half cup)'], calories: 40 },
        ],
        notes: 'Focus on fiber-rich foods. Include iron-rich foods (spinach, dates). Avoid heavy dinner. Walk after meals.',
      },
      {
        name: 'High Protein - Pure Veg',
        description: 'Maximizing protein on a pure vegetarian diet',
        goal: 'muscle_gain',
        diet_type: 'vegetarian',
        target_calories: 2300,
        protein_g: 110,
        carbs_g: 280,
        fat_g: 60,
        meals: [
          { meal_name: 'Early Morning', time: '6:30 AM', items: ['Soaked chana + moong (1 cup)', 'Banana (1)', 'Warm water'], calories: 200 },
          { meal_name: 'Breakfast', time: '8:00 AM', items: ['Paneer paratha (2) or Besan chilla (3)', 'Curd (1 bowl)', 'Glass of soy milk / milk'], calories: 450 },
          { meal_name: 'Mid-Morning', time: '11:00 AM', items: ['Soy milk smoothie with banana', 'Mixed nuts (handful)'], calories: 220 },
          { meal_name: 'Lunch', time: '1:30 PM', items: ['Rice (1.5 cups) / 3 roti', 'Rajma / chole / lobia (1.5 bowls)', 'Paneer sabzi (100g)', 'Salad + curd'], calories: 600 },
          { meal_name: 'Evening Snack', time: '4:30 PM', items: ['Soya chunks dry roasted (1 cup)', 'Peanut butter on roti (1)', 'Sattu drink'], calories: 280 },
          { meal_name: 'Dinner', time: '8:00 PM', items: ['3 roti', 'Tofu/paneer bhurji', 'Mixed dal (1 bowl)', 'Salad'], calories: 480 },
          { meal_name: 'Before Bed', time: '10:00 PM', items: ['Warm milk with protein powder / badam powder'], calories: 120 },
        ],
        notes: 'Veg protein sources: paneer, soya, rajma, chana, dal, peanuts, tofu. Combine legumes + grains for complete protein.',
      },
      {
        name: 'Post-Workout Recovery',
        description: 'Nutrition plan focused on workout recovery and muscle repair',
        goal: 'general_fitness',
        diet_type: 'non_vegetarian',
        target_calories: 2200,
        protein_g: 130,
        carbs_g: 260,
        fat_g: 60,
        meals: [
          { meal_name: 'Pre-Workout (1hr before)', time: '5:30 AM', items: ['Banana (1-2)', 'Coffee / green tea', 'Handful of dry fruits'], calories: 200 },
          { meal_name: 'Immediately Post-Workout', time: '7:30 AM', items: ['Whey protein shake with banana & milk', 'Dates (2-3)'], calories: 300 },
          { meal_name: 'Breakfast (1hr post workout)', time: '8:30 AM', items: ['Omelette (4 whites + 1 whole)', '3 bread/roti', 'Glass of juice'], calories: 400 },
          { meal_name: 'Mid-Morning', time: '11:00 AM', items: ['Greek yogurt / curd (1 bowl)', 'Mixed fruits'], calories: 150 },
          { meal_name: 'Lunch', time: '1:30 PM', items: ['Rice (1.5 cups)', 'Chicken / fish (200g)', 'Dal (1 bowl)', 'Vegetables + salad'], calories: 550 },
          { meal_name: 'Evening Snack', time: '5:00 PM', items: ['Boiled eggs (2-3)', 'Sweet potato (1)', 'Black coffee'], calories: 250 },
          { meal_name: 'Dinner', time: '8:00 PM', items: ['2-3 roti', 'Grilled chicken / paneer', 'Veg soup', 'Salad'], calories: 400 },
        ],
        notes: 'Recovery window: consume protein within 30 mins post-workout. Stay hydrated. Sleep 7-8 hours.',
      },
      {
        name: 'Diabetic-Friendly Fitness',
        description: 'Low GI diet for gym-goers with diabetes',
        goal: 'maintenance',
        diet_type: 'vegetarian',
        target_calories: 1700,
        protein_g: 70,
        carbs_g: 190,
        fat_g: 50,
        meals: [
          { meal_name: 'Early Morning', time: '6:30 AM', items: ['Methi seeds soaked water', 'Almonds (5) + walnuts (2)'], calories: 80 },
          { meal_name: 'Breakfast', time: '8:00 AM', items: ['Multigrain / ragi roti (2)', 'Vegetable stuffing', 'Curd (1 bowl)', 'No-sugar green tea'], calories: 300 },
          { meal_name: 'Mid-Morning', time: '10:30 AM', items: ['Guava / apple / pear (1)', 'Roasted chana (small handful)'], calories: 100 },
          { meal_name: 'Lunch', time: '12:30 PM', items: ['Brown rice (small portion) / 2 roti', 'Dal (1 bowl)', 'Karela / methi sabzi', 'Salad with lemon', 'Curd (small)'], calories: 400 },
          { meal_name: 'Evening Snack', time: '4:00 PM', items: ['Vegetable soup (no cream)', 'Roasted makhana (1 cup)', 'Sugar-free tea'], calories: 100 },
          { meal_name: 'Dinner', time: '7:00 PM', items: ['Jowar / bajra roti (2)', 'Mixed veg (low oil)', 'Palak paneer (small)', 'Salad'], calories: 350 },
          { meal_name: 'Before Bed', time: '9:00 PM', items: ['Warm milk (unsweetened, 1 cup)'], calories: 80 },
        ],
        notes: 'Avoid: sugar, white rice, maida, potatoes, mango, banana, grapes. Use low GI foods. Small frequent meals. Monitor blood sugar.',
      },
      {
        name: 'Mass Gain - Budget Desi',
        description: 'Affordable high-calorie Indian diet for mass gain',
        goal: 'muscle_gain',
        diet_type: 'eggetarian',
        target_calories: 3000,
        protein_g: 140,
        carbs_g: 400,
        fat_g: 80,
        meals: [
          { meal_name: 'Early Morning', time: '6:00 AM', items: ['Banana shake (2 bananas + milk + oats)', 'Soaked peanuts (handful)', 'Boiled eggs (2)'], calories: 400 },
          { meal_name: 'Breakfast', time: '8:30 AM', items: ['Aloo paratha (3) with butter & curd', 'Egg bhurji (4 eggs)', 'Lassi (1 glass)'], calories: 700 },
          { meal_name: 'Mid-Morning', time: '11:00 AM', items: ['Sattu shake (3 tbsp + banana)', 'Peanut butter roti (1)', 'Chana (boiled, 1 cup)'], calories: 350 },
          { meal_name: 'Lunch', time: '1:30 PM', items: ['Rice (2 cups) + 2 roti', 'Rajma / chole (2 bowls)', 'Egg curry (3 eggs)', 'Curd (1 bowl)', 'Salad + onion'], calories: 800 },
          { meal_name: 'Evening Snack', time: '5:00 PM', items: ['Boiled eggs (3)', 'Sweet potato (2 medium)', 'Peanuts (roasted, handful)', 'Banana (1)'], calories: 400 },
          { meal_name: 'Dinner', time: '8:30 PM', items: ['4 roti with ghee', 'Soya chunk curry (1.5 bowls)', 'Mixed dal (1 bowl)', 'Salad'], calories: 600 },
          { meal_name: 'Before Bed', time: '10:30 PM', items: ['Milk (2 cups) with badam powder', 'Dates (3-4)'], calories: 250 },
        ],
        notes: 'Eat big, lift big. All items budget-friendly: eggs ₹7/each, sattu ₹40/kg, peanuts ₹80/kg, bananas ₹40/dozen.',
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
