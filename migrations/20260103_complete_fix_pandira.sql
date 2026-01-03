-- COMPLETE FIX FOR PANDIRA
-- This script will:
-- 1. Add the missing payment record
-- 2. Update joining_date to Sep 1, 2025
-- 3. Calculate correct next_payment_due_date (Sep 1, 2026)
-- 4. Set correct membership_end_date (Aug 31, 2026)

-- ============================================================================
-- STEP 1: First, let's see current state
-- ============================================================================

SELECT 
  id,
  full_name,
  phone,
  joining_date,
  membership_plan,
  plan_amount,
  next_payment_due_date,
  membership_end_date,
  (SELECT COUNT(*) FROM gym_payments WHERE member_id = gym_members.id) as payment_count
FROM gym_members
WHERE full_name ILIKE '%pandira%';

-- Expected: Should show 1 payment (we need to add the 2nd one)

-- ============================================================================
-- STEP 2: Check current payments
-- ============================================================================

SELECT 
  payment_date,
  amount,
  payment_method,
  due_date,
  notes
FROM gym_payments
WHERE member_id = (SELECT id FROM gym_members WHERE full_name ILIKE '%pandira%' LIMIT 1)
ORDER BY payment_date;

-- Expected: Should show only 1 payment (either Sep 1 OR Jan 2)

-- ============================================================================
-- STEP 3: Get Pandira's ID and Gym ID
-- ============================================================================

SELECT 
  m.id as member_id,
  m.gym_id,
  m.full_name,
  m.joining_date,
  m.plan_id
FROM gym_members m
WHERE m.full_name ILIKE '%pandira%';

-- COPY the member_id and gym_id from results above

-- ============================================================================
-- STEP 4: Add Missing Payment Records (If needed)
-- ============================================================================

-- First, determine which payment is missing by checking Step 2 results

-- If ONLY Jan 2 payment exists, add Sep 1 payment:
/*
INSERT INTO gym_payments (
  gym_id,
  member_id,
  amount,
  payment_method,
  payment_date,
  due_date,
  notes,
  created_at
) VALUES (
  'PASTE_GYM_ID_HERE'::UUID,
  'PASTE_PANDIRA_MEMBER_ID_HERE'::UUID,
  2500,
  'cash',
  '2025-09-01',
  '2025-09-01',
  'Initial payment - 3 months plan (manually added - was missing)',
  '2025-09-01'::TIMESTAMP
);
*/

-- If ONLY Sep 1 payment exists, add Jan 2 payment:
/*
INSERT INTO gym_payments (
  gym_id,
  member_id,
  amount,
  payment_method,
  payment_date,
  due_date,
  notes,
  created_at
) VALUES (
  'PASTE_GYM_ID_HERE'::UUID,
  'PASTE_PANDIRA_MEMBER_ID_HERE'::UUID,
  4500,
  'cash',
  '2026-01-02',
  '2025-12-01',  -- This was the due date when payment was made (late payment)
  'Second payment - 6+3 months plan (manually added - was missing)',
  '2026-01-02'::TIMESTAMP
);
*/

-- ============================================================================
-- STEP 5: Update Member Record with Correct Dates
-- ============================================================================

-- After adding missing payment(s), calculate and set correct dates
/*
DO $$
DECLARE
  v_member_id UUID := 'PASTE_PANDIRA_MEMBER_ID_HERE'::UUID;
  v_joining_date DATE := '2025-09-01'::DATE;
  v_first_payment_due DATE := '2025-12-01'::DATE;  -- Sep 1 + 3 months
  v_second_payment_due DATE := '2026-09-01'::DATE; -- Dec 1 + 9 months (maintains 1st)
  v_membership_end DATE := '2026-08-31'::DATE;     -- 1 day before next due
BEGIN
  -- Update member record
  UPDATE gym_members
  SET 
    joining_date = v_joining_date,
    membership_plan = '6Months+3Months',  -- Current plan
    plan_amount = 4500,                   -- Current plan amount
    next_payment_due_date = v_second_payment_due,
    membership_end_date = v_membership_end,
    status = 'active',
    updated_at = NOW()
  WHERE id = v_member_id;
  
  RAISE NOTICE '✅ Updated Pandira:';
  RAISE NOTICE '   Joining Date: %', v_joining_date;
  RAISE NOTICE '   Next Due Date: %', v_second_payment_due;
  RAISE NOTICE '   Valid Until: %', v_membership_end;
END $$;
*/

