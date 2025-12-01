# FitFlow - Supabase Database Setup
## Complete SQL Migration Script

**Version:** 1.0  
**Date:** November 26, 2025  
**Purpose:** Copy-paste ready SQL for Supabase  
**Security:** Row Level Security (RLS) enabled on all tables

---

## 🚀 QUICK START

### Step 1: Create Supabase Project
1. Go to https://supabase.com
2. Click "New Project"
3. Name: `fitflow-gym-app`
4. Database Password: (save it securely)
5. Region: Choose closest to India (Singapore/Mumbai)
6. Wait 2-3 minutes for project creation

### Step 2: Run SQL Migrations
1. Go to SQL Editor in Supabase dashboard
2. Copy-paste each section below in order
3. Click "Run" after each section

### Step 3: Setup Storage
1. Go to Storage section
2. Create buckets (explained below)

---

## 📊 DATABASE SCHEMA

### Migration 1: Enable Extensions

```sql
-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_stat_statements for query performance monitoring
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
```

**Run this first!** ✅

---

### Migration 2: Create Core Tables

```sql
-- ==========================================
-- TABLE 1: gyms (Master tenant table)
-- ==========================================
CREATE TABLE gyms (
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
  logo_url TEXT, -- Stored in Supabase Storage
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE gyms IS 'Master table for gym/tenant information';
COMMENT ON COLUMN gyms.logo_url IS 'Logo stored in gym-logos bucket';

-- ==========================================
-- TABLE 2: gym_users (Authentication & Staff)
-- ==========================================
CREATE TABLE gym_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- User Info
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  
  -- Role & Access
  role TEXT DEFAULT 'owner' CHECK (role IN ('owner', 'staff')),
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique Constraints
  UNIQUE(gym_id, email),
  UNIQUE(auth_user_id)
);

COMMENT ON TABLE gym_users IS 'Links auth users to gyms with roles';
COMMENT ON COLUMN gym_users.auth_user_id IS 'References Supabase auth.users table';

-- ==========================================
-- TABLE 3: members (Gym members)
-- ==========================================
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  
  -- Personal Info
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  
  -- Physical Stats
  height TEXT, -- e.g., "5'10" or "178cm"
  weight TEXT, -- e.g., "75kg"
  
  -- Photo
  photo_url TEXT, -- Stored in member-photos bucket
  
  -- Membership Details
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

COMMENT ON TABLE members IS 'Gym members with membership details';
COMMENT ON COLUMN members.joining_date IS 'Critical: Determines all future due dates';
COMMENT ON COLUMN members.photo_url IS 'Photo stored in member-photos bucket';

-- ==========================================
-- TABLE 4: payments (Payment records)
-- ==========================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  
  -- Payment Details
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'upi', 'card', 'bank_transfer')),
  payment_date DATE NOT NULL,
  
  -- Due Date Tracking
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
  
  -- Receipt
  receipt_number TEXT, -- Auto-generated
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE payments IS 'All payment transactions';
COMMENT ON COLUMN payments.days_late IS 'Auto-calculated: How many days late the payment was';

-- ==========================================
-- TABLE 5: payment_schedule (Pre-calculated due dates)
-- ==========================================
CREATE TABLE payment_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  
  -- Due Date Info
  due_date DATE NOT NULL,
  amount_due DECIMAL(10,2) NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  paid_payment_id UUID REFERENCES payments(id),
  paid_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique Constraint
  UNIQUE(member_id, due_date)
);

COMMENT ON TABLE payment_schedule IS 'Pre-calculated payment schedule for fast calendar queries';
COMMENT ON COLUMN payment_schedule.status IS 'Updated automatically by triggers';
```

**Run this second!** ✅

---

### Migration 3: Create Indexes (Performance)

