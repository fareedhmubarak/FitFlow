-- =====================================================
-- FITFLOW PRODUCTION MIGRATION - FUNCTIONS & TRIGGERS
-- Date: December 6, 2025
-- =====================================================

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Get current gym ID for RLS
CREATE OR REPLACE FUNCTION get_current_gym_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT gym_id FROM gym_users WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- Check if gym is demo/protected
CREATE OR REPLACE FUNCTION is_demo_gym(gym_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM gym_gyms 
    WHERE id = gym_uuid 
    AND (is_protected = false OR is_protected IS NULL)
  );
END;
$$;

CREATE OR REPLACE FUNCTION is_gym_protected(gym_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM gym_gyms WHERE id = gym_uuid AND is_protected = true
  );
END;
$$;

-- Get cycle days for membership plan
CREATE OR REPLACE FUNCTION get_cycle_days(p_membership_plan TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE p_membership_plan
    WHEN 'monthly' THEN 30
    WHEN 'quarterly' THEN 90
    WHEN 'half_yearly' THEN 180
    WHEN 'annual' THEN 365
    ELSE 30
  END;
END;
$$;

-- =====================================================
-- MEMBERSHIP CALCULATION FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_membership_end_date(
  p_start_date DATE,
  p_duration_months INTEGER,
  p_bonus_months INTEGER DEFAULT 0
)
RETURNS DATE
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN p_start_date + INTERVAL '1 month' * (p_duration_months + COALESCE(p_bonus_months, 0));
END;
$$;

-- =====================================================
-- RECEIPT NUMBER GENERATION
-- =====================================================

CREATE OR REPLACE FUNCTION generate_receipt_number(p_gym_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_prefix TEXT;
  v_counter INTEGER;
  v_year TEXT;
BEGIN
  SELECT 
    COALESCE(receipt_prefix, 'RCP'),
    COALESCE(receipt_counter, 0) + 1
  INTO v_prefix, v_counter
  FROM gym_gyms
  WHERE id = p_gym_id;
  
  UPDATE gym_gyms
  SET receipt_counter = v_counter
  WHERE id = p_gym_id;
  
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  RETURN v_prefix || '-' || v_year || '-' || LPAD(v_counter::TEXT, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.receipt_number := 'RCP-' || 
    TO_CHAR(NOW(), 'YYYY') || '-' ||
    LPAD(
      (SELECT COUNT(*) + 1 
       FROM gym_payments 
       WHERE gym_id = NEW.gym_id 
       AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
      )::TEXT, 
      5, '0'
    );
  RETURN NEW;
END;
$$;

-- =====================================================
-- PAYMENT SCHEDULE GENERATION (DEPRECATED)
-- =====================================================
-- NOTE: The old generate_payment_schedule function that created 12 future
-- payment records has been REMOVED. This was incorrect logic.
--
-- CORRECT FLOW:
-- 1. Member joins and makes payment
-- 2. Payment triggers update_payment_schedule_status()
-- 3. That function creates ONLY ONE next payment_schedule record
-- 4. Each payment creates the next due date - no pre-generation
--
-- The old functions are kept commented for reference:
-- generate_payment_schedule() - REMOVED (created 12 records incorrectly)
-- trigger_generate_payment_schedule() - REMOVED (triggered on member insert)

-- =====================================================
-- PAYMENT PROCESSING
-- =====================================================

CREATE OR REPLACE FUNCTION update_member_status_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_member RECORD;
  v_plan_duration INTEGER;
  v_bonus_months INTEGER;
  v_total_duration INTEGER;
  v_joining_day INTEGER;
  v_current_due_date DATE;
  v_new_end_date DATE;
  v_next_due_date DATE;
BEGIN
  -- Get member details including joining date
  SELECT 
    m.id,
    m.joining_date,
    m.next_payment_due_date,
    m.membership_end_date,
    COALESCE(p.base_duration_months, p.duration_months, 1) as plan_duration,
    COALESCE(p.bonus_duration_months, 0) as bonus_months
  INTO v_member
  FROM gym_members m
  LEFT JOIN gym_membership_plans p ON p.id = m.plan_id
  WHERE m.id = NEW.member_id;
  
  -- Get the day of month from joining date (this is the ANCHOR)
  v_joining_day := EXTRACT(DAY FROM v_member.joining_date)::INTEGER;
  
  -- Get plan duration
  v_plan_duration := COALESCE(v_member.plan_duration, 1);
  v_bonus_months := COALESCE(v_member.bonus_months, 0);
  v_total_duration := v_plan_duration + v_bonus_months;
  
  -- Current due date (the one being paid for)
  v_current_due_date := COALESCE(v_member.next_payment_due_date, v_member.joining_date);
  
  -- Add months to current due date
  v_next_due_date := v_current_due_date + (v_total_duration || ' months')::INTERVAL;
  
  -- Adjust the day to match joining day
  IF v_joining_day > EXTRACT(DAY FROM (DATE_TRUNC('month', v_next_due_date) + INTERVAL '1 month' - INTERVAL '1 day'))::INTEGER THEN
    v_next_due_date := DATE_TRUNC('month', v_next_due_date) + INTERVAL '1 month' - INTERVAL '1 day';
  ELSE
    v_next_due_date := DATE_TRUNC('month', v_next_due_date) + ((v_joining_day - 1) || ' days')::INTERVAL;
  END IF;
  
  -- Membership end date is day before next due date
  v_new_end_date := v_next_due_date - INTERVAL '1 day';
  
  -- Update member record
  UPDATE gym_members
  SET 
    membership_end_date = v_new_end_date,
    next_payment_due_date = v_next_due_date,
    last_payment_date = NEW.payment_date,
    last_payment_amount = NEW.amount,
    total_payments_received = COALESCE(total_payments_received, 0) + NEW.amount,
    lifetime_value = COALESCE(lifetime_value, 0) + NEW.amount,
    status = 'active',
    updated_at = NOW()
  WHERE id = NEW.member_id;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_payment_schedule_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_next_due_date DATE;
BEGIN
  -- Mark current payment schedule as paid
  UPDATE gym_payment_schedule
  SET status = 'paid', paid_payment_id = NEW.id, paid_at = NOW(), updated_at = NOW()
  WHERE member_id = NEW.member_id AND due_date = NEW.due_date;
  
  -- If no existing schedule found, create the paid record
  IF NOT FOUND THEN
    INSERT INTO gym_payment_schedule (gym_id, member_id, due_date, amount_due, status, paid_payment_id, paid_at)
    VALUES (NEW.gym_id, NEW.member_id, NEW.due_date, NEW.amount, 'paid', NEW.id, NOW());
  END IF;
  
  -- Get the updated next_payment_due_date from the member (set by update_member_status_on_payment)
  SELECT next_payment_due_date INTO v_next_due_date
  FROM gym_members WHERE id = NEW.member_id;
  
  -- Create ONLY ONE next payment schedule record (the next due date)
  IF v_next_due_date IS NOT NULL THEN
    INSERT INTO gym_payment_schedule (gym_id, member_id, due_date, amount_due, status)
    SELECT NEW.gym_id, NEW.member_id, v_next_due_date, plan_amount, 'pending'
    FROM gym_members WHERE id = NEW.member_id
    ON CONFLICT (member_id, due_date) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- =====================================================
-- CLEANUP FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION clear_payment_schedule_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE gym_payment_schedule
  SET 
    paid_payment_id = NULL,
    paid_at = NULL,
    status = 'pending'
  WHERE paid_payment_id = OLD.id;
  
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION clear_receipt_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM gym_receipts WHERE payment_id = OLD.id;
  RETURN OLD;
END;
$$;

-- =====================================================
-- VERSION LOGGING
-- =====================================================

CREATE OR REPLACE FUNCTION log_record_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_record_id TEXT;
    v_old_data JSONB;
    v_new_data JSONB;
    v_changed_fields TEXT[];
    v_changed_by UUID;
BEGIN
    BEGIN
        v_changed_by := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_changed_by := NULL;
    END;

    IF TG_OP = 'DELETE' THEN
        v_record_id := COALESCE(OLD.id::TEXT, (row_to_json(OLD)::jsonb->>'id'));
        v_old_data := row_to_json(OLD)::JSONB;
        v_new_data := NULL;
        v_changed_fields := NULL;
        
    ELSIF TG_OP = 'INSERT' THEN
        v_record_id := COALESCE(NEW.id::TEXT, (row_to_json(NEW)::jsonb->>'id'));
        v_old_data := NULL;
        v_new_data := row_to_json(NEW)::JSONB;
        v_changed_fields := NULL;
        
    ELSIF TG_OP = 'UPDATE' THEN
        v_record_id := COALESCE(NEW.id::TEXT, (row_to_json(NEW)::jsonb->>'id'));
        v_old_data := row_to_json(OLD)::JSONB;
        v_new_data := row_to_json(NEW)::JSONB;
        
        v_changed_fields := ARRAY(
            SELECT key 
            FROM jsonb_each(v_new_data) 
            WHERE v_old_data->key IS DISTINCT FROM v_new_data->key
        );
        
        IF array_length(v_changed_fields, 1) IS NULL OR array_length(v_changed_fields, 1) = 0 THEN
            RETURN NEW;
        END IF;
    END IF;

    INSERT INTO record_versions (
        table_name, record_id, operation, old_data, new_data, changed_fields, changed_by
    ) VALUES (
        TG_TABLE_NAME, v_record_id, TG_OP, v_old_data, v_new_data, v_changed_fields, v_changed_by
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION prevent_hard_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'HARD DELETE NOT ALLOWED: Use soft delete by setting status to ''deleted'' instead. Record ID: %, Table: %', 
        OLD.id, TG_TABLE_NAME;
    RETURN NULL;
END;
$$;

-- =====================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- =====================================================
-- DASHBOARD STATS FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_dashboard_stats(p_gym_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'due_today', (
      SELECT json_build_object(
        'count', COUNT(*),
        'amount', COALESCE(SUM(CASE WHEN mp.price IS NOT NULL THEN mp.price ELSE m.plan_amount END), 0),
        'members', COALESCE(json_agg(json_build_object(
          'id', m.id, 'name', m.full_name, 'phone', m.phone,
          'photo', m.photo_url, 'amount', COALESCE(mp.price, m.plan_amount, 0)
        )) FILTER (WHERE m.id IS NOT NULL), '[]'::json)
      )
      FROM gym_members m
      LEFT JOIN gym_membership_plans mp ON mp.id = m.plan_id
      WHERE m.gym_id = p_gym_id AND m.next_payment_due_date = p_date AND m.status = 'active'
    ),
    'overdue_this_month', (
      SELECT json_build_object(
        'count', COUNT(*),
        'amount', COALESCE(SUM(CASE WHEN mp.price IS NOT NULL THEN mp.price ELSE m.plan_amount END), 0),
        'members', COALESCE(json_agg(json_build_object(
          'id', m.id, 'name', m.full_name, 'phone', m.phone, 'photo', m.photo_url,
          'amount', COALESCE(mp.price, m.plan_amount, 0),
          'due_date', m.next_payment_due_date,
          'days_overdue', (CURRENT_DATE - m.next_payment_due_date)::INTEGER
        )) FILTER (WHERE m.id IS NOT NULL), '[]'::json)
      )
      FROM gym_members m
      LEFT JOIN gym_membership_plans mp ON mp.id = m.plan_id
      WHERE m.gym_id = p_gym_id
        AND m.next_payment_due_date < p_date
        AND DATE_TRUNC('month', m.next_payment_due_date) = DATE_TRUNC('month', p_date)
        AND m.status = 'active'
    ),
    'total_members', (
      SELECT json_build_object(
        'active', COUNT(*) FILTER (WHERE status = 'active'),
        'inactive', COUNT(*) FILTER (WHERE status = 'inactive'),
        'total', COUNT(*)
      )
      FROM gym_members WHERE gym_id = p_gym_id
    ),
    'revenue_this_month', (
      SELECT COALESCE(SUM(amount), 0)
      FROM gym_payments
      WHERE gym_id = p_gym_id
        AND DATE_TRUNC('month', payment_date) = DATE_TRUNC('month', p_date)
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- =====================================================
-- CALENDAR DATA FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_calendar_data(
  p_gym_id UUID,
  p_year INTEGER,
  p_month INTEGER
)
RETURNS TABLE(
  due_date DATE,
  member_id UUID,
  member_name TEXT,
  member_photo TEXT,
  amount_due NUMERIC,
  payment_status TEXT,
  days_overdue INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.due_date,
    m.id,
    m.full_name,
    m.photo_url,
    ps.amount_due,
    CASE 
      WHEN ps.status = 'paid' THEN 'paid'
      WHEN ps.due_date > CURRENT_DATE THEN 'upcoming'
      WHEN ps.due_date = CURRENT_DATE THEN 'due_today'
      WHEN EXISTS (SELECT 1 FROM gym_payment_schedule ps2 
                   WHERE ps2.member_id = ps.member_id 
                   AND ps2.due_date < ps.due_date 
                   AND ps2.status = 'overdue') THEN 'overdue_multiple'
      ELSE 'overdue'
    END,
    CASE 
      WHEN ps.due_date < CURRENT_DATE AND ps.status != 'paid' 
      THEN (CURRENT_DATE - ps.due_date)::INTEGER 
      ELSE 0 
    END
  FROM gym_payment_schedule ps
  JOIN gym_members m ON m.id = ps.member_id
  WHERE ps.gym_id = p_gym_id 
    AND m.status = 'active'
    AND EXTRACT(YEAR FROM ps.due_date) = p_year
    AND EXTRACT(MONTH FROM ps.due_date) = p_month
  ORDER BY ps.due_date, m.full_name;
END;
$$;

-- =====================================================
-- DEBUG STATS FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_debug_stats(p_gym_id UUID, p_hours INTEGER DEFAULT 24)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'total_audit_logs', (SELECT COUNT(*) FROM gym_audit_logs WHERE gym_id = p_gym_id AND created_at > NOW() - (p_hours || ' hours')::INTERVAL),
        'total_api_calls', (SELECT COUNT(*) FROM gym_api_logs WHERE gym_id = p_gym_id AND created_at > NOW() - (p_hours || ' hours')::INTERVAL),
        'total_errors', (SELECT COUNT(*) FROM gym_error_logs WHERE gym_id = p_gym_id AND created_at > NOW() - (p_hours || ' hours')::INTERVAL),
        'total_sessions', (SELECT COUNT(*) FROM gym_sessions WHERE gym_id = p_gym_id AND created_at > NOW() - (p_hours || ' hours')::INTERVAL),
        'active_sessions', (SELECT COUNT(*) FROM gym_sessions WHERE gym_id = p_gym_id AND is_active = true),
        'avg_response_time', (SELECT COALESCE(AVG(duration_ms), 0) FROM gym_api_logs WHERE gym_id = p_gym_id AND created_at > NOW() - (p_hours || ' hours')::INTERVAL),
        'error_rate', (
            SELECT CASE 
                WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE success = false)::DECIMAL / COUNT(*)) * 100, 2)
                ELSE 0
            END
            FROM gym_api_logs WHERE gym_id = p_gym_id AND created_at > NOW() - (p_hours || ' hours')::INTERVAL
        )
    ) INTO v_result;
    
    RETURN v_result;
END;
$$;
