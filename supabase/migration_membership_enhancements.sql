-- ===============================================
-- MEMBERSHIP ENHANCEMENTS FOR PAYMENTS & DUE DATES
-- Core Business Logic Implementation
-- ===============================================

-- Update existing tables to support the enhanced membership system

-- 1. Add membership tracking fields to members table
ALTER TABLE members
ADD COLUMN IF NOT EXISTS membership_start_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS membership_end_date DATE,
ADD COLUMN IF NOT EXISTS next_payment_due_date DATE,
ADD COLUMN IF NOT EXISTS total_payments_received DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_payment_date DATE,
ADD COLUMN IF NOT EXISTS last_payment_amount DECIMAL(10,2) DEFAULT 0;

-- 2. Enhanced payments table with proper tracking
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS payment_type VARCHAR(20) DEFAULT 'membership' CHECK (payment_type IN ('membership', 'late_fee', 'penalty', 'upgrade', 'other')),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOTEXT EXISTS automatically_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXT payment_schedule_id UUID REFERENCES payment_schedules(id),
ADD COLUMN IF NOT EXISTS extends_membership_to DATE; -- Shows the new end date after this payment

-- 3. Create payment_schedules table for recurring payments
CREATE TABLE IF NOT EXISTS payment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,

  -- Schedule details
  schedule_date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled', 'skipped')),

  -- Payment details
  payment_id UUID REFERENCES payments(id),
  paid_at TIMESTAMPTZ,
  late_fee_applied DECIMAL(10,2) DEFAULT 0,
  grace_period_end DATE,

  -- Membership extension
  extends_membership_from DATE,
  extends_membership_to DATE,
  membership_plan VARCHAR(20),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(gym_id, member_id, schedule_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_schedules_gym_member ON payment_schedules(gym_id, member_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_date ON payment_schedules(schedule_date);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_status ON payment_schedules(gym_id, status, schedule_date);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_due_date ON payment_schedules(gym_id, schedule_date) WHERE status IN ('pending', 'overdue');

-- 4. Create membership_plans table for proper plan management
CREATE TABLE IF NOT EXISTS membership_plans_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,

  plan_name VARCHAR(50) NOT NULL,
  plan_type VARCHAR(20) NOT NULL CHECK (plan_type IN ('monthly', 'quarterly', 'half_yearly', 'annual')),
  duration_months INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,

  -- Grace period and late fees
  grace_period_days INTEGER DEFAULT 5,
  late_fee_per_day DECIMAL(10,2) DEFAULT 10,
  max_late_fee DECIMAL(10,2) DEFAULT 500,

  -- Settings
  is_active BOOLEAN DEFAULT true,
  auto_renew BOOLEAN DEFAULT true,
  requires_payment_approval BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(gym_id, plan_type)
);

-- Insert default plans for existing gyms
INSERT INTO membership_plans_config (gym_id, plan_name, plan_type, duration_months, price)
SELECT
  id as gym_id,
  'Monthly Plan' as plan_name,
  'monthly' as plan_type,
  1 as duration_months,
  1000.00 as price
FROM gyms
ON CONFLICT (gym_id, plan_type) DO NOTHING;

INSERT INTO membership_plans_config (gym_id, plan_name, plan_type, duration_months, price)
SELECT
  id as gym_id,
  'Quarterly Plan' as plan_name,
  'quarterly' as plan_type,
  3 as duration_months,
  2500.00 as price
FROM gyms
ON CONFLICT (gym_id, plan_type) DO NOTHING;

INSERT INTO membership_plans_config (gym_id, plan_name, plan_type, duration_months, price)
SELECT
  id as gym_id,
  'Half Yearly Plan' as plan_name,
  'half_yearly' as plan_type,
  6 as duration_months,
  5000.00 as price
FROM gyms
ON CONFLICT (gym_id, plan_type) DO NOTHING;

INSERT INTO membership_plans_config (gym_id, plan_name, plan_type, duration_months, price)
SELECT
  id as gym_id,
  'Annual Plan' as plan_name,
  'annual' as plan_type,
  12 as duration_months,
  7500.00 as price
FROM gyms
ON CONFLICT (gym_id, plan_type) DO NOTHING;

-- 5. Function to calculate next payment due date
CREATE OR REPLACE FUNCTION calculate_next_payment_due_date(
  p_member_id UUID,
  p_gym_id UUID,
  p_current_end_date DATE DEFAULT NULL
)
RETURNS DATE AS $$
DECLARE
  member_record RECORD;
  plan_config RECORD;
  next_due_date DATE;
  current_date DATE DEFAULT CURRENT_DATE;
BEGIN
  -- Get member details
  SELECT * INTO member_record
  FROM members
  WHERE id = p_member_id AND gym_id = p_gym_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Get plan configuration
  SELECT * INTO plan_config
  FROM membership_plans_config
  WHERE gym_id = p_gym_id AND plan_type = member_record.membership_plan AND is_active = true;

  IF NOT FOUND THEN
    -- Fallback to default durations
    CASE member_record.membership_plan
      WHEN 'monthly' THEN
        next_due_date := (COALESCE(p_current_end_date, member_record.membership_end_date, current_date) + INTERVAL '1 month');
      WHEN 'quarterly' THEN
        next_due_date := (COALESCE(p_current_end_date, member_record.membership_end_date, current_date) + INTERVAL '3 months');
      WHEN 'half_yearly' THEN
        next_due_date := (COALESCE(p_current_end_date, member_record.membership_end_date, current_date) + INTERVAL '6 months');
      WHEN 'annual' THEN
        next_due_date := (COALESCE(p_current_end_date, member_record.membership_end_date, current_date) + INTERVAL '12 months');
      ELSE
        next_due_date := (COALESCE(p_current_end_date, member_record.membership_end_date, current_date) + INTERVAL '1 month');
    END CASE;
  ELSE
    -- Use plan configuration
    next_due_date := (COALESCE(p_current_end_date, member_record.membership_end_date, current_date) +
                     (plan_config.duration_months || ' months')::INTERVAL);
  END IF;

  RETURN next_due_date;
END;
$$ LANGUAGE plpgsql;

-- 6. Function to create payment schedules for a member
CREATE OR REPLACE FUNCTION create_payment_schedule(
  p_member_id UUID,
  p_gym_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_payment_day INTEGER DEFAULT 1
)
RETURNS INTEGER AS $$
DECLARE
  current_date DATE;
  schedule_count INTEGER DEFAULT 0;
  member_plan VARCHAR(20);
BEGIN
  -- Get member's plan
  SELECT membership_plan INTO member_plan
  FROM members
  WHERE id = p_member_id AND gym_id = p_gym_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  current_date := p_start_date;

  -- Create monthly payment schedules
  WHILE current_date <= p_end_date LOOP
    INSERT INTO payment_schedules (
      gym_id, member_id, schedule_date, amount, status, extends_membership_from, extends_membership_to, membership_plan
    ) VALUES (
      p_gym_id,
      p_member_id,
      current_date,
      (SELECT price FROM membership_plans_config WHERE gym_id = p_gym_id AND plan_type = member_plan AND is_active = true LIMIT 1),
      'pending',
      current_date,
      current_date + INTERVAL '1 month',
      member_plan
    )
    ON CONFLICT (gym_id, member_id, schedule_date) DO NOTHING;

    schedule_count := schedule_count + 1;
    current_date := current_date + INTERVAL '1 month';
  END LOOP;

  RETURN schedule_count;
END;
$$ LANGUAGE plpgsql;

-- 7. Function to process payment and update membership
CREATE OR REPLACE FUNCTION process_membership_payment(
  p_payment_id UUID,
  p_gym_id UUID,
  p_payment_amount DECIMAL,
  p_payment_method VARCHAR,
  p_payment_date DATE DEFAULT CURRENT_DATE,
  p_extends_months INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  payment_record RECORD;
  member_record RECORD;
  schedule_record RECORD;
  new_end_date DATE;
  months_to_add INTEGER;
BEGIN
  -- Get payment details
  SELECT * INTO payment_record
  FROM payments
  WHERE id = p_payment_id AND gym_id = p_gym_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Get member details
  SELECT * INTO member_record
  FROM members
  WHERE id = payment_record.member_id AND gym_id = p_gym_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Calculate membership extension
  IF p_extends_months IS NOT NULL THEN
    months_to_add := p_extends_months;
  ELSE
    -- Calculate based on plan type
    CASE member_record.membership_plan
      WHEN 'monthly' THEN months_to_add := 1;
      WHEN 'quarterly' THEN months_to_add := 3;
      WHEN 'half_yearly' THEN months_to_add := 6;
      WHEN 'annual' THEN months_to_add := 12;
      ELSE months_to_add := 1;
    END CASE;
  END IF;

  -- Calculate new end date
  IF member_record.membership_end_date >= CURRENT_DATE THEN
    new_end_date := member_record.membership_end_date + (months_to_add || ' months')::INTERVAL;
  ELSE
    new_end_date := CURRENT_DATE + (months_to_add || ' months')::INTERVAL;
  END IF;

  -- Update member record
  UPDATE members SET
    membership_end_date = new_end_date,
    next_payment_due_date = calculate_next_payment_due_date(payment_record.member_id, p_gym_id, new_end_date),
    total_payments_received = total_payments_received + p_payment_amount,
    last_payment_date = p_payment_date,
    last_payment_amount = p_payment_amount,
    status = 'active',
    updated_at = NOW()
  WHERE id = payment_record.member_id AND gym_id = p_gym_id;

  -- Update payment record
  UPDATE payments SET
    status = 'succeeded',
    paid_at = NOW(),
    extends_membership_to = new_end_date
  WHERE id = p_payment_id;

  -- Update payment schedule
  UPDATE payment_schedules SET
    status = 'paid',
    paid_at = NOW(),
    payment_id = p_payment_id
  WHERE gym_id = p_gym_id
    AND member_id = payment_record.member_id
    AND schedule_date = p_payment_date
    AND status = 'pending';

  -- Create future payment schedules
  PERFORM create_payment_schedule(payment_record.member_id, p_gym_id, new_end_date, new_end_date + INTERVAL '2 years');

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 8. Function to delete payment and revert membership changes
CREATE OR REPLACE FUNCTION revert_membership_payment(
  p_payment_id UUID,
  p_gym_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  payment_record RECORD;
  member_record RECORD;
  reverted_end_date DATE;
BEGIN
  -- Get payment details
  SELECT * INTO payment_record
  FROM payments
  WHERE id = p_payment_id AND gym_id = p_gym_id AND status = 'succeeded';

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Get member details
  SELECT * INTO member_record
  FROM members
  WHERE id = payment_record.member_id AND gym_id = p_gym_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Calculate reverted end date (remove the months added by this payment)
  reverted_end_date := payment_record.extends_membership_to -
                     CASE member_record.membership_plan
                       WHEN 'monthly' THEN INTERVAL '1 month'
                       WHEN 'quarterly' THEN INTERVAL '3 months'
                       WHEN 'half_yearly' THEN INTERVAL '6 months'
                       WHEN 'annual' THEN INTERVAL '12 months'
                       ELSE INTERVAL '1 month'
                     END;

  -- Update member record
  UPDATE members SET
    membership_end_date = reverted_end_date,
    next_payment_due_date = calculate_next_payment_due_date(payment_record.member_id, p_gym_id, reverted_end_date),
    total_payments_received = GREATEST(0, total_payments_received - payment_record.amount),
    last_payment_amount = (
      SELECT amount FROM payments
      WHERE member_id = payment_record.member_id AND gym_id = p_gym_id
        AND status = 'succeeded' AND id != p_payment_id
      ORDER BY paid_at DESC LIMIT 1
    ),
    last_payment_date = (
      SELECT paid_at::DATE FROM payments
      WHERE member_id = payment_record.member_id AND gym_id = p_gym_id
        AND status = 'succeeded' AND id != p_payment_id
      ORDER BY paid_at DESC LIMIT 1
    ),
    status = CASE
      WHEN reverted_end_date < CURRENT_DATE THEN 'inactive'
      ELSE 'active'
    END,
    updated_at = NOW()
  WHERE id = payment_record.member_id AND gym_id = p_gym_id;

  -- Update payment record
  UPDATE payments SET
    status = 'refunded',
    refunded_at = NOW()
  WHERE id = p_payment_id;

  -- Update payment schedule
  UPDATE payment_schedules SET
    status = 'pending',
    paid_at = NULL,
    payment_id = NULL
  WHERE gym_id = p_gym_id
    AND member_id = payment_record.member_id
    AND payment_id = p_payment_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 9. Function to update member status based on membership end date
CREATE OR REPLACE FUNCTION update_member_statuses()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER DEFAULT 0;
BEGIN
  -- Deactivate members whose membership has expired
  UPDATE members SET
    status = 'inactive',
    updated_at = NOW()
  WHERE membership_end_date < CURRENT_DATE
    AND status = 'active';

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  -- Reactivate members whose membership is still valid
  UPDATE members SET
    status = 'active',
    updated_at = NOW()
  WHERE membership_end_date >= CURRENT_DATE
    AND status = 'inactive';

  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- 10. Function to get dashboard statistics
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_gym_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'due_today', (
      SELECT jsonb_build_object(
        'count', COUNT(DISTINCT ps.member_id),
        'amount', COALESCE(SUM(ps.amount), 0),
        'members', (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', m.id,
              'name', m.full_name,
              'photo', m.photo_url,
              'amount', ps.amount
            )
          )
          FROM payment_schedules ps
          JOIN members m ON ps.member_id = m.id
          WHERE ps.gym_id = p_gym_id
            AND ps.schedule_date = CURRENT_DATE
            AND ps.status = 'pending'
          LIMIT 10
        )
      )
    ),
    'overdue_this_month', (
      SELECT jsonb_build_object(
        'count', COUNT(DISTINCT ps.member_id),
        'amount', COALESCE(SUM(ps.amount), 0),
        'members', (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', m.id,
              'name', m.full_name,
              'photo', m.photo_url,
              'amount', ps.amount,
              'due_date', ps.schedule_date,
              'days_overdue', CURRENT_DATE - ps.schedule_date
            )
          )
          FROM payment_schedules ps
          JOIN members m ON ps.member_id = m.id
          WHERE ps.gym_id = p_gym_id
            AND ps.schedule_date < CURRENT_DATE
            AND ps.schedule_date >= DATE_TRUNC('month', CURRENT_DATE)
            AND ps.status = 'pending'
          LIMIT 10
        )
      )
    ),
    'total_members', (
      SELECT jsonb_build_object(
        'active', COUNT(*) FILTER (WHERE status = 'active'),
        'inactive', COUNT(*) FILTER (WHERE status = 'inactive'),
        'total', COUNT(*)
      )
      FROM members
      WHERE gym_id = p_gym_id
    ),
    'revenue_this_month', (
      SELECT COALESCE(SUM(amount), 0)
      FROM payments
      WHERE gym_id = p_gym_id
        AND status = 'succeeded'
        AND DATE_TRUNC('month', paid_at) = DATE_TRUNC('month', CURRENT_DATE)
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 11. Function to get calendar data
CREATE OR REPLACE FUNCTION get_calendar_data(p_gym_id UUID, p_start_date DATE, p_end_date DATE)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'due_date', ps.schedule_date::TEXT,
      'member_id', m.id,
      'member_name', m.full_name,
      'member_photo', m.photo_url,
      'amount_due', ps.amount,
      'payment_status',
        CASE
          WHEN ps.status = 'paid' THEN 'paid'
          WHEN ps.schedule_date = CURRENT_DATE THEN 'due_today'
          WHEN ps.schedule_date < CURRENT_DATE THEN 'overdue'
          ELSE 'upcoming'
        END,
      'days_overdue', CURRENT_DATE - ps.schedule_date
    )
  ) INTO result
  FROM payment_schedules ps
  JOIN members m ON ps.member_id = m.id
  WHERE ps.gym_id = p_gym_id
    AND ps.schedule_date BETWEEN p_start_date AND p_end_date
    AND ps.status IN ('pending', 'paid');

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- 12. Create updated_at trigger for new tables
CREATE TRIGGER update_payment_schedules_updated_at BEFORE UPDATE ON payment_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_membership_plans_config_updated_at BEFORE UPDATE ON membership_plans_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 13. Update existing members to have proper dates
UPDATE members SET
  membership_start_date = COALESCE(membership_start_date, joining_date),
  next_payment_due_date = calculate_next_payment_due_date(id, gym_id),
  membership_end_date = CASE
    WHEN membership_end_date IS NOT NULL THEN membership_end_date
    ELSE calculate_next_payment_due_date(id, gym_id)
  END
