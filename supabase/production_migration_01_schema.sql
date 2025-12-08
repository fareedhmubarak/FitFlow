-- =====================================================
-- FITFLOW PRODUCTION MIGRATION - SCHEMA ONLY
-- Date: December 6, 2025
-- Purpose: Create all tables, indexes, constraints
-- =====================================================

-- =====================================================
-- EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: gym_gyms (Master Tenant Table)
-- =====================================================
CREATE TABLE IF NOT EXISTS gym_gyms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'Asia/Kolkata',
  currency TEXT DEFAULT 'INR',
  logo_url TEXT,
  
  -- Address
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'India',
  
  -- Settings
  gst_number TEXT,
  receipt_prefix TEXT DEFAULT 'RCP',
  receipt_counter INTEGER DEFAULT 0,
  member_counter INTEGER DEFAULT 0,
  date_format TEXT DEFAULT 'DD/MM/YYYY',
  time_format TEXT DEFAULT '12h',
  
  -- Protection flag
  is_protected BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gym_gyms_email ON gym_gyms(email);

-- =====================================================
-- TABLE: gym_users (Staff & Admins)
-- =====================================================
CREATE TABLE IF NOT EXISTS gym_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gym_gyms(id) ON DELETE CASCADE,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'owner',
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(gym_id, email),
  UNIQUE(auth_user_id)
);

CREATE INDEX idx_gym_users_gym_id ON gym_users(gym_id);
CREATE INDEX idx_gym_users_auth_user_id ON gym_users(auth_user_id);

-- =====================================================
-- TABLE: gym_membership_plans
-- =====================================================
CREATE TABLE IF NOT EXISTS gym_membership_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gym_gyms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration_months INTEGER NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  features JSONB DEFAULT '[]'::jsonb,
  plan_type TEXT DEFAULT 'standard' NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  
  -- Promotional features
  base_duration_months INTEGER,
  bonus_duration_months INTEGER DEFAULT 0,
  base_price NUMERIC(10,2),
  discount_type TEXT DEFAULT 'none',
  discount_value NUMERIC(10,2) DEFAULT 0,
  final_price NUMERIC(10,2),
  promo_type TEXT DEFAULT 'standard',
  valid_from DATE,
  valid_until DATE,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  promo_description TEXT,
  highlight_text TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gym_membership_plans_gym_id ON gym_membership_plans(gym_id);
CREATE INDEX idx_gym_membership_plans_active ON gym_membership_plans(gym_id, is_active);

-- =====================================================
-- TABLE: gym_members
-- =====================================================
CREATE TABLE IF NOT EXISTS gym_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gym_gyms(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  gender TEXT,
  height TEXT,
  weight TEXT,
  photo_url TEXT,
  
  -- Membership
  joining_date DATE NOT NULL,
  membership_plan TEXT NOT NULL,
  plan_amount NUMERIC(10,2) NOT NULL,
  plan_id UUID REFERENCES gym_membership_plans(id) ON DELETE SET NULL,
  
  -- Dates
  membership_start_date DATE,
  membership_end_date DATE,
  next_payment_due_date DATE,
  last_payment_date DATE,
  last_payment_amount NUMERIC(10,2),
  
  -- Tracking
  first_joining_date DATE,
  total_periods INTEGER DEFAULT 1,
  current_period_id UUID,
  lifetime_value NUMERIC(10,2) DEFAULT 0,
  total_payments_received NUMERIC(10,2) DEFAULT 0,
  
  -- Personal info
  date_of_birth DATE,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  notes TEXT,
  tags TEXT[],
  
  -- Stats
  last_visit_date DATE,
  total_visits INTEGER DEFAULT 0,
  
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(gym_id, phone)
);

CREATE INDEX idx_gym_members_gym_id ON gym_members(gym_id);
CREATE INDEX idx_gym_members_phone ON gym_members(gym_id, phone);
CREATE INDEX idx_gym_members_status ON gym_members(gym_id, status);
CREATE INDEX idx_gym_members_plan ON gym_members(gym_id, membership_plan);
CREATE INDEX idx_gym_members_plan_id ON gym_members(plan_id);
CREATE INDEX idx_gym_members_joining_date ON gym_members(gym_id, joining_date);

