-- Payment Date Audit System
-- Purpose: Track all changes to next_payment_due_date and membership_end_date
-- Enables immediate detection of calculation errors

-- =============================================================================
-- AUDIT TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS gym_payment_date_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gym_gyms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  
  -- Operation that caused the change
  operation TEXT NOT NULL, -- 'add_member', 'record_payment', 'rejoin', 'trigger_update', 'manual_edit'
  
  -- Before values (snapshot before change)
  previous_membership_start_date DATE,
  previous_membership_end_date DATE,
  previous_next_payment_due_date DATE,
  previous_status TEXT,
  
  -- After values (what was actually set in DB)
  new_membership_start_date DATE,
  new_membership_end_date DATE,
  new_next_payment_due_date DATE,
  new_status TEXT,
  
  -- Expected values (independently calculated for validation)
  expected_membership_end_date DATE,
  expected_next_payment_due_date DATE,
  
  -- Calculation inputs (for debugging)
  plan_type TEXT,
  plan_duration_months INT,
  calculation_start_date DATE,
  paid_amount DECIMAL(10,2),
  
  -- Validation results
  is_date_mismatch BOOLEAN DEFAULT FALSE,
  mismatch_type TEXT, -- 'end_date', 'due_date', 'both', null
  mismatch_details JSONB,
  
  -- Metadata
  triggered_by TEXT NOT NULL DEFAULT 'app', -- 'app', 'trigger', 'manual', 'system'
  source_function TEXT, -- Which function/trigger made the change
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint for valid operations
  CONSTRAINT valid_operation CHECK (operation IN ('add_member', 'record_payment', 'rejoin', 'trigger_update', 'manual_edit', 'bulk_fix'))
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_payment_date_audit_gym ON gym_payment_date_audit(gym_id);
CREATE INDEX IF NOT EXISTS idx_payment_date_audit_member ON gym_payment_date_audit(member_id);
CREATE INDEX IF NOT EXISTS idx_payment_date_audit_mismatch ON gym_payment_date_audit(is_date_mismatch) WHERE is_date_mismatch = TRUE;
CREATE INDEX IF NOT EXISTS idx_payment_date_audit_created ON gym_payment_date_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_date_audit_operation ON gym_payment_date_audit(operation);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE gym_payment_date_audit ENABLE ROW LEVEL SECURITY;

-- Users can only see audit logs for their gym
DROP POLICY IF EXISTS "Users can view their gym's audit logs" ON gym_payment_date_audit;
CREATE POLICY "Users can view their gym's audit logs" ON gym_payment_date_audit
  FOR SELECT USING (
    gym_id IN (
      SELECT gym_id FROM gym_staff WHERE user_id = auth.uid()
    )
  );

-- App can insert audit logs
DROP POLICY IF EXISTS "App can insert audit logs" ON gym_payment_date_audit;
CREATE POLICY "App can insert audit logs" ON gym_payment_date_audit
  FOR INSERT WITH CHECK (TRUE);

-- =============================================================================
-- VIEW: Quick access to mismatches
-- =============================================================================
CREATE OR REPLACE VIEW gym_payment_date_mismatches AS
SELECT 
  a.id,
  a.gym_id,
  a.member_id,
  a.member_name,
  a.operation,
  a.new_membership_end_date AS actual_end_date,
  a.expected_membership_end_date,
  a.new_next_payment_due_date AS actual_due_date,
  a.expected_next_payment_due_date,
  a.plan_type,
  a.plan_duration_months,
  a.calculation_start_date,
  a.mismatch_details,
  a.source_function,
  a.created_at
FROM gym_payment_date_audit a
WHERE a.is_date_mismatch = TRUE
ORDER BY a.created_at DESC;

-- =============================================================================
-- FUNCTION: Calculate expected dates
-- =============================================================================
CREATE OR REPLACE FUNCTION calculate_expected_dates(
  p_start_date DATE,
  p_duration_months INT
) RETURNS TABLE(expected_end_date DATE, expected_due_date DATE) AS $$
BEGIN
  -- End date = start + duration months - 1 day
  -- Due date = start + duration months (day after end date)
  RETURN QUERY SELECT 
    (p_start_date + (p_duration_months || ' months')::INTERVAL - '1 day'::INTERVAL)::DATE AS expected_end_date,
    (p_start_date + (p_duration_months || ' months')::INTERVAL)::DATE AS expected_due_date;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================================
