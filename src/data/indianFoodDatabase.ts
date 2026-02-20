/**
 * Indian Food Database — ~180 common Indian dishes with per-serving macro data.
 * Curated for gym diet-plan creation (HealthifyMe-style).
 *
 * Sources: IFCT 2017, HealthifyMe, NIN nutrition tables (approximated).
 * Each entry is one standard serving.
 */

import type { FoodItem, FoodCategory } from '@/types/dietPlan';

// ── Category metadata ─────────────────────────────────────
export const FOOD_CATEGORIES: { id: FoodCategory; label: string; emoji: string }[] = [
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

// ── Database ──────────────────────────────────────────────
export const INDIAN_FOODS: FoodItem[] = [
  // ─── Roti / Bread ─────────────────────────────────────
  { name: 'Chapati (Wheat)', category: 'grains', serving: '1 medium', calories: 104, protein_g: 3, carbs_g: 18, fat_g: 2, isVeg: true, isEgg: false },
  { name: 'Phulka', category: 'grains', serving: '1 pc', calories: 70, protein_g: 2.5, carbs_g: 14, fat_g: 0.5, isVeg: true, isEgg: false },
  { name: 'Paratha (Plain)', category: 'grains', serving: '1 medium', calories: 180, protein_g: 4, carbs_g: 25, fat_g: 7, isVeg: true, isEgg: false },
  { name: 'Aloo Paratha', category: 'grains', serving: '1 pc', calories: 230, protein_g: 5, carbs_g: 30, fat_g: 10, isVeg: true, isEgg: false },
  { name: 'Gobi Paratha', category: 'grains', serving: '1 pc', calories: 210, protein_g: 5, carbs_g: 28, fat_g: 9, isVeg: true, isEgg: false },
  { name: 'Methi Paratha', category: 'grains', serving: '1 pc', calories: 190, protein_g: 5, carbs_g: 26, fat_g: 8, isVeg: true, isEgg: false },
  { name: 'Multigrain Roti', category: 'grains', serving: '1 medium', calories: 110, protein_g: 4, carbs_g: 18, fat_g: 2.5, isVeg: true, isEgg: false },
  { name: 'Bajra Roti', category: 'grains', serving: '1 medium', calories: 120, protein_g: 3, carbs_g: 22, fat_g: 2, isVeg: true, isEgg: false },
  { name: 'Jowar Roti', category: 'grains', serving: '1 medium', calories: 115, protein_g: 3, carbs_g: 21, fat_g: 2, isVeg: true, isEgg: false },
  { name: 'Ragi Roti', category: 'grains', serving: '1 medium', calories: 110, protein_g: 3, carbs_g: 20, fat_g: 2, isVeg: true, isEgg: false },
  { name: 'Naan (Tandoor)', category: 'grains', serving: '1 pc', calories: 260, protein_g: 7, carbs_g: 42, fat_g: 7, isVeg: true, isEgg: false },
  { name: 'Butter Naan', category: 'grains', serving: '1 pc', calories: 310, protein_g: 7, carbs_g: 42, fat_g: 12, isVeg: true, isEgg: false },
  { name: 'Garlic Naan', category: 'grains', serving: '1 pc', calories: 290, protein_g: 7, carbs_g: 43, fat_g: 9, isVeg: true, isEgg: false },
  { name: 'Rumali Roti', category: 'grains', serving: '1 pc', calories: 140, protein_g: 4, carbs_g: 24, fat_g: 3, isVeg: true, isEgg: false },
  { name: 'Puri', category: 'grains', serving: '1 pc', calories: 120, protein_g: 2, carbs_g: 14, fat_g: 6, isVeg: true, isEgg: false },
  { name: 'Bhatura', category: 'grains', serving: '1 pc', calories: 250, protein_g: 5, carbs_g: 32, fat_g: 12, isVeg: true, isEgg: false },
  { name: 'Dosa (Plain)', category: 'grains', serving: '1 medium', calories: 130, protein_g: 3, carbs_g: 22, fat_g: 3, isVeg: true, isEgg: false },
  { name: 'Masala Dosa', category: 'grains', serving: '1 pc', calories: 250, protein_g: 5, carbs_g: 38, fat_g: 8, isVeg: true, isEgg: false },
  { name: 'Ragi Dosa', category: 'grains', serving: '1 medium', calories: 120, protein_g: 3, carbs_g: 20, fat_g: 3, isVeg: true, isEgg: false },
  { name: 'Idli', category: 'grains', serving: '1 pc', calories: 60, protein_g: 2, carbs_g: 12, fat_g: 0.5, isVeg: true, isEgg: false },
  { name: 'Oats Idli', category: 'grains', serving: '1 pc', calories: 55, protein_g: 2.5, carbs_g: 10, fat_g: 1, isVeg: true, isEgg: false },
  { name: 'Upma', category: 'grains', serving: '1 bowl (150g)', calories: 180, protein_g: 5, carbs_g: 28, fat_g: 5, isVeg: true, isEgg: false },
  { name: 'Poha', category: 'grains', serving: '1 bowl (150g)', calories: 170, protein_g: 4, carbs_g: 30, fat_g: 4, isVeg: true, isEgg: false },
  { name: 'Uttapam', category: 'grains', serving: '1 medium', calories: 180, protein_g: 4, carbs_g: 28, fat_g: 5, isVeg: true, isEgg: false },
  { name: 'Wheat Bread (Brown)', category: 'grains', serving: '1 slice', calories: 75, protein_g: 3, carbs_g: 13, fat_g: 1, isVeg: true, isEgg: false },
  { name: 'Oats Porridge', category: 'grains', serving: '1 bowl (200ml)', calories: 150, protein_g: 5, carbs_g: 25, fat_g: 3, isVeg: true, isEgg: false },

  // ─── Rice ─────────────────────────────────────────────
  { name: 'White Rice (Cooked)', category: 'rice', serving: '1 cup (150g)', calories: 200, protein_g: 4, carbs_g: 44, fat_g: 0.5, isVeg: true, isEgg: false },
  { name: 'Brown Rice (Cooked)', category: 'rice', serving: '1 cup (150g)', calories: 180, protein_g: 4, carbs_g: 38, fat_g: 1.5, isVeg: true, isEgg: false },
  { name: 'Jeera Rice', category: 'rice', serving: '1 cup', calories: 210, protein_g: 4, carbs_g: 42, fat_g: 3, isVeg: true, isEgg: false },
  { name: 'Veg Biryani', category: 'rice', serving: '1 plate (200g)', calories: 280, protein_g: 6, carbs_g: 46, fat_g: 8, isVeg: true, isEgg: false },
  { name: 'Chicken Biryani', category: 'rice', serving: '1 plate (200g)', calories: 350, protein_g: 18, carbs_g: 42, fat_g: 12, isVeg: false, isEgg: false },
  { name: 'Egg Biryani', category: 'rice', serving: '1 plate (200g)', calories: 310, protein_g: 12, carbs_g: 42, fat_g: 10, isVeg: false, isEgg: true },
  { name: 'Lemon Rice', category: 'rice', serving: '1 cup', calories: 210, protein_g: 4, carbs_g: 40, fat_g: 4, isVeg: true, isEgg: false },
  { name: 'Curd Rice', category: 'rice', serving: '1 cup', calories: 190, protein_g: 5, carbs_g: 35, fat_g: 3, isVeg: true, isEgg: false },
  { name: 'Pulao (Veg)', category: 'rice', serving: '1 cup', calories: 220, protein_g: 5, carbs_g: 38, fat_g: 5, isVeg: true, isEgg: false },
  { name: 'Khichdi', category: 'rice', serving: '1 bowl (200g)', calories: 200, protein_g: 7, carbs_g: 34, fat_g: 4, isVeg: true, isEgg: false },

  // ─── Dal / Lentils ────────────────────────────────────
  { name: 'Dal Tadka (Toor)', category: 'dal', serving: '1 bowl (150ml)', calories: 140, protein_g: 8, carbs_g: 18, fat_g: 4, isVeg: true, isEgg: false },
  { name: 'Moong Dal', category: 'dal', serving: '1 bowl (150ml)', calories: 130, protein_g: 9, carbs_g: 17, fat_g: 3, isVeg: true, isEgg: false },
  { name: 'Masoor Dal', category: 'dal', serving: '1 bowl (150ml)', calories: 140, protein_g: 9, carbs_g: 19, fat_g: 3, isVeg: true, isEgg: false },
  { name: 'Chana Dal', category: 'dal', serving: '1 bowl (150ml)', calories: 160, protein_g: 9, carbs_g: 22, fat_g: 4, isVeg: true, isEgg: false },
  { name: 'Urad Dal', category: 'dal', serving: '1 bowl (150ml)', calories: 150, protein_g: 8, carbs_g: 20, fat_g: 4, isVeg: true, isEgg: false },
  { name: 'Rajma (Kidney Beans)', category: 'dal', serving: '1 bowl (150g)', calories: 180, protein_g: 9, carbs_g: 28, fat_g: 3, isVeg: true, isEgg: false },
  { name: 'Chole (Chickpeas)', category: 'dal', serving: '1 bowl (150g)', calories: 200, protein_g: 10, carbs_g: 30, fat_g: 5, isVeg: true, isEgg: false },
  { name: 'Sambhar', category: 'dal', serving: '1 bowl (150ml)', calories: 120, protein_g: 5, carbs_g: 16, fat_g: 4, isVeg: true, isEgg: false },
  { name: 'Rasam', category: 'dal', serving: '1 bowl (150ml)', calories: 50, protein_g: 2, carbs_g: 8, fat_g: 1, isVeg: true, isEgg: false },
  { name: 'Dal Makhani', category: 'dal', serving: '1 bowl (150ml)', calories: 220, protein_g: 8, carbs_g: 22, fat_g: 12, isVeg: true, isEgg: false },
  { name: 'Sprouts (Moong)', category: 'dal', serving: '1 cup (100g)', calories: 65, protein_g: 6, carbs_g: 8, fat_g: 1, isVeg: true, isEgg: false },
  { name: 'Sprouts Chaat', category: 'dal', serving: '1 bowl (150g)', calories: 120, protein_g: 8, carbs_g: 16, fat_g: 2, isVeg: true, isEgg: false },

  // ─── Vegetables ───────────────────────────────────────
  { name: 'Aloo Gobhi', category: 'vegetables', serving: '1 bowl (150g)', calories: 150, protein_g: 3, carbs_g: 20, fat_g: 6, isVeg: true, isEgg: false },
  { name: 'Bhindi Masala', category: 'vegetables', serving: '1 bowl (150g)', calories: 120, protein_g: 3, carbs_g: 12, fat_g: 7, isVeg: true, isEgg: false },
  { name: 'Baingan Bharta', category: 'vegetables', serving: '1 bowl (150g)', calories: 130, protein_g: 3, carbs_g: 14, fat_g: 7, isVeg: true, isEgg: false },
  { name: 'Palak Sabzi', category: 'vegetables', serving: '1 bowl (150g)', calories: 90, protein_g: 4, carbs_g: 8, fat_g: 5, isVeg: true, isEgg: false },
  { name: 'Mixed Veg Curry', category: 'vegetables', serving: '1 bowl (150g)', calories: 140, protein_g: 4, carbs_g: 16, fat_g: 7, isVeg: true, isEgg: false },
  { name: 'Lauki (Bottle Gourd)', category: 'vegetables', serving: '1 bowl (150g)', calories: 60, protein_g: 2, carbs_g: 10, fat_g: 2, isVeg: true, isEgg: false },
  { name: 'Tinda Sabzi', category: 'vegetables', serving: '1 bowl (150g)', calories: 70, protein_g: 2, carbs_g: 10, fat_g: 3, isVeg: true, isEgg: false },
  { name: 'Tori / Zucchini Sabzi', category: 'vegetables', serving: '1 bowl (150g)', calories: 65, protein_g: 2, carbs_g: 8, fat_g: 3, isVeg: true, isEgg: false },
  { name: 'Karela (Bitter Gourd)', category: 'vegetables', serving: '1 bowl (150g)', calories: 80, protein_g: 2, carbs_g: 10, fat_g: 4, isVeg: true, isEgg: false },
  { name: 'Cabbage Sabzi', category: 'vegetables', serving: '1 bowl (150g)', calories: 80, protein_g: 2, carbs_g: 10, fat_g: 4, isVeg: true, isEgg: false },
  { name: 'Beans Sabzi', category: 'vegetables', serving: '1 bowl (150g)', calories: 90, protein_g: 3, carbs_g: 12, fat_g: 4, isVeg: true, isEgg: false },
  { name: 'Matar Paneer', category: 'vegetables', serving: '1 bowl (150g)', calories: 240, protein_g: 12, carbs_g: 14, fat_g: 16, isVeg: true, isEgg: false },
  { name: 'Soya Chunks Curry', category: 'vegetables', serving: '1 bowl (150g)', calories: 180, protein_g: 18, carbs_g: 12, fat_g: 6, isVeg: true, isEgg: false },
  { name: 'Mushroom Masala', category: 'vegetables', serving: '1 bowl (150g)', calories: 120, protein_g: 5, carbs_g: 10, fat_g: 7, isVeg: true, isEgg: false },
  { name: 'Sweet Potato (Boiled)', category: 'vegetables', serving: '1 medium (130g)', calories: 115, protein_g: 2, carbs_g: 27, fat_g: 0, isVeg: true, isEgg: false },
  { name: 'Boiled Potato', category: 'vegetables', serving: '1 medium (130g)', calories: 110, protein_g: 3, carbs_g: 25, fat_g: 0, isVeg: true, isEgg: false },
  { name: 'Corn (Boiled)', category: 'vegetables', serving: '1 cob', calories: 90, protein_g: 3, carbs_g: 18, fat_g: 1, isVeg: true, isEgg: false },

  // ─── Paneer / Dairy ───────────────────────────────────
  { name: 'Paneer (Raw)', category: 'paneer_dairy', serving: '100g', calories: 260, protein_g: 18, carbs_g: 4, fat_g: 20, isVeg: true, isEgg: false },
  { name: 'Paneer Bhurji', category: 'paneer_dairy', serving: '1 bowl (150g)', calories: 280, protein_g: 16, carbs_g: 6, fat_g: 22, isVeg: true, isEgg: false },
  { name: 'Palak Paneer', category: 'paneer_dairy', serving: '1 bowl (150g)', calories: 240, protein_g: 14, carbs_g: 10, fat_g: 17, isVeg: true, isEgg: false },
  { name: 'Paneer Tikka', category: 'paneer_dairy', serving: '6 pcs (120g)', calories: 260, protein_g: 16, carbs_g: 8, fat_g: 18, isVeg: true, isEgg: false },
  { name: 'Shahi Paneer', category: 'paneer_dairy', serving: '1 bowl (150g)', calories: 300, protein_g: 14, carbs_g: 12, fat_g: 22, isVeg: true, isEgg: false },
  { name: 'Paneer Butter Masala', category: 'paneer_dairy', serving: '1 bowl (150g)', calories: 330, protein_g: 14, carbs_g: 14, fat_g: 24, isVeg: true, isEgg: false },
  { name: 'Cottage Cheese (Low Fat)', category: 'paneer_dairy', serving: '100g', calories: 180, protein_g: 20, carbs_g: 4, fat_g: 10, isVeg: true, isEgg: false },
  { name: 'Curd (Plain)', category: 'paneer_dairy', serving: '1 cup (200g)', calories: 120, protein_g: 6, carbs_g: 10, fat_g: 6, isVeg: true, isEgg: false },
  { name: 'Greek Yogurt', category: 'paneer_dairy', serving: '1 cup (200g)', calories: 140, protein_g: 14, carbs_g: 8, fat_g: 5, isVeg: true, isEgg: false },
  { name: 'Buttermilk (Chaas)', category: 'paneer_dairy', serving: '1 glass (200ml)', calories: 40, protein_g: 2, carbs_g: 4, fat_g: 1, isVeg: true, isEgg: false },
  { name: 'Lassi (Sweet)', category: 'paneer_dairy', serving: '1 glass (200ml)', calories: 160, protein_g: 5, carbs_g: 24, fat_g: 5, isVeg: true, isEgg: false },
  { name: 'Milk (Toned)', category: 'paneer_dairy', serving: '1 glass (200ml)', calories: 120, protein_g: 6, carbs_g: 10, fat_g: 6, isVeg: true, isEgg: false },
  { name: 'Milk (Skimmed)', category: 'paneer_dairy', serving: '1 glass (200ml)', calories: 70, protein_g: 7, carbs_g: 10, fat_g: 0.5, isVeg: true, isEgg: false },
  { name: 'Cheese Slice', category: 'paneer_dairy', serving: '1 slice (20g)', calories: 60, protein_g: 4, carbs_g: 1, fat_g: 5, isVeg: true, isEgg: false },
  { name: 'Ghee', category: 'paneer_dairy', serving: '1 tsp (5g)', calories: 45, protein_g: 0, carbs_g: 0, fat_g: 5, isVeg: true, isEgg: false },

  // ─── Chicken / Meat ───────────────────────────────────
  { name: 'Grilled Chicken Breast', category: 'chicken', serving: '100g', calories: 165, protein_g: 31, carbs_g: 0, fat_g: 3.5, isVeg: false, isEgg: false },
  { name: 'Chicken Curry', category: 'chicken', serving: '1 bowl (150g)', calories: 240, protein_g: 22, carbs_g: 8, fat_g: 14, isVeg: false, isEgg: false },
  { name: 'Butter Chicken', category: 'chicken', serving: '1 bowl (150g)', calories: 300, protein_g: 20, carbs_g: 10, fat_g: 20, isVeg: false, isEgg: false },
  { name: 'Chicken Tikka', category: 'chicken', serving: '6 pcs (120g)', calories: 200, protein_g: 26, carbs_g: 4, fat_g: 9, isVeg: false, isEgg: false },
  { name: 'Tandoori Chicken', category: 'chicken', serving: '1 leg pc', calories: 220, protein_g: 24, carbs_g: 4, fat_g: 12, isVeg: false, isEgg: false },
  { name: 'Chicken Keema', category: 'chicken', serving: '1 bowl (150g)', calories: 230, protein_g: 22, carbs_g: 6, fat_g: 13, isVeg: false, isEgg: false },
  { name: 'Chicken Seekh Kebab', category: 'chicken', serving: '2 pcs', calories: 180, protein_g: 20, carbs_g: 4, fat_g: 9, isVeg: false, isEgg: false },
  { name: 'Chicken Salad (Grilled)', category: 'chicken', serving: '1 bowl (200g)', calories: 200, protein_g: 28, carbs_g: 6, fat_g: 8, isVeg: false, isEgg: false },
  { name: 'Mutton Curry', category: 'chicken', serving: '1 bowl (150g)', calories: 280, protein_g: 20, carbs_g: 6, fat_g: 20, isVeg: false, isEgg: false },
  { name: 'Chicken Stir Fry', category: 'chicken', serving: '1 bowl (150g)', calories: 190, protein_g: 24, carbs_g: 8, fat_g: 7, isVeg: false, isEgg: false },

  // ─── Egg ──────────────────────────────────────────────
  { name: 'Boiled Egg (Whole)', category: 'egg', serving: '1 egg', calories: 78, protein_g: 6, carbs_g: 1, fat_g: 5, isVeg: false, isEgg: true },
  { name: 'Boiled Egg White', category: 'egg', serving: '1 egg', calories: 17, protein_g: 4, carbs_g: 0, fat_g: 0, isVeg: false, isEgg: true },
  { name: 'Omelette (2 Eggs)', category: 'egg', serving: '1 pc', calories: 180, protein_g: 12, carbs_g: 2, fat_g: 14, isVeg: false, isEgg: true },
  { name: 'Egg Bhurji', category: 'egg', serving: '2 eggs', calories: 200, protein_g: 13, carbs_g: 4, fat_g: 15, isVeg: false, isEgg: true },
  { name: 'Egg Curry', category: 'egg', serving: '2 eggs + gravy', calories: 240, protein_g: 14, carbs_g: 8, fat_g: 17, isVeg: false, isEgg: true },
  { name: 'Masala Omelette', category: 'egg', serving: '2 eggs', calories: 200, protein_g: 13, carbs_g: 4, fat_g: 15, isVeg: false, isEgg: true },
  { name: 'Egg Fried Rice', category: 'egg', serving: '1 plate (200g)', calories: 300, protein_g: 10, carbs_g: 42, fat_g: 10, isVeg: false, isEgg: true },
  { name: 'Scotch Egg', category: 'egg', serving: '1 pc', calories: 220, protein_g: 14, carbs_g: 10, fat_g: 14, isVeg: false, isEgg: true },

  // ─── Fish / Seafood ───────────────────────────────────
  { name: 'Fish Curry (Pomfret)', category: 'fish_seafood', serving: '1 bowl (150g)', calories: 200, protein_g: 22, carbs_g: 6, fat_g: 10, isVeg: false, isEgg: false },
  { name: 'Grilled Fish (Surmai)', category: 'fish_seafood', serving: '100g', calories: 140, protein_g: 24, carbs_g: 0, fat_g: 5, isVeg: false, isEgg: false },
  { name: 'Fish Fry', category: 'fish_seafood', serving: '1 pc (100g)', calories: 200, protein_g: 20, carbs_g: 8, fat_g: 10, isVeg: false, isEgg: false },
  { name: 'Prawn Masala', category: 'fish_seafood', serving: '1 bowl (150g)', calories: 180, protein_g: 20, carbs_g: 6, fat_g: 9, isVeg: false, isEgg: false },
  { name: 'Tuna (Canned)', category: 'fish_seafood', serving: '100g', calories: 120, protein_g: 26, carbs_g: 0, fat_g: 1, isVeg: false, isEgg: false },
  { name: 'Salmon (Grilled)', category: 'fish_seafood', serving: '100g', calories: 180, protein_g: 25, carbs_g: 0, fat_g: 8, isVeg: false, isEgg: false },

  // ─── Snacks ───────────────────────────────────────────
  { name: 'Vada Pav', category: 'snacks', serving: '1 pc', calories: 280, protein_g: 6, carbs_g: 38, fat_g: 12, isVeg: true, isEgg: false },
  { name: 'Samosa', category: 'snacks', serving: '1 pc', calories: 250, protein_g: 4, carbs_g: 28, fat_g: 14, isVeg: true, isEgg: false },
  { name: 'Kachori', category: 'snacks', serving: '1 pc', calories: 220, protein_g: 4, carbs_g: 24, fat_g: 12, isVeg: true, isEgg: false },
  { name: 'Dhokla', category: 'snacks', serving: '3 pcs', calories: 140, protein_g: 5, carbs_g: 22, fat_g: 3, isVeg: true, isEgg: false },
  { name: 'Thepla', category: 'snacks', serving: '1 pc', calories: 110, protein_g: 3, carbs_g: 16, fat_g: 4, isVeg: true, isEgg: false },
  { name: 'Khakhra', category: 'snacks', serving: '2 pcs', calories: 80, protein_g: 2, carbs_g: 14, fat_g: 2, isVeg: true, isEgg: false },
  { name: 'Peanut Chaat', category: 'snacks', serving: '1 cup', calories: 200, protein_g: 8, carbs_g: 12, fat_g: 14, isVeg: true, isEgg: false },
  { name: 'Makhana (Roasted)', category: 'snacks', serving: '1 cup (30g)', calories: 100, protein_g: 3, carbs_g: 18, fat_g: 1, isVeg: true, isEgg: false },
  { name: 'Dry Fruits Mix', category: 'snacks', serving: '30g', calories: 160, protein_g: 4, carbs_g: 8, fat_g: 14, isVeg: true, isEgg: false },
  { name: 'Almonds', category: 'snacks', serving: '10 pcs (14g)', calories: 80, protein_g: 3, carbs_g: 2, fat_g: 7, isVeg: true, isEgg: false },
  { name: 'Walnuts', category: 'snacks', serving: '5 halves (15g)', calories: 100, protein_g: 2, carbs_g: 2, fat_g: 9, isVeg: true, isEgg: false },
  { name: 'Peanuts (Roasted)', category: 'snacks', serving: '30g', calories: 170, protein_g: 7, carbs_g: 5, fat_g: 14, isVeg: true, isEgg: false },
  { name: 'Peanut Butter Toast', category: 'snacks', serving: '1 slice + 1 tbsp', calories: 190, protein_g: 7, carbs_g: 16, fat_g: 11, isVeg: true, isEgg: false },
  { name: 'Protein Bar', category: 'snacks', serving: '1 bar (50g)', calories: 200, protein_g: 20, carbs_g: 22, fat_g: 6, isVeg: true, isEgg: false },

  // ─── Fruits ───────────────────────────────────────────
  { name: 'Banana', category: 'fruits', serving: '1 medium', calories: 105, protein_g: 1, carbs_g: 27, fat_g: 0, isVeg: true, isEgg: false },
  { name: 'Apple', category: 'fruits', serving: '1 medium', calories: 95, protein_g: 0.5, carbs_g: 25, fat_g: 0, isVeg: true, isEgg: false },
  { name: 'Orange', category: 'fruits', serving: '1 medium', calories: 65, protein_g: 1, carbs_g: 15, fat_g: 0, isVeg: true, isEgg: false },
  { name: 'Papaya', category: 'fruits', serving: '1 cup (150g)', calories: 60, protein_g: 1, carbs_g: 15, fat_g: 0, isVeg: true, isEgg: false },
  { name: 'Watermelon', category: 'fruits', serving: '1 cup (150g)', calories: 45, protein_g: 1, carbs_g: 11, fat_g: 0, isVeg: true, isEgg: false },
  { name: 'Mango', category: 'fruits', serving: '1 cup (150g)', calories: 100, protein_g: 1, carbs_g: 25, fat_g: 0.5, isVeg: true, isEgg: false },
  { name: 'Guava', category: 'fruits', serving: '1 medium', calories: 70, protein_g: 3, carbs_g: 14, fat_g: 1, isVeg: true, isEgg: false },
  { name: 'Pomegranate', category: 'fruits', serving: '1/2 cup seeds', calories: 65, protein_g: 1, carbs_g: 16, fat_g: 0.5, isVeg: true, isEgg: false },
  { name: 'Grapes', category: 'fruits', serving: '1 cup (150g)', calories: 100, protein_g: 1, carbs_g: 26, fat_g: 0, isVeg: true, isEgg: false },
  { name: 'Pineapple', category: 'fruits', serving: '1 cup (150g)', calories: 75, protein_g: 1, carbs_g: 20, fat_g: 0, isVeg: true, isEgg: false },
  { name: 'Mixed Fruit Bowl', category: 'fruits', serving: '1 bowl (200g)', calories: 120, protein_g: 1, carbs_g: 30, fat_g: 0.5, isVeg: true, isEgg: false },
  { name: 'Dates (Khajoor)', category: 'fruits', serving: '3 pcs', calories: 70, protein_g: 1, carbs_g: 18, fat_g: 0, isVeg: true, isEgg: false },

  // ─── Beverages ────────────────────────────────────────
  { name: 'Tea (No Sugar)', category: 'beverages', serving: '1 cup', calories: 5, protein_g: 0, carbs_g: 1, fat_g: 0, isVeg: true, isEgg: false },
  { name: 'Tea with Milk', category: 'beverages', serving: '1 cup', calories: 50, protein_g: 2, carbs_g: 6, fat_g: 2, isVeg: true, isEgg: false },
  { name: 'Green Tea', category: 'beverages', serving: '1 cup', calories: 2, protein_g: 0, carbs_g: 0, fat_g: 0, isVeg: true, isEgg: false },
  { name: 'Black Coffee', category: 'beverages', serving: '1 cup', calories: 5, protein_g: 0, carbs_g: 0, fat_g: 0, isVeg: true, isEgg: false },
  { name: 'Coffee with Milk', category: 'beverages', serving: '1 cup', calories: 60, protein_g: 2, carbs_g: 6, fat_g: 3, isVeg: true, isEgg: false },
  { name: 'Coconut Water', category: 'beverages', serving: '1 glass (200ml)', calories: 45, protein_g: 1, carbs_g: 10, fat_g: 0, isVeg: true, isEgg: false },
  { name: 'Fresh Lime Water', category: 'beverages', serving: '1 glass', calories: 15, protein_g: 0, carbs_g: 4, fat_g: 0, isVeg: true, isEgg: false },
  { name: 'Jaljeera', category: 'beverages', serving: '1 glass', calories: 20, protein_g: 0, carbs_g: 5, fat_g: 0, isVeg: true, isEgg: false },
  { name: 'Aam Panna', category: 'beverages', serving: '1 glass', calories: 90, protein_g: 0, carbs_g: 22, fat_g: 0, isVeg: true, isEgg: false },

  // ─── Salads ───────────────────────────────────────────
  { name: 'Cucumber Salad', category: 'salads', serving: '1 bowl (150g)', calories: 25, protein_g: 1, carbs_g: 5, fat_g: 0, isVeg: true, isEgg: false },
  { name: 'Green Salad', category: 'salads', serving: '1 bowl (150g)', calories: 35, protein_g: 2, carbs_g: 6, fat_g: 0.5, isVeg: true, isEgg: false },
  { name: 'Kachumber Salad', category: 'salads', serving: '1 bowl (150g)', calories: 40, protein_g: 1, carbs_g: 8, fat_g: 0.5, isVeg: true, isEgg: false },
  { name: 'Raita (Boondi)', category: 'salads', serving: '1 bowl (100g)', calories: 80, protein_g: 3, carbs_g: 8, fat_g: 4, isVeg: true, isEgg: false },
  { name: 'Cucumber Raita', category: 'salads', serving: '1 bowl (100g)', calories: 50, protein_g: 3, carbs_g: 5, fat_g: 2, isVeg: true, isEgg: false },
  { name: 'Onion-Tomato Salad', category: 'salads', serving: '1 bowl (100g)', calories: 30, protein_g: 1, carbs_g: 6, fat_g: 0, isVeg: true, isEgg: false },

  // ─── Sweets ───────────────────────────────────────────
  { name: 'Gulab Jamun', category: 'sweets', serving: '1 pc', calories: 150, protein_g: 2, carbs_g: 22, fat_g: 6, isVeg: true, isEgg: false },
  { name: 'Rasgulla', category: 'sweets', serving: '1 pc', calories: 120, protein_g: 2, carbs_g: 22, fat_g: 3, isVeg: true, isEgg: false },
  { name: 'Kheer (Rice)', category: 'sweets', serving: '1 bowl (120g)', calories: 200, protein_g: 4, carbs_g: 30, fat_g: 7, isVeg: true, isEgg: false },
  { name: 'Jaggery (Gur)', category: 'sweets', serving: '1 tbsp (15g)', calories: 40, protein_g: 0, carbs_g: 10, fat_g: 0, isVeg: true, isEgg: false },
  { name: 'Dark Chocolate', category: 'sweets', serving: '2 squares (20g)', calories: 110, protein_g: 1, carbs_g: 12, fat_g: 7, isVeg: true, isEgg: false },
  { name: 'Honey', category: 'sweets', serving: '1 tbsp (20g)', calories: 60, protein_g: 0, carbs_g: 16, fat_g: 0, isVeg: true, isEgg: false },

  // ─── Supplements ──────────────────────────────────────
  { name: 'Whey Protein Shake', category: 'supplements', serving: '1 scoop (30g)', calories: 120, protein_g: 24, carbs_g: 3, fat_g: 1, isVeg: true, isEgg: false },
  { name: 'Mass Gainer Shake', category: 'supplements', serving: '1 scoop (75g)', calories: 300, protein_g: 15, carbs_g: 55, fat_g: 3, isVeg: true, isEgg: false },
  { name: 'BCAA Drink', category: 'supplements', serving: '1 serving (10g)', calories: 10, protein_g: 0, carbs_g: 2, fat_g: 0, isVeg: true, isEgg: false },
  { name: 'Protein Smoothie', category: 'supplements', serving: '1 glass (300ml)', calories: 250, protein_g: 20, carbs_g: 30, fat_g: 5, isVeg: true, isEgg: false },
  { name: 'Peanut Butter Protein Shake', category: 'supplements', serving: '1 glass (300ml)', calories: 320, protein_g: 28, carbs_g: 18, fat_g: 14, isVeg: true, isEgg: false },
  { name: 'Banana Protein Shake', category: 'supplements', serving: '1 glass (300ml)', calories: 280, protein_g: 26, carbs_g: 32, fat_g: 4, isVeg: true, isEgg: false },
];
