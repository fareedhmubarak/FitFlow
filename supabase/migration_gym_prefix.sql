-- ==========================================
-- FITFLOW - SIMPLIFIED GYM MANAGEMENT
-- Database Schema with gym_ prefix
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ==========================================
-- TABLE 1: gym_gyms (Master tenant table)
-- ==========================================
CREATE TABLE gym_gyms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Basic Info
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  
  -- Settings
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'te', 'ta', 'hi')),
  timezone TEXT DEFAULT 'Asia/Kolkata',
  currency TEXT DEFAULT 'INR',
  
  -- Branding
  logo_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gym_gyms_email ON gym_gyms(email);

COMMENT ON TABLE gym_gyms IS 'Master gym/tenant table';

-- ==========================================
-- TABLE 2: gym_users (Staff & Owners)
-- ==========================================
CREATE TABLE gym_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gym_gyms(id) ON DELETE CASCADE,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- User Info
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  
  -- Role
  role TEXT DEFAULT 'owner' CHECK (role IN ('owner', 'staff')),
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique Constraints
  UNIQUE(gym_id, email),
  UNIQUE(auth_user_id)
);

CREATE INDEX idx_gym_users_gym_id ON gym_users(gym_id);
CREATE INDEX idx_gym_users_auth_user_id ON gym_users(auth_user_id);

COMMENT ON TABLE gym_users IS 'Links Supabase auth users to gyms';

-- ==========================================
-- TABLE 3: gym_members (Gym members)
-- ==========================================
CREATE TABLE gym_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gym_gyms(id) ON DELETE CASCADE,
  
  -- Personal Info
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  
  -- Physical Stats
  height TEXT, -- e.g., "5'10" or "178cm"
  weight TEXT, -- e.g., "75kg"
  
  -- Photo
  photo_url TEXT,
  
  -- Membership Details (CRITICAL FIELDS)
  joining_date DATE NOT NULL,
  membership_plan TEXT NOT NULL CHECK (membership_plan IN ('monthly', 'quarterly', 'half_yearly', 'annual')),
  plan_amount DECIMAL(10,2) NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique Constraints
  UNIQUE(gym_id, phone)
);

CREATE INDEX idx_gym_members_gym_id ON gym_members(gym_id);
CREATE INDEX idx_gym_members_status ON gym_members(gym_id, status);
CREATE INDEX idx_gym_members_joining_date ON gym_members(gym_id, joining_date);
CREATE INDEX idx_gym_members_phone ON gym_members(gym_id, phone);
CREATE INDEX idx_gym_members_plan ON gym_members(gym_id, membership_plan);

COMMENT ON TABLE gym_members IS 'Gym members with membership info';
COMMENT ON COLUMN gym_members.joining_date IS 'CRITICAL: Base date for all payment calculations';

-- ==========================================
-- TABLE 4: gym_payments (Payment records)
-- ==========================================
CREATE TABLE gym_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gym_gyms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
  
  -- Payment Details
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'upi', 'card', 'bank_transfer')),
  payment_date DATE NOT NULL,
  
  -- Due Date Tracking (CRITICAL)
  due_date DATE NOT NULL,
  days_late INTEGER GENERATED ALWAYS AS (
    CASE 
      WHEN payment_date > due_date 
      THEN (payment_date - due_date)::INTEGER
      ELSE 0
    END
  ) STORED,
  
  -- Notes
  notes TEXT,
  receipt_number TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gym_payments_gym_id ON gym_payments(gym_id);
CREATE INDEX idx_gym_payments_member_id ON gym_payments(member_id);
CREATE INDEX idx_gym_payments_due_date ON gym_payments(gym_id, due_date);
CREATE INDEX idx_gym_payments_payment_date ON gym_payments(gym_id, payment_date);

COMMENT ON TABLE gym_payments IS 'All payment transactions';
COMMENT ON COLUMN gym_payments.days_late IS 'Auto-calculated late days';

-- ==========================================
-- TABLE 5: gym_payment_schedule (Pre-calculated dues)
-- ==========================================
CREATE TABLE gym_payment_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gym_gyms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
  
  -- Due Date Info
  due_date DATE NOT NULL,
  amount_due DECIMAL(10,2) NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  paid_payment_id UUID REFERENCES gym_payments(id),
  paid_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique Constraint
  UNIQUE(member_id, due_date)
);

