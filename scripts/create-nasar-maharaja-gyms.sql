-- ==========================================
-- CREATE NASAR'S GYM & MAHARAJA'S GYM
-- Demo Accounts - Run in Supabase SQL Editor
-- Created: December 5, 2025
-- ==========================================

-- ==========================================
-- PART 1: NASAR'S GYM
-- ==========================================

-- Step 1A: Create Nasar's Gym record
INSERT INTO gym_gyms (id, name, email, phone, language, timezone, currency)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-nasar0000001',
  'Nasar''s Gym',
  'nasar@fitflow.demo',
  '9876500006',
  'en',
  'Asia/Kolkata',
  'INR'
)
ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
RETURNING id;

-- Step 1B: Create Maharaja's Gym record  
INSERT INTO gym_gyms (id, name, email, phone, language, timezone, currency)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-maharaja0001',
  'Maharaja''s Gym',
  'maharaja@fitflow.demo',
  '9876500007',
  'en',
  'Asia/Kolkata',
  'INR'
)
ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
RETURNING id;

-- ==========================================
-- INSTRUCTIONS FOR AUTH USERS:
-- ==========================================
-- Go to Supabase Dashboard > Authentication > Users
-- Create TWO new users:
--
-- User 1:
--   Email: nasar@fitflow.demo
--   Password: Demo@123
--   (Copy the UUID after creation)
--
-- User 2:
--   Email: maharaja@fitflow.demo  
--   Password: Demo@123
--   (Copy the UUID after creation)
-- ==========================================

-- After creating auth users, get their IDs and the gym IDs:
-- SELECT id FROM auth.users WHERE email IN ('nasar@fitflow.demo', 'maharaja@fitflow.demo');
-- SELECT id FROM gym_gyms WHERE email IN ('nasar@fitflow.demo', 'maharaja@fitflow.demo');

-- ==========================================
-- STEP 2: LINK AUTH USERS TO GYMS
-- Replace the UUIDs below with actual values
-- ==========================================

-- For Nasar's Gym (replace AUTH_USER_ID with actual UUID from Supabase Auth)
-- INSERT INTO gym_users (gym_id, auth_user_id, email, full_name, role)
-- VALUES (
--   (SELECT id FROM gym_gyms WHERE email = 'nasar@fitflow.demo'),
--   'AUTH_USER_ID_HERE',
--   'nasar@fitflow.demo',
--   'Nasar',
--   'owner'
-- );

-- For Maharaja's Gym (replace AUTH_USER_ID with actual UUID from Supabase Auth)
-- INSERT INTO gym_users (gym_id, auth_user_id, email, full_name, role)
-- VALUES (
--   (SELECT id FROM gym_gyms WHERE email = 'maharaja@fitflow.demo'),
--   'AUTH_USER_ID_HERE',
--   'maharaja@fitflow.demo',
--   'Maharaja',
--   'owner'
-- );

-- ==========================================
-- STEP 3: CREATE MEMBERSHIP PLANS
-- ==========================================

-- Nasar's Gym Plans
INSERT INTO gym_membership_plans (gym_id, name, description, price, duration_days, duration_months, billing_cycle, is_active)
SELECT 
  id,
  plan.name,
  plan.description,
  plan.price,
  plan.duration_days,
  plan.duration_months,
  plan.billing_cycle,
  true
FROM gym_gyms, 
(VALUES 
  ('Monthly', 'Monthly membership', 1000, 30, 1, 'monthly'),
  ('Quarterly', 'Quarterly membership', 2500, 90, 3, 'quarterly'),
  ('Half Yearly', 'Half yearly membership', 4500, 180, 6, 'half_yearly'),
  ('Yearly', 'Annual membership', 8000, 365, 12, 'annual')
) AS plan(name, description, price, duration_days, duration_months, billing_cycle)
WHERE gym_gyms.email = 'nasar@fitflow.demo'
ON CONFLICT DO NOTHING;

