-- SAFE Script: Fix ONLY Ravi and Pandira
-- This script will fix the next_payment_due_date for only these 2 specific members
-- Run this in PRODUCTION after applying the trigger migration

-- ============================================================================
-- STEP 1: First, let's see their current data
-- ============================================================================

SELECT 
  id,
  full_name,
  phone,
  joining_date,
  EXTRACT(DAY FROM joining_date) as joining_day,
  membership_plan,
  plan_id,
  next_payment_due_date,
  EXTRACT(DAY FROM next_payment_due_date) as current_due_day,
  (SELECT COUNT(*) FROM gym_payments WHERE member_id = gym_members.id) as payment_count
FROM gym_members
WHERE full_name ILIKE '%ravi%' OR full_name ILIKE '%pandira%'
ORDER BY full_name;

-- ============================================================================
-- STEP 2: Calculate what the correct dates SHOULD be
-- ============================================================================

WITH member_data AS (
  SELECT 
    m.id,
    m.full_name,
    m.joining_date,
    EXTRACT(DAY FROM m.joining_date) as joining_day,
    m.next_payment_due_date as current_wrong_date,
    p.base_duration_months,
    p.duration_months,
    p.bonus_duration_months,
    COALESCE(p.base_duration_months, p.duration_months, 1) + COALESCE(p.bonus_duration_months, 0) as total_months,
    (SELECT COUNT(*) FROM gym_payments WHERE member_id = m.id) as payment_count
  FROM gym_members m
  LEFT JOIN gym_membership_plans p ON m.plan_id = p.id
  WHERE m.full_name ILIKE '%ravi%' OR m.full_name ILIKE '%pandira%'
)
SELECT 
  full_name,
  joining_date,
  total_months as plan_months,
  payment_count,
  current_wrong_date as wrong_next_due,
  -- Calculate correct next due date
  (joining_date::DATE + (total_months * payment_count || ' months')::INTERVAL)::DATE as correct_next_due,
  -- Show difference
  (joining_date::DATE + (total_months * payment_count || ' months')::INTERVAL)::DATE - current_wrong_date as days_off
FROM member_data
ORDER BY full_name;

-- ============================================================================
-- STEP 3: Fix Ravi's date
-- ============================================================================

-- First, get Ravi's ID (copy this and use below)
SELECT id, full_name FROM gym_members WHERE full_name ILIKE '%ravi%';

-- Then run this update (REPLACE 'RAVI_ID_HERE' with actual ID from above)
/*
DO $$
DECLARE
  v_member_id UUID := 'RAVI_ID_HERE'::UUID;  -- PASTE RAVI'S ID HERE
  v_member RECORD;
  v_plan RECORD;
  v_total_months INTEGER;
  v_joining_day INTEGER;
  v_payment_count INTEGER;
  v_correct_due DATE;
  v_correct_end DATE;
BEGIN
  -- Get member data
  SELECT * INTO v_member FROM gym_members WHERE id = v_member_id;
  
  -- Get plan data
  SELECT 
    COALESCE(base_duration_months, duration_months, 1) as base,
    COALESCE(bonus_duration_months, 0) as bonus
  INTO v_plan
  FROM gym_membership_plans
  WHERE id = v_member.plan_id;
  
  -- Calculate
  v_total_months := v_plan.base + v_plan.bonus;
  v_joining_day := EXTRACT(DAY FROM v_member.joining_date);
  SELECT COUNT(*) INTO v_payment_count FROM gym_payments WHERE member_id = v_member_id;
  
  -- Correct next due date
  v_correct_due := (v_member.joining_date::DATE + (v_total_months * v_payment_count || ' months')::INTERVAL)::DATE;
  
  -- Adjust to maintain joining day
  v_correct_due := DATE_TRUNC('MONTH', v_correct_due)::DATE + (v_joining_day - 1);
  
  -- Membership end is 1 day before
  v_correct_end := v_correct_due - INTERVAL '1 day';
  
  -- Update member
  UPDATE gym_members
  SET 
    next_payment_due_date = v_correct_due,
    membership_end_date = v_correct_end,
    updated_at = NOW()
  WHERE id = v_member_id;
  
  -- Show what was done
  RAISE NOTICE '✅ Fixed Ravi: Old=%, New=%', v_member.next_payment_due_date, v_correct_due;
END $$;
*/