```sql
-- ==========================================
-- INDEXES for gym_users
-- ==========================================
CREATE INDEX idx_gym_users_gym_id ON gym_users(gym_id);
CREATE INDEX idx_gym_users_auth_id ON gym_users(auth_user_id);
CREATE INDEX idx_gym_users_email ON gym_users(gym_id, email);

-- ==========================================
-- INDEXES for members
-- ==========================================
CREATE INDEX idx_members_gym_id ON members(gym_id);
CREATE INDEX idx_members_status ON members(gym_id, status);
CREATE INDEX idx_members_joining_date ON members(gym_id, joining_date);
CREATE INDEX idx_members_phone ON members(gym_id, phone);
CREATE INDEX idx_members_plan ON members(gym_id, membership_plan);

-- ==========================================
-- INDEXES for payments
-- ==========================================
CREATE INDEX idx_payments_gym_id ON payments(gym_id);
CREATE INDEX idx_payments_member_id ON payments(member_id);
CREATE INDEX idx_payments_due_date ON payments(gym_id, due_date);
CREATE INDEX idx_payments_payment_date ON payments(gym_id, payment_date);
CREATE INDEX idx_payments_method ON payments(gym_id, payment_method);

-- ==========================================
-- INDEXES for payment_schedule
-- ==========================================
CREATE INDEX idx_payment_schedule_gym_id ON payment_schedule(gym_id);
CREATE INDEX idx_payment_schedule_member_id ON payment_schedule(member_id);
CREATE INDEX idx_payment_schedule_due_date ON payment_schedule(gym_id, due_date);
CREATE INDEX idx_payment_schedule_status ON payment_schedule(gym_id, status, due_date);

-- Composite index for calendar queries (most important!)
CREATE INDEX idx_payment_schedule_calendar 
ON payment_schedule(gym_id, due_date, status) 
WHERE status != 'paid';

COMMENT ON INDEX idx_payment_schedule_calendar IS 'Optimizes calendar page queries';
```

**Run this third!** ✅

---

### Migration 4: Database Functions

```sql
-- ==========================================
-- FUNCTION: Update updated_at timestamp
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- FUNCTION: Generate receipt number
-- ==========================================
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.receipt_number := 'RCP-' || 
    TO_CHAR(NOW(), 'YYYY') || '-' ||
    LPAD(
      (SELECT COUNT(*) + 1 
       FROM payments 
       WHERE gym_id = NEW.gym_id 
       AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
      )::TEXT, 
      5, '0'
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- FUNCTION: Calculate next due date
-- ==========================================
CREATE OR REPLACE FUNCTION calculate_next_due_date(
  p_joining_date DATE,
  p_membership_plan TEXT
)
RETURNS DATE AS $$
DECLARE
  v_cycle_days INTEGER;
BEGIN
  -- Get cycle duration in days
  v_cycle_days := CASE p_membership_plan
    WHEN 'monthly' THEN 30
    WHEN 'quarterly' THEN 90
    WHEN 'half_yearly' THEN 180
    WHEN 'annual' THEN 365
    ELSE 30
  END;
  
  -- Return joining date + cycle
  RETURN p_joining_date + (v_cycle_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ==========================================
-- FUNCTION: Generate payment schedule for member
-- ==========================================
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
  FROM members 
  WHERE id = p_member_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found';
  END IF;
  
  -- Determine cycle days
  v_cycle_days := CASE v_member.membership_plan
    WHEN 'monthly' THEN 30
    WHEN 'quarterly' THEN 90
    WHEN 'half_yearly' THEN 180
    WHEN 'annual' THEN 365
  END;
  
  -- Calculate iterations
  v_iterations := CEIL((p_months_ahead * 30.0) / v_cycle_days);
  
  -- Start from joining date
  v_due_date := v_member.joining_date;
  
  -- Generate schedule entries
  WHILE v_count < v_iterations LOOP
    INSERT INTO payment_schedule (
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
  
  RAISE NOTICE 'Generated % schedule entries for member %', v_count, p_member_id;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- FUNCTION: Update payment schedule status
-- ==========================================
CREATE OR REPLACE FUNCTION update_payment_schedule_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark corresponding schedule entry as paid
  UPDATE payment_schedule
  SET 
    status = 'paid',
    paid_payment_id = NEW.id,
    paid_at = NOW(),
    updated_at = NOW()
  WHERE member_id = NEW.member_id
    AND due_date = NEW.due_date;
  
  -- If no schedule entry exists, create one
  IF NOT FOUND THEN
    INSERT INTO payment_schedule (
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

-- ==========================================
-- FUNCTION: Get calendar data for a month
-- ==========================================
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
        FROM payment_schedule ps2 
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
  FROM payment_schedule ps
  JOIN members m ON m.id = ps.member_id
  WHERE ps.gym_id = p_gym_id
    AND m.status = 'active'
    AND EXTRACT(YEAR FROM ps.due_date) = p_year
    AND EXTRACT(MONTH FROM ps.due_date) = p_month
  ORDER BY ps.due_date, m.full_name;
END;
$$ LANGUAGE plpgsql;
```