-- Maharaja's Gym Plans
INSERT INTO gym_membership_plans (gym_id, name, description, price, duration_days, duration_months, billing_cycle, is_active)
SELECT 
  id,
  plan.name,
  plan.description,
  plan.price,
  plan.duration_days,
  plan.duration_months,
  plan.billing_cycle,
  true
FROM gym_gyms, 
(VALUES 
  ('Monthly', 'Monthly membership', 1000, 30, 1, 'monthly'),
  ('Quarterly', 'Quarterly membership', 2500, 90, 3, 'quarterly'),
  ('Half Yearly', 'Half yearly membership', 4500, 180, 6, 'half_yearly'),
  ('Yearly', 'Annual membership', 8000, 365, 12, 'annual')
) AS plan(name, description, price, duration_days, duration_months, billing_cycle)
WHERE gym_gyms.email = 'maharaja@fitflow.demo'
ON CONFLICT DO NOTHING;

-- ==========================================
-- STEP 4: CREATE 25 MEMBERS FOR NASAR'S GYM
-- All joined in November 2025
-- Monthly members due Dec 1-10 (spread across dates)
-- ==========================================

DO $$
DECLARE
  nasar_gym_id UUID;
  maharaja_gym_id UUID;
  monthly_plan_id_nasar UUID;
  quarterly_plan_id_nasar UUID;
  monthly_plan_id_maharaja UUID;
  quarterly_plan_id_maharaja UUID;
  member_id UUID;
  i INT;