-- ============================================================================
-- STEP 4: Fix Pandira's date
-- ============================================================================

-- First, get Pandira's ID
SELECT id, full_name FROM gym_members WHERE full_name ILIKE '%pandira%';

-- Then run this update (REPLACE 'PANDIRA_ID_HERE' with actual ID from above)
/*
DO $$
DECLARE
  v_member_id UUID := 'PANDIRA_ID_HERE'::UUID;  -- PASTE PANDIRA'S ID HERE
  v_member RECORD;
  v_plan RECORD;
  v_total_months INTEGER;
  v_joining_day INTEGER;
  v_payment_count INTEGER;
  v_correct_due DATE;
  v_correct_end DATE;
BEGIN
  -- Get member data
  SELECT * INTO v_member FROM gym_members WHERE id = v_member_id;
  
  -- Get plan data
  SELECT 
    COALESCE(base_duration_months, duration_months, 1) as base,
    COALESCE(bonus_duration_months, 0) as bonus
  INTO v_plan
  FROM gym_membership_plans
  WHERE id = v_member.plan_id;
  
  -- Calculate
  v_total_months := v_plan.base + v_plan.bonus;
  v_joining_day := EXTRACT(DAY FROM v_member.joining_date);
  SELECT COUNT(*) INTO v_payment_count FROM gym_payments WHERE member_id = v_member_id;
  
  -- Correct next due date
  v_correct_due := (v_member.joining_date::DATE + (v_total_months * v_payment_count || ' months')::INTERVAL)::DATE;
  
  -- Adjust to maintain joining day
  v_correct_due := DATE_TRUNC('MONTH', v_correct_due)::DATE + (v_joining_day - 1);
  
  -- Membership end is 1 day before
  v_correct_end := v_correct_due - INTERVAL '1 day';
  
  -- Update member
  UPDATE gym_members
  SET 
    next_payment_due_date = v_correct_due,
    membership_end_date = v_correct_end,
    updated_at = NOW()
  WHERE id = v_member_id;
  
  -- Show what was done
  RAISE NOTICE '✅ Fixed Pandira: Old=%, New=%', v_member.next_payment_due_date, v_correct_due;
END $$;
*/

-- ============================================================================
-- STEP 5: Verify the fix
-- ============================================================================

-- After running the fixes above, verify with this query:
SELECT 
  m.full_name,
  m.joining_date,
  EXTRACT(DAY FROM m.joining_date) as joining_day,
  p.name as plan_name,
  COALESCE(p.base_duration_months, p.duration_months) + COALESCE(p.bonus_duration_months, 0) as total_months,
  (SELECT COUNT(*) FROM gym_payments WHERE member_id = m.id) as payments_made,
  m.next_payment_due_date,
  EXTRACT(DAY FROM m.next_payment_due_date) as next_due_day,
  CASE 
    WHEN EXTRACT(DAY FROM m.next_payment_due_date) = EXTRACT(DAY FROM m.joining_date)
    THEN '✅ CORRECT - Day matches'
    ELSE '❌ INCORRECT - Day mismatch'
  END as verification_status
FROM gym_members m
LEFT JOIN gym_membership_plans p ON m.plan_id = p.id
WHERE m.full_name ILIKE '%ravi%' OR m.full_name ILIKE '%pandira%'
ORDER BY m.full_name;

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. Run STEP 1 first to see current data
-- 2. Run STEP 2 to see what the correct dates should be
-- 3. Get IDs from queries in STEP 3 and 4
-- 4. Uncomment and run the fix blocks (replace IDs)
-- 5. Run STEP 5 to verify both members are fixed
-- 6. verification_status should show "✅ CORRECT - Day matches"