**Run this fourth!** ✅

---

### Migration 5: Create Triggers

```sql
-- ==========================================
-- TRIGGER: Update updated_at on gyms
-- ==========================================
CREATE TRIGGER trigger_gyms_updated_at
  BEFORE UPDATE ON gyms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- TRIGGER: Update updated_at on gym_users
-- ==========================================
CREATE TRIGGER trigger_gym_users_updated_at
  BEFORE UPDATE ON gym_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- TRIGGER: Update updated_at on members
-- ==========================================
CREATE TRIGGER trigger_members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- TRIGGER: Generate receipt number on payment
-- ==========================================
CREATE TRIGGER trigger_generate_receipt_number
  BEFORE INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION generate_receipt_number();

-- ==========================================
-- TRIGGER: Auto-generate payment schedule on member insert
-- ==========================================
CREATE OR REPLACE FUNCTION trigger_generate_payment_schedule()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate 12 months of payment schedule
  PERFORM generate_payment_schedule(NEW.id, 12);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_member_create_schedule
  AFTER INSERT ON members
  FOR EACH ROW
  EXECUTE FUNCTION trigger_generate_payment_schedule();

-- ==========================================
-- TRIGGER: Update payment schedule when payment made
-- ==========================================
CREATE TRIGGER trigger_payment_update_schedule
  AFTER INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_schedule_status();

-- ==========================================
-- TRIGGER: Update payment_schedule updated_at
-- ==========================================
CREATE TRIGGER trigger_payment_schedule_updated_at
  BEFORE UPDATE ON payment_schedule
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Run this fifth!** ✅

---

### Migration 6: Row Level Security (RLS) Policies

```sql
-- ==========================================
-- ENABLE RLS ON ALL TABLES
-- ==========================================
ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_schedule ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- HELPER FUNCTION: Get current user's gym_id
-- ==========================================
CREATE OR REPLACE FUNCTION get_current_gym_id()
RETURNS UUID AS $$
  SELECT gym_id 
  FROM gym_users 
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

COMMENT ON FUNCTION get_current_gym_id IS 'Returns gym_id for authenticated user';

-- ==========================================
-- RLS POLICIES FOR: gyms
-- ==========================================

-- Users can view their own gym
CREATE POLICY "Users can view own gym"
  ON gyms FOR SELECT
  USING (id = get_current_gym_id());

-- Users can update their own gym
CREATE POLICY "Users can update own gym"
  ON gyms FOR UPDATE
  USING (id = get_current_gym_id());

-- ==========================================
-- RLS POLICIES FOR: gym_users
-- ==========================================

-- Users can view their own gym's users
CREATE POLICY "Users can view own gym users"
  ON gym_users FOR SELECT
  USING (gym_id = get_current_gym_id());

-- Only owners can insert new gym users
CREATE POLICY "Owners can insert gym users"
  ON gym_users FOR INSERT
  WITH CHECK (
    gym_id = get_current_gym_id() AND
    EXISTS (
      SELECT 1 FROM gym_users
      WHERE gym_id = get_current_gym_id()
      AND auth_user_id = auth.uid()
      AND role = 'owner'
    )
  );

-- ==========================================
-- RLS POLICIES FOR: members
-- ==========================================

-- Users can view their gym's members
CREATE POLICY "Users can view own gym members"
  ON members FOR SELECT
  USING (gym_id = get_current_gym_id());

-- Users can insert members to their gym
CREATE POLICY "Users can insert members"
  ON members FOR INSERT
  WITH CHECK (gym_id = get_current_gym_id());

