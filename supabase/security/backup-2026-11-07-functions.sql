CREATE OR REPLACE FUNCTION public.clean_old_debug_logs(retention_days integer DEFAULT 30)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    DELETE FROM gym_audit_logs WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
    DELETE FROM gym_api_logs WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
    DELETE FROM gym_navigation_logs WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
    DELETE FROM gym_click_logs WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
    DELETE FROM gym_error_logs WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
    DELETE FROM gym_performance_logs WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
    DELETE FROM gym_sessions WHERE created_at < NOW() - ((retention_days * 2) || ' days')::INTERVAL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.clear_payment_schedule_reference()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE gym_payment_schedule
  SET 
    paid_payment_id = NULL,
    paid_at = NULL,
    status = 'pending'
  WHERE paid_payment_id = OLD.id;
  
  RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.clear_receipt_reference()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  DELETE FROM gym_receipts WHERE payment_id = OLD.id;
  RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_member_with_payment(p_gym_id uuid, p_full_name text, p_phone text, p_email text DEFAULT NULL::text, p_gender text DEFAULT NULL::text, p_height text DEFAULT NULL::text, p_weight text DEFAULT NULL::text, p_photo_url text DEFAULT NULL::text, p_joining_date date DEFAULT CURRENT_DATE, p_membership_plan text DEFAULT 'monthly'::text, p_plan_amount numeric DEFAULT 1000, p_payment_method text DEFAULT 'cash'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_member RECORD;
  v_payment_id UUID;
  v_membership_end_date DATE;
  v_months INTEGER;
BEGIN
  CASE p_membership_plan
    WHEN 'monthly' THEN v_months := 1;
    WHEN 'quarterly' THEN v_months := 3;
    WHEN 'half_yearly' THEN v_months := 6;
    WHEN 'annual' THEN v_months := 12;
    ELSE v_months := 1;
  END CASE;
  
  v_membership_end_date := (p_joining_date + (v_months || ' months')::INTERVAL - INTERVAL '1 day')::DATE;
  
  INSERT INTO gym_members (
    gym_id, full_name, phone, email, gender, height, weight, photo_url,
    joining_date, membership_plan, plan_amount, status,
    membership_start_date, membership_end_date, next_payment_due_date,
    last_payment_date, last_payment_amount, total_payments_received
  ) VALUES (
    p_gym_id, p_full_name, p_phone, p_email, p_gender, p_height, p_weight, p_photo_url,
    p_joining_date, p_membership_plan, p_plan_amount, 'active',
    p_joining_date, v_membership_end_date, v_membership_end_date + INTERVAL '1 day',
    p_joining_date, p_plan_amount, p_plan_amount
  )
  RETURNING * INTO v_member;
  
  INSERT INTO gym_member_history (
    gym_id, member_id, change_type, old_value, new_value, description
  ) VALUES (
    p_gym_id, v_member.id, 'member_created', NULL,
    jsonb_build_object(
      'full_name', p_full_name, 'phone', p_phone, 'email', p_email,
      'gender', p_gender, 'membership_plan', p_membership_plan,
      'plan_amount', p_plan_amount, 'joining_date', p_joining_date,
      'membership_end_date', v_membership_end_date, 'status', 'active'
    ),
    'New member created with ' || p_membership_plan || ' plan'
  );
  
  INSERT INTO gym_payments (
    gym_id, member_id, amount, payment_method, payment_date, due_date
  ) VALUES (
    p_gym_id, v_member.id, p_plan_amount, p_payment_method, p_joining_date, p_joining_date
  )
  RETURNING id INTO v_payment_id;
  
  RETURN json_build_object(
    'success', true,
    'member', json_build_object(
      'id', v_member.id, 'gym_id', v_member.gym_id, 'full_name', v_member.full_name,
      'phone', v_member.phone, 'email', v_member.email, 'gender', v_member.gender,
      'height', v_member.height, 'weight', v_member.weight, 'photo_url', v_member.photo_url,
      'joining_date', v_member.joining_date, 'membership_plan', v_member.membership_plan,
      'plan_amount', v_member.plan_amount, 'status', v_member.status,
      'membership_start_date', v_member.membership_start_date,
      'membership_end_date', v_member.membership_end_date,
      'next_payment_due_date', v_member.next_payment_due_date,
      'last_payment_date', v_member.last_payment_date,
      'last_payment_amount', v_member.last_payment_amount,
      'total_payments_received', v_member.total_payments_received,
      'created_at', v_member.created_at, 'updated_at', v_member.updated_at
    ),
    'payment_id', v_payment_id
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM, 'error_code', SQLSTATE);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_member_with_payment(p_gym_id uuid, p_full_name text, p_phone text, p_email text DEFAULT NULL::text, p_gender text DEFAULT NULL::text, p_height text DEFAULT NULL::text, p_weight text DEFAULT NULL::text, p_photo_url text DEFAULT NULL::text, p_joining_date date DEFAULT CURRENT_DATE, p_membership_plan text DEFAULT 'monthly'::text, p_plan_amount numeric DEFAULT 1000, p_payment_method text DEFAULT 'cash'::text, p_plan_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_member RECORD;
  v_payment_id UUID;
  v_membership_end_date DATE;
  v_months INTEGER;
BEGIN
  CASE p_membership_plan
    WHEN 'monthly' THEN v_months := 1;
    WHEN 'quarterly' THEN v_months := 3;
    WHEN 'half_yearly' THEN v_months := 6;
    WHEN 'annual' THEN v_months := 12;
    ELSE v_months := 1;
  END CASE;
  
  v_membership_end_date := (p_joining_date + (v_months || ' months')::INTERVAL - INTERVAL '1 day')::DATE;
  
  INSERT INTO gym_members (
    gym_id, full_name, phone, email, gender, height, weight, photo_url,
    joining_date, membership_plan, plan_amount, status,
    membership_start_date, membership_end_date, next_payment_due_date,
    last_payment_date, last_payment_amount, total_payments_received,
    plan_id
  ) VALUES (
    p_gym_id, p_full_name, p_phone, p_email, p_gender, p_height, p_weight, p_photo_url,
    p_joining_date, p_membership_plan, p_plan_amount, 'active',
    p_joining_date, v_membership_end_date, v_membership_end_date + INTERVAL '1 day',
    p_joining_date, p_plan_amount, p_plan_amount,
    p_plan_id
  )
  RETURNING * INTO v_member;
  
  INSERT INTO gym_payments (
    gym_id, member_id, amount, payment_method, payment_date, due_date
  ) VALUES (
    p_gym_id, v_member.id, p_plan_amount, p_payment_method, p_joining_date, p_joining_date
  )
  RETURNING id INTO v_payment_id;
  
  RETURN json_build_object(
    'success', true,
    'member', json_build_object(
      'id', v_member.id, 'gym_id', v_member.gym_id, 'full_name', v_member.full_name,
      'phone', v_member.phone, 'email', v_member.email, 'gender', v_member.gender,
      'height', v_member.height, 'weight', v_member.weight, 'photo_url', v_member.photo_url,
      'joining_date', v_member.joining_date, 'membership_plan', v_member.membership_plan,
      'plan_amount', v_member.plan_amount, 'status', v_member.status,
      'membership_start_date', v_member.membership_start_date,
      'membership_end_date', v_member.membership_end_date,
      'next_payment_due_date', v_member.next_payment_due_date,
      'last_payment_date', v_member.last_payment_date,
      'last_payment_amount', v_member.last_payment_amount,
      'total_payments_received', v_member.total_payments_received,
      'created_at', v_member.created_at, 'updated_at', v_member.updated_at,
      'plan_id', v_member.plan_id
    ),
    'payment_id', v_payment_id
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM, 'error_code', SQLSTATE);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_member_with_payment(p_gym_id uuid, p_full_name text, p_phone text, p_email text DEFAULT NULL::text, p_gender text DEFAULT NULL::text, p_height text DEFAULT NULL::text, p_weight text DEFAULT NULL::text, p_photo_url text DEFAULT NULL::text, p_joining_date date DEFAULT CURRENT_DATE, p_membership_plan text DEFAULT 'monthly'::text, p_plan_amount numeric DEFAULT 1000, p_payment_method text DEFAULT 'cash'::text, p_plan_id uuid DEFAULT NULL::uuid, p_date_of_birth date DEFAULT NULL::date)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_member RECORD;
  v_payment_id UUID;
  v_membership_end_date DATE;
  v_months INTEGER;
BEGIN
  CASE p_membership_plan
    WHEN 'monthly' THEN v_months := 1;
    WHEN 'quarterly' THEN v_months := 3;
    WHEN 'half_yearly' THEN v_months := 6;
    WHEN 'annual' THEN v_months := 12;
    ELSE v_months := 1;
  END CASE;

  v_membership_end_date := (p_joining_date + (v_months || ' months')::INTERVAL - INTERVAL '1 day')::DATE;

  INSERT INTO gym_members (
    gym_id, full_name, phone, email, gender, height, weight, photo_url,
    joining_date, membership_plan, plan_amount, status,
    membership_start_date, membership_end_date, next_payment_due_date,
    last_payment_date, last_payment_amount, total_payments_received,
    date_of_birth
  ) VALUES (
    p_gym_id, p_full_name, p_phone, p_email, p_gender, p_height, p_weight, p_photo_url,
    p_joining_date, p_membership_plan, p_plan_amount, 'active',
    p_joining_date, v_membership_end_date, v_membership_end_date + INTERVAL '1 day',
    p_joining_date, p_plan_amount, p_plan_amount,
    p_date_of_birth
  )
  RETURNING * INTO v_member;

  INSERT INTO gym_member_history (
    gym_id, member_id, change_type, old_value, new_value, description
  ) VALUES (
    p_gym_id, v_member.id, 'member_created', NULL,
    jsonb_build_object(
      'full_name', p_full_name,
      'phone', p_phone,
      'email', p_email,
      'gender', p_gender,
      'membership_plan', p_membership_plan,
      'plan_amount', p_plan_amount,
      'joining_date', p_joining_date,
      'membership_end_date', v_membership_end_date,
      'status', 'active',
      'date_of_birth', p_date_of_birth
    ),
    'New member created with ' || p_membership_plan || ' plan'
  );

  INSERT INTO gym_payments (
    gym_id, member_id, amount, payment_method, payment_date, due_date
  ) VALUES (
    p_gym_id, v_member.id, p_plan_amount, p_payment_method, p_joining_date, p_joining_date
  )
  RETURNING id INTO v_payment_id;

  RETURN json_build_object(
    'success', true,
    'member', json_build_object(
      'id', v_member.id,
      'gym_id', v_member.gym_id,
      'full_name', v_member.full_name,
      'phone', v_member.phone,
      'email', v_member.email,
      'gender', v_member.gender,
      'height', v_member.height,
      'weight', v_member.weight,
      'photo_url', v_member.photo_url,
      'joining_date', v_member.joining_date,
      'membership_plan', v_member.membership_plan,
      'plan_amount', v_member.plan_amount,
      'status', v_member.status,
      'membership_start_date', v_member.membership_start_date,
      'membership_end_date', v_member.membership_end_date,
      'next_payment_due_date', v_member.next_payment_due_date,
      'last_payment_date', v_member.last_payment_date,
      'last_payment_amount', v_member.last_payment_amount,
      'total_payments_received', v_member.total_payments_received,
      'date_of_birth', v_member.date_of_birth,
      'created_at', v_member.created_at,
      'updated_at', v_member.updated_at
    ),
    'payment_id', v_payment_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'error_code', SQLSTATE
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_current_gym_id()
 RETURNS uuid
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT gym_id FROM gym_users WHERE auth_user_id = auth.uid() LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.get_debug_stats(p_gym_id uuid, p_hours integer DEFAULT 24)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.is_demo_gym(gym_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM gym_gyms 
    WHERE id = gym_uuid 
    AND (is_protected = false OR is_protected IS NULL)
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_gym_protected(gym_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM gym_gyms WHERE id = gym_uuid AND is_protected = true
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_record_version()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.revert_member_on_payment_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_previous_payment RECORD;
  v_plan_duration INTEGER;
  v_bonus_months INTEGER;
  v_total_months INTEGER;
  v_member RECORD;
  v_joining_day INTEGER;
  v_next_due DATE;
  v_end_date DATE;
  v_last_day_of_month INTEGER;
  v_has_pending_schedule BOOLEAN;
BEGIN
  -- Get member info including joining_date for day anchoring
  SELECT * INTO v_member
  FROM gym_members
  WHERE id = OLD.member_id;

  -- Get plan duration (base + bonus)
  SELECT 
    COALESCE(base_duration_months, duration_months, 1),
    COALESCE(bonus_duration_months, 0)
  INTO v_plan_duration, v_bonus_months
  FROM gym_membership_plans
  WHERE id = v_member.plan_id;

  v_total_months := COALESCE(v_plan_duration, 1) + COALESCE(v_bonus_months, 0);

  -- Get the joining day for proper anchoring (same as INSERT trigger)
  v_joining_day := EXTRACT(DAY FROM v_member.joining_date);

  -- Find the most recent REMAINING payment (excluding the one being deleted)
  SELECT * INTO v_previous_payment
  FROM gym_payments
  WHERE member_id = OLD.member_id
    AND id != OLD.id
  ORDER BY payment_date DESC
  LIMIT 1;

  -- Check for pending schedule
  SELECT EXISTS(
    SELECT 1 FROM gym_payment_schedule 
    WHERE member_id = OLD.member_id 
    AND status IN ('pending', 'overdue')
  ) INTO v_has_pending_schedule;

  IF v_previous_payment IS NULL THEN
    -- No previous payments left — revert to initial state from joining_date
    v_next_due := (v_member.joining_date + INTERVAL '1 month' * v_total_months)::DATE;
    -- Anchor to joining day with month-end clamping
    v_last_day_of_month := EXTRACT(DAY FROM (DATE_TRUNC('month', v_next_due) + INTERVAL '1 month' - INTERVAL '1 day'));
    v_next_due := DATE_TRUNC('month', v_next_due) + (LEAST(v_joining_day, v_last_day_of_month) - 1) * INTERVAL '1 day';
    v_end_date := v_next_due - INTERVAL '1 day';

    UPDATE gym_members
    SET 
      next_payment_due_date = v_next_due,
      membership_end_date = v_end_date,
      last_payment_date = NULL,
      last_payment_amount = NULL,
      total_payments_received = GREATEST(COALESCE(total_payments_received, 0) - OLD.amount, 0),
      lifetime_value = GREATEST(COALESCE(lifetime_value, 0) - OLD.amount, 0),
      updated_at = NOW()
    WHERE id = OLD.member_id;
  ELSE
    -- Previous payment exists — calculate from the previous payment's effective due
    -- Use the previous payment's paid-for period as base, then add total_months
    v_next_due := (v_previous_payment.payment_date + INTERVAL '1 month' * v_total_months)::DATE;
    -- Anchor to joining day with month-end clamping (consistent with INSERT trigger)
    v_last_day_of_month := EXTRACT(DAY FROM (DATE_TRUNC('month', v_next_due) + INTERVAL '1 month' - INTERVAL '1 day'));
    v_next_due := DATE_TRUNC('month', v_next_due) + (LEAST(v_joining_day, v_last_day_of_month) - 1) * INTERVAL '1 day';
    v_end_date := v_next_due - INTERVAL '1 day';

    UPDATE gym_members
    SET 
      next_payment_due_date = v_next_due,
      membership_end_date = v_end_date,
      last_payment_date = v_previous_payment.payment_date,
      last_payment_amount = v_previous_payment.amount,
      total_payments_received = GREATEST(COALESCE(total_payments_received, 0) - OLD.amount, 0),
      lifetime_value = GREATEST(COALESCE(lifetime_value, 0) - OLD.amount, 0),
      updated_at = NOW()
    WHERE id = OLD.member_id;
  END IF;

  -- Update status based on membership end date
  UPDATE gym_members
  SET status = CASE 
    WHEN v_has_pending_schedule THEN 'active'
    WHEN membership_end_date < CURRENT_DATE THEN 'inactive'
    ELSE 'active'
  END
  WHERE id = OLD.member_id;

  RETURN OLD;
END;
$function$
;
