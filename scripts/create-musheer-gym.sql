-- ==========================================
-- CREATE MUSHEER'S GYM - Demo Account
-- Run this in Supabase SQL Editor
-- ==========================================

-- Step 1: Create the gym record
INSERT INTO gym_gyms (id, name, email, phone, language, timezone, currency)
VALUES (
  gen_random_uuid(),
  'Musheer''s Gym',
  'musheer@fitflow.demo',
  '9876500005',
  'en',
  'Asia/Kolkata',
  'INR'
)
ON CONFLICT (email) DO NOTHING
RETURNING id;

-- Note: Copy the gym_id from above for the next steps
-- Or use this to get it:
-- SELECT id FROM gym_gyms WHERE email = 'musheer@fitflow.demo';

-- ==========================================
-- INSTRUCTIONS:
-- ==========================================
-- 1. First, go to Supabase Authentication > Users
-- 2. Create a new user:
--    Email: musheer@fitflow.demo
--    Password: Demo@123
-- 3. Copy the user's UUID
-- 4. Run the following SQL with the correct IDs:

-- Step 2: Link auth user to gym (replace UUIDs)
-- INSERT INTO gym_users (gym_id, auth_user_id, email, full_name, role)
-- VALUES (
--   '<GYM_ID_FROM_STEP_1>',
--   '<AUTH_USER_ID_FROM_SUPABASE>',
--   'musheer@fitflow.demo',
--   'Musheer',
--   'owner'
-- );

-- Step 3: Create membership plans
-- INSERT INTO gym_membership_plans (gym_id, name, description, price, duration_days, billing_cycle, is_active)
-- VALUES 
--   ('<GYM_ID>', 'Monthly', 'Monthly membership', 1000, 30, 'monthly', true),
--   ('<GYM_ID>', 'Quarterly', 'Quarterly membership', 2500, 90, 'quarterly', true),
--   ('<GYM_ID>', 'Half Yearly', 'Half yearly membership', 4500, 180, 'half_yearly', true),
--   ('<GYM_ID>', 'Yearly', 'Annual membership', 8000, 365, 'annual', true);

-- Step 4: Create sample members with various due dates
-- (Similar to other demo gyms - 26 members across Dec 1-10)
