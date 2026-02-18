-- =============================================================
-- FitFlow Feature Tables Migration
-- Tables: gym_expenses, gym_membership_freezes, gym_diet_plans,
--         gym_member_diet_assignments, gym_workout_plans,
--         gym_member_workout_assignments
-- =============================================================

-- 1. EXPENSES TABLE
CREATE TABLE IF NOT EXISTS gym_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id UUID NOT NULL REFERENCES gym_gyms(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('rent', 'electricity', 'salary', 'equipment', 'maintenance', 'marketing', 'supplements', 'other')),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'upi', 'card', 'bank_transfer')) DEFAULT 'cash',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE gym_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gym_expenses_select" ON gym_expenses
  FOR SELECT USING (gym_id IN (SELECT gym_id FROM gym_users WHERE auth_user_id = auth.uid()));

CREATE POLICY "gym_expenses_insert" ON gym_expenses
  FOR INSERT WITH CHECK (gym_id IN (SELECT gym_id FROM gym_users WHERE auth_user_id = auth.uid()));

CREATE POLICY "gym_expenses_update" ON gym_expenses
  FOR UPDATE USING (gym_id IN (SELECT gym_id FROM gym_users WHERE auth_user_id = auth.uid()));

CREATE POLICY "gym_expenses_delete" ON gym_expenses
  FOR DELETE USING (gym_id IN (SELECT gym_id FROM gym_users WHERE auth_user_id = auth.uid()));

CREATE INDEX idx_gym_expenses_gym_date ON gym_expenses(gym_id, expense_date);


-- 2. MEMBERSHIP FREEZES TABLE
CREATE TABLE IF NOT EXISTS gym_membership_freezes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id UUID NOT NULL REFERENCES gym_gyms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
  freeze_start DATE NOT NULL DEFAULT CURRENT_DATE,
  freeze_end DATE,
  freeze_days INTEGER,
  reason TEXT,
  original_end_date DATE,
  original_next_due DATE,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE gym_membership_freezes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gym_freezes_select" ON gym_membership_freezes
  FOR SELECT USING (gym_id IN (SELECT gym_id FROM gym_users WHERE auth_user_id = auth.uid()));

CREATE POLICY "gym_freezes_insert" ON gym_membership_freezes
  FOR INSERT WITH CHECK (gym_id IN (SELECT gym_id FROM gym_users WHERE auth_user_id = auth.uid()));

CREATE POLICY "gym_freezes_update" ON gym_membership_freezes
  FOR UPDATE USING (gym_id IN (SELECT gym_id FROM gym_users WHERE auth_user_id = auth.uid()));

CREATE INDEX idx_gym_freezes_member ON gym_membership_freezes(member_id, is_active);


-- 3. DIET PLANS TABLE
CREATE TABLE IF NOT EXISTS gym_diet_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id UUID NOT NULL REFERENCES gym_gyms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  goal TEXT NOT NULL CHECK (goal IN ('weight_loss', 'muscle_gain', 'maintenance', 'general_fitness', 'toning')),
  diet_type TEXT NOT NULL CHECK (diet_type IN ('vegetarian', 'non_vegetarian', 'eggetarian')),
  target_calories INTEGER,
  protein_g INTEGER,
  carbs_g INTEGER,
  fat_g INTEGER,
  meals JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  is_template BOOLEAN DEFAULT false NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE gym_diet_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gym_diet_plans_select" ON gym_diet_plans
  FOR SELECT USING (gym_id IN (SELECT gym_id FROM gym_users WHERE auth_user_id = auth.uid()));

CREATE POLICY "gym_diet_plans_insert" ON gym_diet_plans
  FOR INSERT WITH CHECK (gym_id IN (SELECT gym_id FROM gym_users WHERE auth_user_id = auth.uid()));

CREATE POLICY "gym_diet_plans_update" ON gym_diet_plans
  FOR UPDATE USING (gym_id IN (SELECT gym_id FROM gym_users WHERE auth_user_id = auth.uid()));

CREATE INDEX idx_gym_diet_plans_gym ON gym_diet_plans(gym_id, is_active);


-- 4. DIET PLAN ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS gym_member_diet_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id UUID NOT NULL REFERENCES gym_gyms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
  diet_plan_id UUID NOT NULL REFERENCES gym_diet_plans(id) ON DELETE CASCADE,
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_date DATE,
  end_date DATE,
  notes TEXT,
  assigned_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE gym_member_diet_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gym_diet_assign_select" ON gym_member_diet_assignments
  FOR SELECT USING (gym_id IN (SELECT gym_id FROM gym_users WHERE auth_user_id = auth.uid()));

CREATE POLICY "gym_diet_assign_insert" ON gym_member_diet_assignments
  FOR INSERT WITH CHECK (gym_id IN (SELECT gym_id FROM gym_users WHERE auth_user_id = auth.uid()));

CREATE POLICY "gym_diet_assign_update" ON gym_member_diet_assignments
  FOR UPDATE USING (gym_id IN (SELECT gym_id FROM gym_users WHERE auth_user_id = auth.uid()));

CREATE INDEX idx_gym_diet_assign_member ON gym_member_diet_assignments(member_id, is_active);


-- 5. WORKOUT PLANS TABLE
CREATE TABLE IF NOT EXISTS gym_workout_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id UUID NOT NULL REFERENCES gym_gyms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  goal TEXT NOT NULL CHECK (goal IN ('strength', 'hypertrophy', 'fat_loss', 'endurance', 'general_fitness')),
  level TEXT NOT NULL CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  days_per_week INTEGER NOT NULL CHECK (days_per_week BETWEEN 1 AND 7),
  duration_weeks INTEGER,
  days JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  is_template BOOLEAN DEFAULT false NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE gym_workout_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gym_workout_plans_select" ON gym_workout_plans
  FOR SELECT USING (gym_id IN (SELECT gym_id FROM gym_users WHERE auth_user_id = auth.uid()));

CREATE POLICY "gym_workout_plans_insert" ON gym_workout_plans
  FOR INSERT WITH CHECK (gym_id IN (SELECT gym_id FROM gym_users WHERE auth_user_id = auth.uid()));

CREATE POLICY "gym_workout_plans_update" ON gym_workout_plans
  FOR UPDATE USING (gym_id IN (SELECT gym_id FROM gym_users WHERE auth_user_id = auth.uid()));

CREATE INDEX idx_gym_workout_plans_gym ON gym_workout_plans(gym_id, is_active);


-- 6. WORKOUT PLAN ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS gym_member_workout_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id UUID NOT NULL REFERENCES gym_gyms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
  workout_plan_id UUID NOT NULL REFERENCES gym_workout_plans(id) ON DELETE CASCADE,
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_date DATE,
  end_date DATE,
  notes TEXT,
  assigned_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE gym_member_workout_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gym_workout_assign_select" ON gym_member_workout_assignments
  FOR SELECT USING (gym_id IN (SELECT gym_id FROM gym_users WHERE auth_user_id = auth.uid()));

CREATE POLICY "gym_workout_assign_insert" ON gym_member_workout_assignments
  FOR INSERT WITH CHECK (gym_id IN (SELECT gym_id FROM gym_users WHERE auth_user_id = auth.uid()));

CREATE POLICY "gym_workout_assign_update" ON gym_member_workout_assignments
  FOR UPDATE USING (gym_id IN (SELECT gym_id FROM gym_users WHERE auth_user_id = auth.uid()));

CREATE INDEX idx_gym_workout_assign_member ON gym_member_workout_assignments(member_id, is_active);