-- =====================================================
-- TABLE: gym_payments
-- =====================================================
CREATE TABLE IF NOT EXISTS gym_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gym_gyms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL,
  payment_date DATE NOT NULL,
  due_date DATE NOT NULL,
  days_late INTEGER,
  notes TEXT,
  receipt_number TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gym_payments_gym_id ON gym_payments(gym_id);
CREATE INDEX idx_gym_payments_member_id ON gym_payments(member_id);
CREATE INDEX idx_gym_payments_payment_date ON gym_payments(gym_id, payment_date);
CREATE INDEX idx_gym_payments_due_date ON gym_payments(gym_id, due_date);

-- =====================================================
-- TABLE: gym_payment_schedule
-- =====================================================
CREATE TABLE IF NOT EXISTS gym_payment_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gym_gyms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  amount_due NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  paid_payment_id UUID REFERENCES gym_payments(id),
  paid_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(member_id, due_date)
);

CREATE INDEX idx_gym_payment_schedule_gym_id ON gym_payment_schedule(gym_id);
CREATE INDEX idx_gym_payment_schedule_member_id ON gym_payment_schedule(member_id);
CREATE INDEX idx_gym_payment_schedule_due_date ON gym_payment_schedule(gym_id, due_date);
CREATE INDEX idx_gym_payment_schedule_status ON gym_payment_schedule(gym_id, status, due_date);
CREATE INDEX idx_gym_payment_schedule_calendar ON gym_payment_schedule(gym_id, due_date, status) WHERE status != 'paid';

-- =====================================================
-- TABLE: gym_membership_periods
-- =====================================================
CREATE TABLE IF NOT EXISTS gym_membership_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gym_gyms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
  period_number INTEGER NOT NULL DEFAULT 1,
  
  -- Plan snapshot
  plan_id UUID REFERENCES gym_membership_plans(id) ON DELETE SET NULL,
  plan_name TEXT NOT NULL,
  plan_duration_months INTEGER NOT NULL,
  plan_amount NUMERIC(10,2) NOT NULL,
  bonus_months INTEGER DEFAULT 0,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  paid_amount NUMERIC(10,2) NOT NULL,
  
  -- Dates
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  next_payment_due DATE,
  
  -- Status
  status TEXT DEFAULT 'active',
  end_reason TEXT,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_membership_periods_gym_id ON gym_membership_periods(gym_id);
CREATE INDEX idx_membership_periods_member_id ON gym_membership_periods(member_id);