CREATE INDEX idx_gym_payment_schedule_gym_id ON gym_payment_schedule(gym_id);
CREATE INDEX idx_gym_payment_schedule_member_id ON gym_payment_schedule(member_id);
CREATE INDEX idx_gym_payment_schedule_due_date ON gym_payment_schedule(gym_id, due_date);
CREATE INDEX idx_gym_payment_schedule_status ON gym_payment_schedule(gym_id, status, due_date);

-- CRITICAL INDEX for calendar queries
CREATE INDEX idx_gym_payment_schedule_calendar 
ON gym_payment_schedule(gym_id, due_date, status) 
WHERE status != 'paid';

COMMENT ON TABLE gym_payment_schedule IS 'Pre-calculated payment schedule for fast calendar queries';

-- ==========================================
-- FUNCTIONS
-- ==========================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Generate receipt number
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Function: Calculate cycle days based on plan
CREATE OR REPLACE FUNCTION get_cycle_days(p_membership_plan TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE p_membership_plan
    WHEN 'monthly' THEN 30
    WHEN 'quarterly' THEN 90
    WHEN 'half_yearly' THEN 180
    WHEN 'annual' THEN 365
    ELSE 30
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Generate payment schedule for a member
CREATE OR REPLACE FUNCTION generate_payment_schedule(
  p_member_id UUID,
  p_months_ahead INTEGER DEFAULT 12
)
RETURNS VOID AS $$
DECLARE
  v_member RECORD;
  v_due_date DATE;
  v_cycle_days INTEGER;
  v_iterations INTEGER;
  v_count INTEGER := 0;
BEGIN
  -- Get member details
  SELECT * INTO v_member 
  FROM gym_members 
  WHERE id = p_member_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found';
  END IF;
  
  -- Get cycle days
  v_cycle_days := get_cycle_days(v_member.membership_plan);
  
  -- Calculate iterations
  v_iterations := CEIL((p_months_ahead * 30.0) / v_cycle_days);
  
  -- Start from joining date
  v_due_date := v_member.joining_date;
  
  -- Generate schedule entries
  WHILE v_count < v_iterations LOOP
    INSERT INTO gym_payment_schedule (
      gym_id, 
      member_id, 
      due_date, 
      amount_due,
      status
    )
    VALUES (
      v_member.gym_id, 
      p_member_id, 
      v_due_date, 
      v_member.plan_amount,
      CASE 
        WHEN v_due_date > CURRENT_DATE THEN 'pending'
        ELSE 'overdue'
      END
    )
    ON CONFLICT (member_id, due_date) DO NOTHING;
    
    v_due_date := v_due_date + (v_cycle_days || ' days')::INTERVAL;
    v_count := v_count + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function: Update payment schedule status when payment made
CREATE OR REPLACE FUNCTION update_payment_schedule_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark corresponding schedule entry as paid
  UPDATE gym_payment_schedule
  SET 
    status = 'paid',
    paid_payment_id = NEW.id,
    paid_at = NOW(),
    updated_at = NOW()
  WHERE member_id = NEW.member_id
    AND due_date = NEW.due_date;
  
  -- If no schedule entry exists, create one
  IF NOT FOUND THEN
    INSERT INTO gym_payment_schedule (
      gym_id,
      member_id,
      due_date,
      amount_due,
      status,
      paid_payment_id,
      paid_at
    )
    VALUES (
      NEW.gym_id,
      NEW.member_id,
      NEW.due_date,
      NEW.amount,
      'paid',
      NEW.id,
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Get calendar data for a month
CREATE OR REPLACE FUNCTION get_calendar_data(
  p_gym_id UUID,
  p_year INTEGER,
  p_month INTEGER
)
RETURNS TABLE (
  due_date DATE,
  member_id UUID,
  member_name TEXT,
  member_photo TEXT,
  amount_due DECIMAL,
  payment_status TEXT,
  days_overdue INTEGER
) AS $$
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
      WHEN EXISTS (
        SELECT 1 
        FROM gym_payment_schedule ps2 
        WHERE ps2.member_id = ps.member_id 
        AND ps2.due_date < ps.due_date 
        AND ps2.status = 'overdue'
      ) THEN 'overdue_multiple'
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
$$ LANGUAGE plpgsql;

-- Function: Get dashboard stats
CREATE OR REPLACE FUNCTION get_dashboard_stats(
  p_gym_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'due_today', (
      SELECT json_build_object(
        'count', COUNT(*),
        'amount', COALESCE(SUM(amount_due), 0),
        'members', json_agg(
          json_build_object(
            'id', m.id,
            'name', m.full_name,
            'photo', m.photo_url,
            'amount', ps.amount_due
          )
        )
      )
      FROM gym_payment_schedule ps
      JOIN gym_members m ON m.id = ps.member_id
      WHERE ps.gym_id = p_gym_id
        AND ps.due_date = p_date
        AND ps.status IN ('pending', 'overdue')
        AND m.status = 'active'
    ),
    'overdue_this_month', (
      SELECT json_build_object(
        'count', COUNT(*),
        'amount', COALESCE(SUM(amount_due), 0),
        'members', json_agg(
          json_build_object(
            'id', m.id,
            'name', m.full_name,
            'photo', m.photo_url,
            'amount', ps.amount_due,
            'due_date', ps.due_date,
            'days_overdue', (CURRENT_DATE - ps.due_date)::INTEGER
          )
        )
      )
      FROM gym_payment_schedule ps
      JOIN gym_members m ON m.id = ps.member_id
      WHERE ps.gym_id = p_gym_id
        AND ps.status = 'overdue'
        AND DATE_TRUNC('month', ps.due_date) = DATE_TRUNC('month', p_date)
        AND m.status = 'active'
    ),
    'total_members', (
      SELECT json_build_object(
        'active', COUNT(*) FILTER (WHERE status = 'active'),
        'inactive', COUNT(*) FILTER (WHERE status = 'inactive'),
        'total', COUNT(*)
      )
      FROM gym_members
      WHERE gym_id = p_gym_id
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
$$ LANGUAGE plpgsql;

-- ==========================================
-- TRIGGERS
-- ==========================================

-- Trigger: Update updated_at on gym_gyms
CREATE TRIGGER trigger_gym_gyms_updated_at
  BEFORE UPDATE ON gym_gyms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Update updated_at on gym_users
CREATE TRIGGER trigger_gym_users_updated_at
  BEFORE UPDATE ON gym_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Update updated_at on gym_members
CREATE TRIGGER trigger_gym_members_updated_at
  BEFORE UPDATE ON gym_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Generate receipt number on payment
CREATE TRIGGER trigger_generate_receipt_number
  BEFORE INSERT ON gym_payments
  FOR EACH ROW
  EXECUTE FUNCTION generate_receipt_number();

-- Trigger: Auto-generate payment schedule on member insert
CREATE OR REPLACE FUNCTION trigger_generate_payment_schedule()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM generate_payment_schedule(NEW.id, 12);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_member_create_schedule
  AFTER INSERT ON gym_members
  FOR EACH ROW
  EXECUTE FUNCTION trigger_generate_payment_schedule();

-- Trigger: Update payment schedule when payment made
CREATE TRIGGER trigger_payment_update_schedule
  AFTER INSERT ON gym_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_schedule_status();

-- Trigger: Update payment_schedule updated_at
CREATE TRIGGER trigger_gym_payment_schedule_updated_at
  BEFORE UPDATE ON gym_payment_schedule
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- HELPER FUNCTION for RLS
-- ==========================================
CREATE OR REPLACE FUNCTION get_current_gym_id()
RETURNS UUID AS $$
  SELECT gym_id 
  FROM gym_users 
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

COMMENT ON FUNCTION get_current_gym_id IS 'Returns gym_id for authenticated user (used in RLS)';

-- ==========================================
-- SUCCESS MESSAGE
-- ==========================================
DO $$
BEGIN
  RAISE NOTICE '✅ Database schema created successfully!';
  RAISE NOTICE '📊 Tables: gym_gyms, gym_users, gym_members, gym_payments, gym_payment_schedule';
  RAISE NOTICE '🔧 Functions: generate_payment_schedule, get_calendar_data, get_dashboard_stats';
  RAISE NOTICE '⚡ Triggers: Auto-generate schedules, receipt numbers, timestamps';
  RAISE NOTICE '🔒 Next: Run RLS policies migration';
END $$;