-- ============================================================================
-- STEP 6: Verify the Fix
-- ============================================================================

-- Check member record
SELECT 
  m.full_name,
  m.joining_date,
  EXTRACT(DAY FROM m.joining_date) as joining_day,
  m.membership_plan,
  m.plan_amount,
  m.next_payment_due_date,
  EXTRACT(DAY FROM m.next_payment_due_date) as next_due_day,
  m.membership_end_date,
  (SELECT COUNT(*) FROM gym_payments WHERE member_id = m.id) as payment_count,
  CASE 
    WHEN EXTRACT(DAY FROM m.next_payment_due_date) = EXTRACT(DAY FROM m.joining_date)
    THEN '✅ CORRECT - Days match'
    ELSE '❌ INCORRECT - Days mismatch'
  END as day_anchor_status
FROM gym_members m
WHERE m.full_name ILIKE '%pandira%';

-- Expected results:
-- joining_date: 2025-09-01
-- joining_day: 1
-- membership_plan: 6Months+3Months
-- plan_amount: 4500
-- next_payment_due_date: 2026-09-01
-- next_due_day: 1
-- membership_end_date: 2026-08-31
-- payment_count: 2
-- day_anchor_status: ✅ CORRECT - Days match

-- Check payment history
SELECT 
  payment_date,
  amount,
  payment_method,
  due_date,
  notes,
  created_at
FROM gym_payments
WHERE member_id = (SELECT id FROM gym_members WHERE full_name ILIKE '%pandira%' LIMIT 1)
ORDER BY payment_date;

-- Expected: Should show 2 payments:
-- 1. 2025-09-01 | 2500 | Initial payment
-- 2. 2026-01-02 | 4500 | Second payment

-- ============================================================================
-- DETAILED CALCULATION EXPLANATION
-- ============================================================================

/*
PANDIRA'S CORRECT TIMELINE:

Sep 1, 2025: Joined + Payment #1
  - Amount: ₹2,500
  - Plan: 3 months
  - Joining Day Anchor: 1st of month
  - Next Due: Sep 1 + 3 months = Dec 1, 2025

Dec 1, 2025: Due date (but not paid)

Jan 2, 2026: Payment #2 (Late payment)
  - Amount: ₹4,500
  - Plan: 6+3 = 9 months
  - Was Due: Dec 1, 2025
  - Current Due: Dec 1, 2025
  - Next Due: Dec 1, 2025 + 9 months = Sep 1, 2026 ✅
  - Anchor Day Maintained: 1st (even though paid on 2nd)

FINAL STATE:
  - Joining Date: Sep 1, 2025 (anchor day = 1st)
  - Next Payment Due: Sep 1, 2026 (maintains 1st)
  - Valid Until: Aug 31, 2026 (1 day before due)
  - Total Payments Made: 2
  - Total Amount Paid: ₹7,000 (2,500 + 4,500)
*/

-- ============================================================================
-- STEP 7: Update Plan ID if needed (Optional)
-- ============================================================================

-- If the plan_id needs to be set to the 6+3 plan:
/*
-- First, find the 6+3 plan ID
SELECT id, name, base_duration_months, bonus_duration_months, price
FROM gym_membership_plans
WHERE base_duration_months = 6 AND bonus_duration_months = 3;

-- Then update member
UPDATE gym_members
SET plan_id = 'PASTE_6+3_PLAN_ID_HERE'::UUID
WHERE full_name ILIKE '%pandira%';
*/