-- =====================================================
-- TABLE: gym_receipts
-- =====================================================
CREATE TABLE IF NOT EXISTS gym_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gym_gyms(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES gym_payments(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
  
  receipt_number TEXT NOT NULL,
  member_name TEXT NOT NULL,
  member_phone TEXT,
  plan_name TEXT NOT NULL,
  
  amount NUMERIC(10,2) NOT NULL,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  tax_amount NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL,
  
  payment_method TEXT NOT NULL,
  payment_date DATE NOT NULL,
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,
  next_due_date DATE,
  
  shared_via_whatsapp BOOLEAN DEFAULT false,
  shared_at TIMESTAMPTZ,
  pdf_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_receipts_gym_id ON gym_receipts(gym_id);
CREATE INDEX idx_receipts_member_id ON gym_receipts(member_id);

-- =====================================================
-- TABLE: gym_member_progress
-- =====================================================
CREATE TABLE IF NOT EXISTS gym_member_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gym_gyms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  weight NUMERIC(5,2),
  height NUMERIC(5,2),
  bmi NUMERIC(4,2),
  body_fat_percentage NUMERIC(4,2),
  
  chest NUMERIC(5,2),
  waist NUMERIC(5,2),
  hips NUMERIC(5,2),
  biceps NUMERIC(5,2),
  thighs NUMERIC(5,2),
  calves NUMERIC(5,2),
  
  photo_front_url TEXT,
  photo_back_url TEXT,
  photo_left_url TEXT,
  photo_right_url TEXT,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_member_progress_gym_id ON gym_member_progress(gym_id);
CREATE INDEX idx_member_progress_member_id ON gym_member_progress(member_id);
CREATE INDEX idx_member_progress_member_date ON gym_member_progress(member_id, record_date DESC);
CREATE INDEX idx_member_progress_record_date ON gym_member_progress(record_date DESC);

-- =====================================================
-- TABLE: gym_member_history
-- =====================================================
CREATE TABLE IF NOT EXISTS gym_member_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gym_gyms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  description TEXT,
  changed_by UUID REFERENCES gym_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_member_history_member_id ON gym_member_history(member_id);

-- =====================================================
-- TABLE: gym_notification_settings
-- =====================================================
CREATE TABLE IF NOT EXISTS gym_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID UNIQUE NOT NULL REFERENCES gym_gyms(id) ON DELETE CASCADE,
  
  expiry_reminder_enabled BOOLEAN DEFAULT true,
  expiry_reminder_days INTEGER[] DEFAULT ARRAY[7, 3, 1, 0],
  payment_due_enabled BOOLEAN DEFAULT true,
  payment_due_days INTEGER[] DEFAULT ARRAY[0],
  payment_overdue_enabled BOOLEAN DEFAULT true,
  payment_overdue_days INTEGER[] DEFAULT ARRAY[1, 3, 7],
  welcome_enabled BOOLEAN DEFAULT true,
  birthday_enabled BOOLEAN DEFAULT true,
  receipt_enabled BOOLEAN DEFAULT true,
  
  default_channel TEXT DEFAULT 'whatsapp',
  whatsapp_business_number TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: gym_notification_templates
-- =====================================================
CREATE TABLE IF NOT EXISTS gym_notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gym_gyms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  subject TEXT,
  message_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  trigger_days INTEGER,
  trigger_type TEXT,
  channels TEXT[] DEFAULT ARRAY['whatsapp'],
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: gym_notifications
-- =====================================================
CREATE TABLE IF NOT EXISTS gym_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gym_gyms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
  template_id UUID REFERENCES gym_notification_templates(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  channel TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  reference_type TEXT,
  reference_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_gym_id ON gym_notifications(gym_id);
CREATE INDEX idx_notifications_member_id ON gym_notifications(member_id);

-- =====================================================
-- AUDIT/LOGGING TABLES
-- =====================================================

-- Sessions
CREATE TABLE IF NOT EXISTS gym_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID REFERENCES gym_gyms(id) ON DELETE CASCADE,
  session_id TEXT UNIQUE NOT NULL,
  user_id TEXT,
  start_time TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  ip_address TEXT,
  user_agent TEXT,
  device_info JSONB DEFAULT '{}'::jsonb,
  page_views INTEGER DEFAULT 0,
  actions_count INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gym_sessions_gym_id ON gym_sessions(gym_id);
CREATE INDEX idx_gym_sessions_session_id ON gym_sessions(session_id);
CREATE INDEX idx_gym_sessions_user_id ON gym_sessions(user_id);
CREATE INDEX idx_gym_sessions_is_active ON gym_sessions(is_active);

-- Audit Logs
CREATE TABLE IF NOT EXISTS gym_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID REFERENCES gym_gyms(id) ON DELETE CASCADE,
  session_id TEXT,
  user_id TEXT,
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  old_values JSONB,
  new_values JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  duration_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  error_stack TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gym_audit_logs_gym_id ON gym_audit_logs(gym_id);
CREATE INDEX idx_gym_audit_logs_session_id ON gym_audit_logs(session_id);
CREATE INDEX idx_gym_audit_logs_event_type ON gym_audit_logs(event_type);
CREATE INDEX idx_gym_audit_logs_action ON gym_audit_logs(action);
CREATE INDEX idx_gym_audit_logs_resource ON gym_audit_logs(resource_type, resource_id);
CREATE INDEX idx_gym_audit_logs_created_at ON gym_audit_logs(created_at DESC);

-- API Logs
CREATE TABLE IF NOT EXISTS gym_api_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID REFERENCES gym_gyms(id) ON DELETE CASCADE,
  session_id TEXT,
  user_id TEXT,
  method TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_headers JSONB,
  request_body JSONB,
  response_status INTEGER,
  response_headers JSONB,
  response_body JSONB,
  duration_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gym_api_logs_gym_id ON gym_api_logs(gym_id);
CREATE INDEX idx_gym_api_logs_session_id ON gym_api_logs(session_id);
CREATE INDEX idx_gym_api_logs_endpoint ON gym_api_logs(endpoint);
CREATE INDEX idx_gym_api_logs_status ON gym_api_logs(response_status);
CREATE INDEX idx_gym_api_logs_created_at ON gym_api_logs(created_at DESC);

-- Error Logs
CREATE TABLE IF NOT EXISTS gym_error_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID REFERENCES gym_gyms(id) ON DELETE CASCADE,
  session_id TEXT,
  user_id TEXT,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  error_code TEXT,
  component_name TEXT,
  page_path TEXT,
  user_action TEXT,
  browser_info JSONB,
  is_handled BOOLEAN DEFAULT false,
  severity TEXT DEFAULT 'medium',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gym_error_logs_gym_id ON gym_error_logs(gym_id);
CREATE INDEX idx_gym_error_logs_session_id ON gym_error_logs(session_id);
CREATE INDEX idx_gym_error_logs_severity ON gym_error_logs(severity);
CREATE INDEX idx_gym_error_logs_created_at ON gym_error_logs(created_at DESC);

-- Click Logs
CREATE TABLE IF NOT EXISTS gym_click_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID REFERENCES gym_gyms(id) ON DELETE CASCADE,
  session_id TEXT,
  user_id TEXT,
  element_type TEXT,
  element_id TEXT,
  element_class TEXT,
  element_text TEXT,
  element_name TEXT,
  page_path TEXT,
  page_title TEXT,
  x_position INTEGER,
  y_position INTEGER,
  viewport_width INTEGER,
  viewport_height INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gym_click_logs_gym_id ON gym_click_logs(gym_id);
CREATE INDEX idx_gym_click_logs_session_id ON gym_click_logs(session_id);
CREATE INDEX idx_gym_click_logs_created_at ON gym_click_logs(created_at DESC);

-- Navigation Logs
CREATE TABLE IF NOT EXISTS gym_navigation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID REFERENCES gym_gyms(id) ON DELETE CASCADE,
  session_id TEXT,
  user_id TEXT,
  from_path TEXT,
  to_path TEXT,
  from_title TEXT,
  to_title TEXT,
  navigation_type TEXT,
  duration_ms INTEGER,
  referrer TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gym_navigation_logs_gym_id ON gym_navigation_logs(gym_id);
CREATE INDEX idx_gym_navigation_logs_session_id ON gym_navigation_logs(session_id);
CREATE INDEX idx_gym_navigation_logs_created_at ON gym_navigation_logs(created_at DESC);

-- Performance Logs
CREATE TABLE IF NOT EXISTS gym_performance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID REFERENCES gym_gyms(id) ON DELETE CASCADE,
  session_id TEXT,
  user_id TEXT,
  metric_type TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC,
  unit TEXT DEFAULT 'ms',
  page_path TEXT,
  resource_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gym_performance_logs_gym_id ON gym_performance_logs(gym_id);
CREATE INDEX idx_gym_performance_logs_metric_type ON gym_performance_logs(metric_type);
CREATE INDEX idx_gym_performance_logs_created_at ON gym_performance_logs(created_at DESC);

-- =====================================================
-- TABLE: record_versions (Change tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS record_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  changed_by UUID,
  session_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_record_versions_table_name ON record_versions(table_name);
CREATE INDEX idx_record_versions_record_id ON record_versions(record_id);
CREATE INDEX idx_record_versions_table_record ON record_versions(table_name, record_id);
CREATE INDEX idx_record_versions_operation ON record_versions(operation);
CREATE INDEX idx_record_versions_created_at ON record_versions(created_at);
CREATE INDEX idx_record_versions_changed_by ON record_versions(changed_by);

-- =====================================================
-- VIEW: v_recent_changes
-- =====================================================
CREATE OR REPLACE VIEW v_recent_changes AS
SELECT 
  id,
  table_name,
  record_id,
  operation,
  changed_fields,
  CASE
    WHEN table_name = 'gym_members' THEN new_data->>'full_name'
    WHEN table_name = 'gym_gyms' THEN new_data->>'name'
    ELSE record_id
  END AS record_name,
  created_at,
  changed_by
FROM record_versions rv
ORDER BY created_at DESC;