-- Users can update their gym's members
CREATE POLICY "Users can update own gym members"
  ON members FOR UPDATE
  USING (gym_id = get_current_gym_id());

-- Users can delete their gym's members
CREATE POLICY "Users can delete own gym members"
  ON members FOR DELETE
  USING (gym_id = get_current_gym_id());

-- ==========================================
-- RLS POLICIES FOR: payments
-- ==========================================

-- Users can view their gym's payments
CREATE POLICY "Users can view own gym payments"
  ON payments FOR SELECT
  USING (gym_id = get_current_gym_id());

-- Users can insert payments for their gym
CREATE POLICY "Users can insert payments"
  ON payments FOR INSERT
  WITH CHECK (gym_id = get_current_gym_id());

-- Users can update their gym's payments
CREATE POLICY "Users can update own gym payments"
  ON payments FOR UPDATE
  USING (gym_id = get_current_gym_id());

-- Users can delete their gym's payments
CREATE POLICY "Users can delete own gym payments"
  ON payments FOR DELETE
  USING (gym_id = get_current_gym_id());

-- ==========================================
-- RLS POLICIES FOR: payment_schedule
-- ==========================================

-- Users can view their gym's payment schedule
CREATE POLICY "Users can view own gym payment schedule"
  ON payment_schedule FOR SELECT
  USING (gym_id = get_current_gym_id());

-- Users can update their gym's payment schedule
CREATE POLICY "Users can update own gym payment schedule"
  ON payment_schedule FOR UPDATE
  USING (gym_id = get_current_gym_id());

-- Allow system to insert (via triggers)
CREATE POLICY "System can insert payment schedule"
  ON payment_schedule FOR INSERT
  WITH CHECK (gym_id = get_current_gym_id());

-- Users can delete their gym's payment schedule
CREATE POLICY "Users can delete own gym payment schedule"
  ON payment_schedule FOR DELETE
  USING (gym_id = get_current_gym_id());
```

**Run this sixth!** ✅ **CRITICAL FOR SECURITY**

---

### Migration 7: Utility Functions & Views

```sql
-- ==========================================
-- VIEW: Active members with next due date
-- ==========================================
CREATE OR REPLACE VIEW v_members_with_next_due AS
SELECT 
  m.*,
  ps.due_date AS next_due_date,
  ps.amount_due AS next_amount_due,
  ps.status AS next_payment_status
FROM members m
LEFT JOIN LATERAL (
  SELECT due_date, amount_due, status
  FROM payment_schedule
  WHERE member_id = m.id
    AND status IN ('pending', 'overdue')
  ORDER BY due_date ASC
  LIMIT 1
) ps ON true
WHERE m.status = 'active';

COMMENT ON VIEW v_members_with_next_due IS 'Members with their next upcoming payment';