BEGIN
  -- Get gym IDs
  SELECT id INTO nasar_gym_id FROM gym_gyms WHERE email = 'nasar@fitflow.demo';
  SELECT id INTO maharaja_gym_id FROM gym_gyms WHERE email = 'maharaja@fitflow.demo';
  
  -- Get plan IDs for Nasar's Gym
  SELECT id INTO monthly_plan_id_nasar FROM gym_membership_plans 
    WHERE gym_id = nasar_gym_id AND billing_cycle = 'monthly' LIMIT 1;
  SELECT id INTO quarterly_plan_id_nasar FROM gym_membership_plans 
    WHERE gym_id = nasar_gym_id AND billing_cycle = 'quarterly' LIMIT 1;
    
  -- Get plan IDs for Maharaja's Gym
  SELECT id INTO monthly_plan_id_maharaja FROM gym_membership_plans 
    WHERE gym_id = maharaja_gym_id AND billing_cycle = 'monthly' LIMIT 1;
  SELECT id INTO quarterly_plan_id_maharaja FROM gym_membership_plans 
    WHERE gym_id = maharaja_gym_id AND billing_cycle = 'quarterly' LIMIT 1;

  -- ==========================================
  -- NASAR'S GYM MEMBERS (25 total)
  -- ==========================================
  
  -- Members due Dec 1 (OVERDUE - 4 members)
  FOR i IN 1..4 LOOP
    INSERT INTO gym_members (
      gym_id, full_name, email, phone, gender, status,
      membership_plan, plan_id, plan_amount,
      joining_date, membership_start_date, membership_end_date,
      next_payment_due_date, total_payments_received, payment_status,
      first_joining_date, total_periods, lifetime_value
    ) VALUES (
      nasar_gym_id,
      'Nasar Member ' || i,
      'nasar.member' || i || '@demo.com',
      '98765' || LPAD(i::text, 5, '0'),
      CASE WHEN i % 2 = 0 THEN 'female' ELSE 'male' END,
      'active',
      'monthly',
      monthly_plan_id_nasar,
      1000,
      '2025-11-01'::date,
      '2025-11-01'::date,
      '2025-12-01'::date,
      '2025-12-01'::date,
      1000,
      'overdue',
      '2025-11-01'::date,
      1,
      1000
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Members due Dec 2-4 (OVERDUE - 4 members)
  FOR i IN 5..8 LOOP
    INSERT INTO gym_members (
      gym_id, full_name, email, phone, gender, status,
      membership_plan, plan_id, plan_amount,
      joining_date, membership_start_date, membership_end_date,
      next_payment_due_date, total_payments_received, payment_status,
      first_joining_date, total_periods, lifetime_value
    ) VALUES (
      nasar_gym_id,
      'Nasar Member ' || i,
      'nasar.member' || i || '@demo.com',
      '98765' || LPAD(i::text, 5, '0'),
      CASE WHEN i % 2 = 0 THEN 'female' ELSE 'male' END,
      'active',
      'monthly',
      monthly_plan_id_nasar,
      1000,
      ('2025-11-0' || ((i - 4)))::date,
      ('2025-11-0' || ((i - 4)))::date,
      ('2025-12-0' || ((i - 4)))::date,
      ('2025-12-0' || ((i - 4)))::date,
      1000,
      'overdue',
      ('2025-11-0' || ((i - 4)))::date,
      1,
      1000
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Members due Dec 5 (DUE TODAY - 2 members)
  FOR i IN 9..10 LOOP
    INSERT INTO gym_members (
      gym_id, full_name, email, phone, gender, status,
      membership_plan, plan_id, plan_amount,
      joining_date, membership_start_date, membership_end_date,
      next_payment_due_date, total_payments_received, payment_status,
      first_joining_date, total_periods, lifetime_value
    ) VALUES (
      nasar_gym_id,
      'Nasar Member ' || i,
      'nasar.member' || i || '@demo.com',
      '98765' || LPAD(i::text, 5, '0'),
      CASE WHEN i % 2 = 0 THEN 'female' ELSE 'male' END,
      'active',
      'monthly',
      monthly_plan_id_nasar,
      1000,
      '2025-11-05'::date,
      '2025-11-05'::date,
      '2025-12-05'::date,
      '2025-12-05'::date,
      1000,
      'due',
      '2025-11-05'::date,
      1,
      1000
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Members due Dec 6-10 (UPCOMING - 6 members)
  FOR i IN 11..16 LOOP
    INSERT INTO gym_members (
      gym_id, full_name, email, phone, gender, status,
      membership_plan, plan_id, plan_amount,
      joining_date, membership_start_date, membership_end_date,
      next_payment_due_date, total_payments_received, payment_status,
      first_joining_date, total_periods, lifetime_value
    ) VALUES (
      nasar_gym_id,
      'Nasar Member ' || i,
      'nasar.member' || i || '@demo.com',
      '98765' || LPAD(i::text, 5, '0'),
      CASE WHEN i % 2 = 0 THEN 'female' ELSE 'male' END,
      'active',
      'monthly',
      monthly_plan_id_nasar,
      1000,
      ('2025-11-' || LPAD(((i - 10) + 5)::text, 2, '0'))::date,
      ('2025-11-' || LPAD(((i - 10) + 5)::text, 2, '0'))::date,
      ('2025-12-' || LPAD(((i - 10) + 5)::text, 2, '0'))::date,
      ('2025-12-' || LPAD(((i - 10) + 5)::text, 2, '0'))::date,
      1000,
      'upcoming',
      ('2025-11-' || LPAD(((i - 10) + 5)::text, 2, '0'))::date,
      1,
      1000
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Quarterly members (due Feb 2026 - 9 members)
  FOR i IN 17..25 LOOP
    INSERT INTO gym_members (
      gym_id, full_name, email, phone, gender, status,
      membership_plan, plan_id, plan_amount,
      joining_date, membership_start_date, membership_end_date,
      next_payment_due_date, total_payments_received, payment_status,
      first_joining_date, total_periods, lifetime_value
    ) VALUES (
      nasar_gym_id,
      'Nasar Member ' || i,
      'nasar.member' || i || '@demo.com',
      '98765' || LPAD(i::text, 5, '0'),
      CASE WHEN i % 2 = 0 THEN 'female' ELSE 'male' END,
      'active',
      'quarterly',
      quarterly_plan_id_nasar,
      2500,
      ('2025-11-' || LPAD((i - 16)::text, 2, '0'))::date,
      ('2025-11-' || LPAD((i - 16)::text, 2, '0'))::date,
      ('2026-02-' || LPAD((i - 16)::text, 2, '0'))::date,
      ('2026-02-' || LPAD((i - 16)::text, 2, '0'))::date,
      2500,
      'paid',
      ('2025-11-' || LPAD((i - 16)::text, 2, '0'))::date,
      1,
      2500
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- ==========================================
  -- MAHARAJA'S GYM MEMBERS (25 total)
  -- ==========================================
  
  -- Members due Dec 1 (OVERDUE - 4 members)
  FOR i IN 1..4 LOOP
    INSERT INTO gym_members (
      gym_id, full_name, email, phone, gender, status,
      membership_plan, plan_id, plan_amount,
      joining_date, membership_start_date, membership_end_date,
      next_payment_due_date, total_payments_received, payment_status,
      first_joining_date, total_periods, lifetime_value
    ) VALUES (
      maharaja_gym_id,
      'Maharaja Member ' || i,
      'maharaja.member' || i || '@demo.com',
      '98766' || LPAD(i::text, 5, '0'),
      CASE WHEN i % 2 = 0 THEN 'female' ELSE 'male' END,
      'active',
      'monthly',
      monthly_plan_id_maharaja,
      1000,
      '2025-11-01'::date,
      '2025-11-01'::date,
      '2025-12-01'::date,
      '2025-12-01'::date,
      1000,
      'overdue',
      '2025-11-01'::date,
      1,
      1000
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Members due Dec 2-4 (OVERDUE - 4 members)
  FOR i IN 5..8 LOOP
    INSERT INTO gym_members (
      gym_id, full_name, email, phone, gender, status,
      membership_plan, plan_id, plan_amount,
      joining_date, membership_start_date, membership_end_date,
      next_payment_due_date, total_payments_received, payment_status,
      first_joining_date, total_periods, lifetime_value
    ) VALUES (
      maharaja_gym_id,
      'Maharaja Member ' || i,
      'maharaja.member' || i || '@demo.com',
      '98766' || LPAD(i::text, 5, '0'),
      CASE WHEN i % 2 = 0 THEN 'female' ELSE 'male' END,
      'active',
      'monthly',
      monthly_plan_id_maharaja,
      1000,
      ('2025-11-0' || ((i - 4)))::date,
      ('2025-11-0' || ((i - 4)))::date,
      ('2025-12-0' || ((i - 4)))::date,
      ('2025-12-0' || ((i - 4)))::date,
      1000,
      'overdue',
      ('2025-11-0' || ((i - 4)))::date,
      1,
      1000
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Members due Dec 5 (DUE TODAY - 2 members)
  FOR i IN 9..10 LOOP
    INSERT INTO gym_members (
      gym_id, full_name, email, phone, gender, status,
      membership_plan, plan_id, plan_amount,
      joining_date, membership_start_date, membership_end_date,
      next_payment_due_date, total_payments_received, payment_status,
      first_joining_date, total_periods, lifetime_value
    ) VALUES (
      maharaja_gym_id,
      'Maharaja Member ' || i,
      'maharaja.member' || i || '@demo.com',
      '98766' || LPAD(i::text, 5, '0'),
      CASE WHEN i % 2 = 0 THEN 'female' ELSE 'male' END,
      'active',
      'monthly',
      monthly_plan_id_maharaja,
      1000,
      '2025-11-05'::date,
      '2025-11-05'::date,
      '2025-12-05'::date,
      '2025-12-05'::date,
      1000,
      'due',
      '2025-11-05'::date,
      1,
      1000
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Members due Dec 6-10 (UPCOMING - 6 members)
  FOR i IN 11..16 LOOP
    INSERT INTO gym_members (
      gym_id, full_name, email, phone, gender, status,
      membership_plan, plan_id, plan_amount,
      joining_date, membership_start_date, membership_end_date,
      next_payment_due_date, total_payments_received, payment_status,
      first_joining_date, total_periods, lifetime_value
    ) VALUES (
      maharaja_gym_id,
      'Maharaja Member ' || i,
      'maharaja.member' || i || '@demo.com',
      '98766' || LPAD(i::text, 5, '0'),
      CASE WHEN i % 2 = 0 THEN 'female' ELSE 'male' END,
      'active',
      'monthly',
      monthly_plan_id_maharaja,
      1000,
      ('2025-11-' || LPAD(((i - 10) + 5)::text, 2, '0'))::date,
      ('2025-11-' || LPAD(((i - 10) + 5)::text, 2, '0'))::date,
      ('2025-12-' || LPAD(((i - 10) + 5)::text, 2, '0'))::date,
      ('2025-12-' || LPAD(((i - 10) + 5)::text, 2, '0'))::date,
      1000,
      'upcoming',
      ('2025-11-' || LPAD(((i - 10) + 5)::text, 2, '0'))::date,
      1,
      1000
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Quarterly members (due Feb 2026 - 9 members)
  FOR i IN 17..25 LOOP
    INSERT INTO gym_members (
      gym_id, full_name, email, phone, gender, status,
      membership_plan, plan_id, plan_amount,
      joining_date, membership_start_date, membership_end_date,
      next_payment_due_date, total_payments_received, payment_status,
      first_joining_date, total_periods, lifetime_value
    ) VALUES (
      maharaja_gym_id,
      'Maharaja Member ' || i,
      'maharaja.member' || i || '@demo.com',
      '98766' || LPAD(i::text, 5, '0'),
      CASE WHEN i % 2 = 0 THEN 'female' ELSE 'male' END,
      'active',
      'quarterly',
      quarterly_plan_id_maharaja,
      2500,
      ('2025-11-' || LPAD((i - 16)::text, 2, '0'))::date,
      ('2025-11-' || LPAD((i - 16)::text, 2, '0'))::date,
      ('2026-02-' || LPAD((i - 16)::text, 2, '0'))::date,
      ('2026-02-' || LPAD((i - 16)::text, 2, '0'))::date,
      2500,
      'paid',
      ('2025-11-' || LPAD((i - 16)::text, 2, '0'))::date,
      1,
      2500
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

END $$;

-- ==========================================
-- STEP 5: CREATE PAYMENT RECORDS (November 2025)
-- Initial joining payments for all members
-- ==========================================

-- Nasar's Gym November Payments
INSERT INTO gym_payments (
  gym_id, member_id, amount, payment_date, payment_method,
  payment_type, period_number, notes, status
)
SELECT 
  gm.gym_id,
  gm.id,
  gm.plan_amount,
  gm.joining_date,
  'cash',
  'new_membership',
  1,
  'Initial membership payment - November 2025',
  'completed'
FROM gym_members gm
JOIN gym_gyms gg ON gm.gym_id = gg.id
WHERE gg.email = 'nasar@fitflow.demo'
  AND NOT EXISTS (
    SELECT 1 FROM gym_payments gp 
    WHERE gp.member_id = gm.id 
    AND gp.payment_date = gm.joining_date
  );

-- Maharaja's Gym November Payments
INSERT INTO gym_payments (
  gym_id, member_id, amount, payment_date, payment_method,
  payment_type, period_number, notes, status
)
SELECT 
  gm.gym_id,
  gm.id,
  gm.plan_amount,
  gm.joining_date,
  'cash',
  'new_membership',
  1,
  'Initial membership payment - November 2025',
  'completed'
FROM gym_members gm
JOIN gym_gyms gg ON gm.gym_id = gg.id
WHERE gg.email = 'maharaja@fitflow.demo'
  AND NOT EXISTS (
    SELECT 1 FROM gym_payments gp 
    WHERE gp.member_id = gm.id 
    AND gp.payment_date = gm.joining_date
  );

-- ==========================================
-- STEP 6: CREATE MEMBERSHIP PERIODS
-- ==========================================

-- Nasar's Gym Membership Periods
INSERT INTO gym_membership_periods (
  gym_id, member_id, period_number, plan_id, plan_name,
  plan_duration_months, plan_amount, bonus_months, discount_amount,
  paid_amount, start_date, end_date, next_payment_due, status
)
SELECT 
  gm.gym_id,
  gm.id,
  1,
  gm.plan_id,
  gm.membership_plan,
  CASE gm.membership_plan 
    WHEN 'monthly' THEN 1 
    WHEN 'quarterly' THEN 3 
    ELSE 1 
  END,
  gm.plan_amount,
  0,
  0,
  gm.plan_amount,
  gm.membership_start_date,
  gm.membership_end_date,
  gm.next_payment_due_date,
  CASE 
    WHEN gm.payment_status = 'overdue' THEN 'active'
    WHEN gm.payment_status = 'due' THEN 'active'
    ELSE 'active'
  END
FROM gym_members gm
JOIN gym_gyms gg ON gm.gym_id = gg.id
WHERE gg.email = 'nasar@fitflow.demo'
  AND NOT EXISTS (
    SELECT 1 FROM gym_membership_periods gp 
    WHERE gp.member_id = gm.id
  );

-- Maharaja's Gym Membership Periods
INSERT INTO gym_membership_periods (
  gym_id, member_id, period_number, plan_id, plan_name,
  plan_duration_months, plan_amount, bonus_months, discount_amount,
  paid_amount, start_date, end_date, next_payment_due, status
)
SELECT 
  gm.gym_id,
  gm.id,
  1,
  gm.plan_id,
  gm.membership_plan,
  CASE gm.membership_plan 
    WHEN 'monthly' THEN 1 
    WHEN 'quarterly' THEN 3 
    ELSE 1 
  END,
  gm.plan_amount,
  0,
  0,
  gm.plan_amount,
  gm.membership_start_date,
  gm.membership_end_date,
  gm.next_payment_due_date,
  CASE 
    WHEN gm.payment_status = 'overdue' THEN 'active'
    WHEN gm.payment_status = 'due' THEN 'active'
    ELSE 'active'
  END
FROM gym_members gm
JOIN gym_gyms gg ON gm.gym_id = gg.id
WHERE gg.email = 'maharaja@fitflow.demo'
  AND NOT EXISTS (
    SELECT 1 FROM gym_membership_periods gp 
    WHERE gp.member_id = gm.id
  );

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================

-- Check gym creation
SELECT name, email FROM gym_gyms 
WHERE email IN ('nasar@fitflow.demo', 'maharaja@fitflow.demo');

-- Check member counts
SELECT gg.name, COUNT(gm.id) as member_count
FROM gym_gyms gg
LEFT JOIN gym_members gm ON gg.id = gm.gym_id
WHERE gg.email IN ('nasar@fitflow.demo', 'maharaja@fitflow.demo')
GROUP BY gg.name;

-- Check payment status distribution for Nasar's Gym
SELECT 
  gg.name,
  gm.payment_status,
  COUNT(*) as count
FROM gym_members gm
JOIN gym_gyms gg ON gm.gym_id = gg.id
WHERE gg.email = 'nasar@fitflow.demo'
GROUP BY gg.name, gm.payment_status;

-- Check payment status distribution for Maharaja's Gym
SELECT 
  gg.name,
  gm.payment_status,
  COUNT(*) as count
FROM gym_members gm
JOIN gym_gyms gg ON gm.gym_id = gg.id
WHERE gg.email = 'maharaja@fitflow.demo'
GROUP BY gg.name, gm.payment_status;

-- ==========================================
-- SUMMARY
-- ==========================================
-- Each gym will have 25 members:
-- - 8 OVERDUE (due Dec 1-4)
-- - 2 DUE TODAY (due Dec 5)
-- - 6 UPCOMING (due Dec 6-10)
-- - 9 Quarterly (due Feb 2026) - paid status
--
-- All members:
-- - Joined in November 2025
-- - Have initial payment recorded
-- - Monthly members need December payment
-- ==========================================