-- FUNCTION: Log payment date changes (called from app)
-- =============================================================================
CREATE OR REPLACE FUNCTION log_payment_date_change(
  p_gym_id UUID,
  p_member_id UUID,
  p_member_name TEXT,
  p_operation TEXT,
  p_prev_start DATE,
  p_prev_end DATE,
  p_prev_due DATE,
  p_prev_status TEXT,
  p_new_start DATE,
  p_new_end DATE,
  p_new_due DATE,
  p_new_status TEXT,
  p_plan_type TEXT,
  p_plan_duration INT,
  p_calc_start DATE,
  p_paid_amount DECIMAL,
  p_source TEXT
) RETURNS UUID AS $$
DECLARE
  v_expected RECORD;
  v_is_mismatch BOOLEAN := FALSE;
  v_mismatch_type TEXT;
  v_mismatch_details JSONB;
  v_audit_id UUID;
BEGIN
  -- Calculate expected dates
  SELECT * INTO v_expected FROM calculate_expected_dates(p_calc_start, p_plan_duration);
  
  -- Check for mismatches
  IF p_new_end IS DISTINCT FROM v_expected.expected_end_date THEN
    v_is_mismatch := TRUE;
    v_mismatch_type := 'end_date';
  END IF;
  
  IF p_new_due IS DISTINCT FROM v_expected.expected_due_date THEN
    v_is_mismatch := TRUE;
    IF v_mismatch_type IS NOT NULL THEN
      v_mismatch_type := 'both';
    ELSE
      v_mismatch_type := 'due_date';
    END IF;
  END IF;
  
  -- Build mismatch details if there's a mismatch
  IF v_is_mismatch THEN
    v_mismatch_details := jsonb_build_object(
      'end_date_diff_days', (p_new_end - v_expected.expected_end_date),
      'due_date_diff_days', (p_new_due - v_expected.expected_due_date),
      'calculation_formula', format('start(%s) + %s months', p_calc_start, p_plan_duration)
    );
  END IF;
  
  -- Insert audit record
  INSERT INTO gym_payment_date_audit (
    gym_id, member_id, member_name, operation,
    previous_membership_start_date, previous_membership_end_date, 
    previous_next_payment_due_date, previous_status,
    new_membership_start_date, new_membership_end_date,
    new_next_payment_due_date, new_status,
    expected_membership_end_date, expected_next_payment_due_date,
    plan_type, plan_duration_months, calculation_start_date, paid_amount,
    is_date_mismatch, mismatch_type, mismatch_details,
    triggered_by, source_function
  ) VALUES (
    p_gym_id, p_member_id, p_member_name, p_operation,
    p_prev_start, p_prev_end, p_prev_due, p_prev_status,
    p_new_start, p_new_end, p_new_due, p_new_status,
    v_expected.expected_end_date, v_expected.expected_due_date,
    p_plan_type, p_plan_duration, p_calc_start, p_paid_amount,
    v_is_mismatch, v_mismatch_type, v_mismatch_details,
    'app', p_source
  ) RETURNING id INTO v_audit_id;
  
  -- If mismatch detected, log warning (visible in Supabase logs)
  IF v_is_mismatch THEN
    RAISE WARNING '⚠️ PAYMENT DATE MISMATCH! Member: %, Op: %, Expected End: %, Actual End: %, Expected Due: %, Actual Due: %',
      p_member_name, p_operation, v_expected.expected_end_date, p_new_end, v_expected.expected_due_date, p_new_due;
  END IF;
  
  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- GRANTS
-- =============================================================================
GRANT EXECUTE ON FUNCTION log_payment_date_change TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_expected_dates TO authenticated;

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON TABLE gym_payment_date_audit IS 'Audit trail for all next_payment_due_date changes. Enables immediate detection of calculation errors.';
COMMENT ON VIEW gym_payment_date_mismatches IS 'Quick view of all detected date calculation mismatches';
COMMENT ON FUNCTION calculate_expected_dates IS 'Calculate expected end_date and due_date based on start_date and duration';
COMMENT ON FUNCTION log_payment_date_change IS 'Log a payment date change and validate against expected values';