-- ==========================================
-- FUNCTION: Get dashboard stats
-- ==========================================
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
        'amount', COALESCE(SUM(amount_due), 0)
      )
      FROM payment_schedule ps
      JOIN members m ON m.id = ps.member_id
      WHERE ps.gym_id = p_gym_id
        AND ps.due_date = p_date
        AND ps.status = 'pending'
        AND m.status = 'active'
    ),
    'overdue_this_month', (
      SELECT json_build_object(
        'count', COUNT(*),
        'amount', COALESCE(SUM(amount_due), 0)
      )
      FROM payment_schedule ps
      JOIN members m ON m.id = ps.member_id
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
      FROM members
      WHERE gym_id = p_gym_id
    ),
    'revenue_this_month', (
      SELECT COALESCE(SUM(amount), 0)
      FROM payments
      WHERE gym_id = p_gym_id
        AND DATE_TRUNC('month', payment_date) = DATE_TRUNC('month', p_date)
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_dashboard_stats IS 'Returns all dashboard statistics in one call';

-- ==========================================
-- FUNCTION: Get member payment history
-- ==========================================
CREATE OR REPLACE FUNCTION get_member_payment_history(
  p_member_id UUID
)
RETURNS TABLE (
  payment_id UUID,
  amount DECIMAL,
  payment_method TEXT,
  payment_date DATE,
  due_date DATE,
  days_late INTEGER,
  receipt_number TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.amount,
    p.payment_method,
    p.payment_date,
    p.due_date,
    p.days_late,
    p.receipt_number
  FROM payments p
  WHERE p.member_id = p_member_id
  ORDER BY p.payment_date DESC;
END;
$$ LANGUAGE plpgsql;
```

**Run this seventh!** ✅

---

## 🖼️ STORAGE SETUP (Do this in Supabase Dashboard)

### Step 1: Create Storage Buckets

Go to **Storage** section in Supabase dashboard and create these buckets:

#### **Bucket 1: gym-logos**
```
Name: gym-logos
Public: Yes (so logos can be displayed)
File size limit: 2MB
Allowed MIME types: image/jpeg, image/png, image/webp
```

#### **Bucket 2: member-photos**
```
Name: member-photos
Public: Yes (so photos can be displayed)
File size limit: 5MB
Allowed MIME types: image/jpeg, image/png, image/webp
```

---

### Step 2: Create Storage Policies

Run this SQL in Supabase SQL Editor:

```sql
-- ==========================================
-- STORAGE POLICIES FOR: gym-logos
-- ==========================================

-- Allow gym users to upload their gym logo
CREATE POLICY "Gym users can upload logo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'gym-logos' AND
  (storage.foldername(name))[1] = get_current_gym_id()::TEXT
);

-- Allow gym users to update their gym logo
CREATE POLICY "Gym users can update logo"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'gym-logos' AND
  (storage.foldername(name))[1] = get_current_gym_id()::TEXT
);

-- Allow gym users to delete their gym logo
CREATE POLICY "Gym users can delete logo"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'gym-logos' AND
  (storage.foldername(name))[1] = get_current_gym_id()::TEXT
);

-- Allow anyone to view gym logos (public bucket)
CREATE POLICY "Anyone can view gym logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'gym-logos');

-- ==========================================
-- STORAGE POLICIES FOR: member-photos
-- ==========================================

-- Allow gym users to upload member photos
CREATE POLICY "Gym users can upload member photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'member-photos' AND
  (storage.foldername(name))[1] = get_current_gym_id()::TEXT
);

-- Allow gym users to update member photos
CREATE POLICY "Gym users can update member photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'member-photos' AND
  (storage.foldername(name))[1] = get_current_gym_id()::TEXT
);

-- Allow gym users to delete member photos
CREATE POLICY "Gym users can delete member photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'member-photos' AND
  (storage.foldername(name))[1] = get_current_gym_id()::TEXT
);

-- Allow gym users to view their own member photos
CREATE POLICY "Gym users can view own member photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'member-photos' AND
  (storage.foldername(name))[1] = get_current_gym_id()::TEXT
);
```

---

## 🔐 AUTHENTICATION SETUP

### Email/Password Auth (Enable in Supabase Dashboard)

1. Go to **Authentication > Providers**
2. Enable **Email** provider
3. Settings:
   - Enable email confirmations: **No** (for faster signup)
   - Or **Yes** for production (more secure)

---

## 📊 TESTING THE SETUP

Run these queries to verify everything works:

```sql
-- Test 1: Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Expected output:
-- gyms
-- gym_users
-- members
-- payments
-- payment_schedule

-- Test 2: Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- All should show rowsecurity = true

-- Test 3: Check indexes
SELECT indexname 
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY indexname;

-- Should show all idx_* indexes

-- Test 4: Check functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- Should show all functions we created

-- Test 5: Check triggers
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Should show all triggers
```

---

## 🚀 SAMPLE DATA (For Testing)

```sql
-- ==========================================
-- SAMPLE GYM
-- ==========================================
INSERT INTO gyms (id, name, email, phone, language)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'FitZone Gym',
  'owner@fitzone.com',
  '9876543210',
  'en'
);

-- ==========================================
-- SAMPLE MEMBERS
-- ==========================================
INSERT INTO members (gym_id, full_name, phone, gender, height, weight, joining_date, membership_plan, plan_amount)
VALUES 
  (
    '00000000-0000-0000-0000-000000000001',
    'Rajesh Kumar',
    '9876543211',
    'male',
    '5''10"',
    '75kg',
    '2025-01-15',
    'monthly',
    1000
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Priya Sharma',
    '9876543212',
    'female',
    '5''4"',
    '58kg',
    '2025-01-15',
    'quarterly',
    2500
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Anil Reddy',
    '9876543213',
    'male',
    '5''8"',
    '80kg',
    '2024-12-10',
    'monthly',
    1000
  );

