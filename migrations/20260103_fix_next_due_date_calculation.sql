-- Migration: Fix Next Due Date Calculation with Database Trigger
-- Created: 2026-01-03
-- Purpose: Ensure next_payment_due_date is always calculated correctly based on joining_date anchor
--          and includes bonus months from membership plans

-- ============================================================================
-- STEP 1: Create the trigger function
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_next_due_date_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_member_record RECORD;
  v_plan_record RECORD;
  v_joining_day INTEGER;
  v_total_months INTEGER;
  v_next_due_date DATE;
  v_membership_end_date DATE;
  v_temp_date DATE;
  v_last_day_of_month INTEGER;
  v_payment_count INTEGER;
BEGIN
  -- Get member details
  SELECT 
    joining_date,
    plan_id,
    full_name,
    next_payment_due_date,
    created_at
  INTO v_member_record
  FROM gym_members
  WHERE id = NEW.member_id;

  -- If no plan_id, skip calculation (safety check)
  IF v_member_record.plan_id IS NULL THEN
    RAISE NOTICE 'Member % has no plan_id, skipping next due date calculation', v_member_record.full_name;
    RETURN NEW;
  END IF;

  -- Get plan details including bonus months
  SELECT 
    name,
    COALESCE(base_duration_months, duration_months, 1) as base_months,
    COALESCE(bonus_duration_months, 0) as bonus_months
  INTO v_plan_record
  FROM gym_membership_plans
  WHERE id = v_member_record.plan_id;

  -- If plan not found, log and skip
  IF NOT FOUND THEN
    RAISE WARNING 'Plan not found for plan_id %, member %', v_member_record.plan_id, v_member_record.full_name;
    RETURN NEW;
  END IF;

  -- Calculate total months (base + bonus)
  v_total_months := v_plan_record.base_months + v_plan_record.bonus_months;

  -- Extract the joining day (this is our anchor)
  v_joining_day := EXTRACT(DAY FROM v_member_record.joining_date::DATE);

  -- Count total payments for this member (including this one)
  SELECT count(*) INTO v_payment_count FROM gym_payments WHERE member_id = NEW.member_id;

  v_temp_date := v_member_record.next_payment_due_date;

  -- IF this is the FIRST payment AND the member was created recently (e.g. < 15 mins ago)
  -- Then we FORCE calculation from Joining Date, ignoring any "Ghost" updates to next_payment_due_date (e.g. from frontend).
  IF (v_payment_count <= 1 AND v_member_record.created_at > (NOW() - INTERVAL '15 minutes')) THEN
      -- Reset/First Time Logic: Use Joining Date
      v_next_due_date := (v_member_record.joining_date::DATE + (v_total_months || ' months')::INTERVAL)::DATE;
  ELSE
      -- Normal / Subsequent Payments
      IF v_temp_date IS NULL THEN
         v_next_due_date := (v_member_record.joining_date::DATE + (v_total_months || ' months')::INTERVAL)::DATE;
      ELSE
         v_next_due_date := (v_temp_date::DATE + (v_total_months || ' months')::INTERVAL)::DATE;
      END IF;
  END IF;

  -- CRITICAL: Adjust to maintain the joining day as anchor
  v_last_day_of_month := EXTRACT(DAY FROM (DATE_TRUNC('MONTH', v_next_due_date) + INTERVAL '1 MONTH' - INTERVAL '1 DAY')::DATE);
  v_next_due_date := DATE_TRUNC('MONTH', v_next_due_date)::DATE + (LEAST(v_joining_day, v_last_day_of_month) - 1);

  -- Membership end date is 1 day before next payment due date
  v_membership_end_date := v_next_due_date - INTERVAL '1 day';

  -- Update member record with calculated dates AND consolidated payment stats
  UPDATE gym_members
  SET 
    next_payment_due_date = v_next_due_date,
    membership_end_date = v_membership_end_date,
    last_payment_date = NEW.payment_date,
    last_payment_amount = NEW.amount,
    status = 'active',
    updated_at = NOW(),
    total_payments_received = COALESCE(total_payments_received, 0) + NEW.amount,
    lifetime_value = COALESCE(lifetime_value, 0) + NEW.amount
  WHERE id = NEW.member_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 2: Drop existing trigger if exists and create new one
-- ============================================================================

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS trigger_calculate_next_due_date_on_payment ON gym_payments;

-- Create trigger that fires AFTER payment insert
CREATE TRIGGER trigger_calculate_next_due_date_on_payment
  AFTER INSERT ON gym_payments
  FOR EACH ROW
  EXECUTE FUNCTION calculate_next_due_date_on_payment();

-- ============================================================================
-- STEP 3: Add comments for documentation
-- ============================================================================

COMMENT ON FUNCTION calculate_next_due_date_on_payment() IS 
'Automatically calculates next_payment_due_date and membership_end_date when a payment is recorded.
Ensures the joining day is always maintained as the anchor for all future due dates.
Includes bonus months from membership plans in the calculation.
Example: Join on Nov 10 with 3+1 plan → Due on Mar 10 (4 months later), even if payment made on Mar 15.';

COMMENT ON TRIGGER trigger_calculate_next_due_date_on_payment ON gym_payments IS
'Fires after payment insert to automatically calculate and update member due dates based on joining day anchor.';

-- ============================================================================
-- Success message
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE '✅ Trigger "trigger_calculate_next_due_date_on_payment" created';
  RAISE NOTICE '✅ Next due dates will now be calculated correctly based on joining day anchor';
  RAISE NOTICE '✅ Bonus months from plans are now included automatically';
END $$;