WHERE next_payment_due_date IS NULL OR membership_end_date IS NULL;

-- 14. Create initial payment schedules for existing members
INSERT INTO payment_schedules (gym_id, member_id, schedule_date, amount, status, extends_membership_from, extends_membership_to, membership_plan)
SELECT
  m.gym_id,
  m.id as member_id,
  m.next_payment_due_date as schedule_date,
  m.plan_amount as amount,
  'pending' as status,
  m.membership_end_date as extends_membership_from,
  m.next_payment_due_date as extends_membership_to,
  m.membership_plan
FROM members m
WHERE m.next_payment_due_date >= CURRENT_DATE
  AND NOT EXISTS (
    SELECT 1 FROM payment_schedules ps
    WHERE ps.member_id = m.id AND ps.schedule_date = m.next_payment_due_date
  );

-- Comments for documentation
COMMENT ON TABLE payment_schedules IS 'Recurring payment schedule for memberships with due date tracking';
COMMENT ON TABLE membership_plans_config IS 'Configurable membership plans with pricing and grace periods';
COMMENT ON FUNCTION calculate_next_payment_due_date IS 'Calculates the next payment due date based on membership plan';
COMMENT ON FUNCTION process_membership_payment IS 'Processes payment and extends membership accordingly';
COMMENT ON FUNCTION revert_membership_payment IS 'Reverts payment and adjusts membership dates';
COMMENT ON FUNCTION update_member_statuses IS 'Updates member status based on membership validity';
COMMENT ON FUNCTION get_dashboard_stats IS 'Returns dashboard statistics for a gym';
COMMENT ON FUNCTION get_calendar_data IS 'Returns calendar data for payment visualization';

-- End of Membership Enhancements Migration