-- Payment schedule will be auto-generated by trigger!

-- ==========================================
-- SAMPLE PAYMENTS
-- ==========================================
INSERT INTO payments (gym_id, member_id, amount, payment_method, payment_date, due_date)
SELECT 
  gym_id,
  id,
  plan_amount,
  'upi',
  joining_date,
  joining_date
FROM members
WHERE gym_id = '00000000-0000-0000-0000-000000000001';

-- ==========================================
-- CHECK GENERATED SCHEDULE
-- ==========================================
SELECT 
  m.full_name,
  ps.due_date,
  ps.amount_due,
  ps.status
FROM payment_schedule ps
JOIN members m ON m.id = ps.member_id
WHERE ps.gym_id = '00000000-0000-0000-0000-000000000001'
ORDER BY ps.due_date, m.full_name;
```

---

## 📱 FRONTEND INTEGRATION

### Supabase Client Setup (React)

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Get current gym
export async function getCurrentGym() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;
  
  const { data: gymUser } = await supabase
    .from('gym_users')
    .select('gym_id, gyms(*)')
    .eq('auth_user_id', user.id)
    .single();
  
  return gymUser?.gyms;
}

// Upload member photo
export async function uploadMemberPhoto(
  gymId: string, 
  memberId: string, 
  file: File
) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${gymId}/${memberId}.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from('member-photos')
    .upload(fileName, file, { upsert: true });
  
  if (error) throw error;
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('member-photos')
    .getPublicUrl(fileName);
  
  return publicUrl;
}
```

---

## ✅ VERIFICATION CHECKLIST

After running all migrations, verify:

- [ ] ✅ All 5 tables created
- [ ] ✅ All indexes created
- [ ] ✅ All functions created
- [ ] ✅ All triggers created
- [ ] ✅ RLS enabled on all tables
- [ ] ✅ RLS policies created
- [ ] ✅ Storage buckets created
- [ ] ✅ Storage policies created
- [ ] ✅ Sample data inserted (optional)
- [ ] ✅ Test queries run successfully

---

## 🔧 MAINTENANCE

### Daily Auto-Update (Run as Cron)

```sql
-- Update overdue status daily
UPDATE payment_schedule
SET status = 'overdue'
WHERE status = 'pending'
  AND due_date < CURRENT_DATE;
```

Set this up in Supabase Dashboard:
1. Go to **Database > Functions**
2. Create new function
3. Schedule to run daily at 12:00 AM

---

## 📊 PERFORMANCE MONITORING

```sql
-- Check slow queries
SELECT 
  mean_exec_time,
  calls,
  query
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

---

## 🚨 BACKUP STRATEGY

Supabase provides automatic backups:
- **Daily backups** retained for 7 days (Free tier)
- **Point-in-time recovery** up to 7 days

To manually export:
```bash
# Install Supabase CLI
npm install -g supabase

# Export database
supabase db dump --db-url "postgresql://postgres:[password]@[host]:5432/postgres" > backup.sql
```

---

## ✅ SETUP COMPLETE!

Your database is now:
- ✅ **Secure**: RLS isolates each gym's data
- ✅ **Fast**: Proper indexes for quick queries
- ✅ **Automated**: Triggers handle schedule generation
- ✅ **Scalable**: Ready for 100s of gyms
- ✅ **Storage Ready**: Photo upload configured

---

## 📞 NEXT STEPS

1. **Get Supabase credentials:**
   - Project URL
   - Anon key
   - Service role key (keep secret!)

2. **Add to .env file:**
   ```
   VITE_SUPABASE_URL=https://xxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJxxx...
   ```

3. **Start building frontend!** 🚀

---

**Database Status:** ✅ Production-Ready  
**Security:** ✅ RLS Enabled  
**Performance:** ✅ Optimized with Indexes  
**Ready to Code:** ✅ YES!









