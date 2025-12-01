-- ===============================================
-- FITFLOW GYM MANAGEMENT SYSTEM - DATABASE SCHEMA
-- Complete Multi-Tenant SaaS Platform
-- ===============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===============================================
-- 1. GYMS TABLE (Master Tenant Table)
-- ===============================================
CREATE TABLE IF NOT EXISTS gyms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,

  -- Contact Info
  email TEXT,
  phone TEXT,
  website TEXT,

  -- Address
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'IN',

  -- Branding
  logo_url TEXT,
  brand_primary_color TEXT DEFAULT '#6366f1',
  brand_secondary_color TEXT DEFAULT '#8b5cf6',

  -- Settings
  timezone TEXT DEFAULT 'Asia/Kolkata',
  currency TEXT DEFAULT 'INR',
  date_format TEXT DEFAULT 'DD/MM/YYYY',
  time_format TEXT DEFAULT '12h',

  -- Subscription
  subscription_plan TEXT DEFAULT 'trial',
  subscription_status TEXT DEFAULT 'active',
  trial_ends_at TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,

  -- Onboarding
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_step INTEGER DEFAULT 1,

  -- Feature Toggles
  features JSONB DEFAULT '{
    "biometric_access": false,
    "class_booking": true,
    "personal_training": true,
    "pos": false,
    "nutrition_tracking": false,
    "lead_management": true,
    "sms_notifications": false,
    "email_marketing": true,
    "member_app": true,
    "waitlist": true,
    "freeze_membership": true,
    "multi_location": false
  }'::jsonb,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gyms_slug ON gyms(slug);
CREATE INDEX idx_gyms_subscription_status ON gyms(subscription_status);

-- ===============================================
-- 2. GYM_USERS TABLE (Staff & Admins)
-- ===============================================
CREATE TABLE IF NOT EXISTS gym_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Profile
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,

  -- Role & Permissions
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'front_desk', 'trainer')),
  permissions JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,

  -- Multi-language preference
  preferred_language TEXT DEFAULT 'en',

  -- Trainer-specific
  certifications TEXT[],
  specializations TEXT[],
  hourly_rate DECIMAL(10,2),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(gym_id, email),
  UNIQUE(gym_id, auth_user_id)
);

CREATE INDEX idx_gym_users_gym_id ON gym_users(gym_id);
CREATE INDEX idx_gym_users_auth_user_id ON gym_users(auth_user_id);
CREATE INDEX idx_gym_users_role ON gym_users(gym_id, role);

-- ===============================================
-- 3. MEMBERS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,

  member_number TEXT,

  -- Personal Info
  email TEXT NOT NULL,
  phone TEXT,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),

  -- Address
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT,

  -- Emergency Contact
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,

  -- Media
  photo_url TEXT,
  qr_code TEXT UNIQUE,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'frozen', 'cancelled')),
  membership_start_date DATE,

  -- Multi-language preference
  preferred_language TEXT DEFAULT 'en',

  -- Medical & Notes
  medical_notes TEXT,
  staff_notes TEXT,

  -- Tags
  tags TEXT[],

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(gym_id, email)
);

CREATE INDEX idx_members_gym_id ON members(gym_id);
CREATE INDEX idx_members_status ON members(gym_id, status);
CREATE INDEX idx_members_email ON members(gym_id, email);
CREATE INDEX idx_members_qr_code ON members(qr_code);
CREATE INDEX idx_members_tags ON members USING GIN(tags);

-- ===============================================
-- 4. MEMBERSHIP_PLANS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS membership_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  name_translations JSONB DEFAULT '{}'::jsonb,
  description TEXT,
  description_translations JSONB DEFAULT '{}'::jsonb,

  -- Pricing
  price DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'quarterly', 'semi_annual', 'annual', 'one_time')),
  setup_fee DECIMAL(10,2) DEFAULT 0,

  duration_days INTEGER,

  -- Access Limits
  max_classes_per_cycle INTEGER,
  max_freeze_days_per_year INTEGER DEFAULT 30,

  -- Features
  features JSONB DEFAULT '[]'::jsonb,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_public BOOLEAN DEFAULT TRUE,

  -- Display
  display_order INTEGER DEFAULT 0,
  highlight BOOLEAN DEFAULT FALSE,

  -- Stripe
  stripe_price_id TEXT,
  stripe_product_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_membership_plans_gym_id ON membership_plans(gym_id);
CREATE INDEX idx_membership_plans_active ON membership_plans(gym_id, is_active);

-- ===============================================
-- 5. SUBSCRIPTIONS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  membership_plan_id UUID REFERENCES membership_plans(id),

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'paused', 'past_due', 'cancelled', 'expired')),

  -- Dates
  start_date DATE NOT NULL,
  end_date DATE,
  trial_end_date DATE,
  next_billing_date DATE,
  cancelled_at TIMESTAMPTZ,

  -- Billing
  current_period_start DATE,
  current_period_end DATE,

  -- Settings
  auto_renew BOOLEAN DEFAULT TRUE,

  -- Freeze
  freeze_start_date DATE,
  freeze_end_date DATE,
  freeze_days_used INTEGER DEFAULT 0,

  -- Stripe
  stripe_subscription_id TEXT,

  -- Cancellation
  cancellation_reason TEXT,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_gym_id ON subscriptions(gym_id);
CREATE INDEX idx_subscriptions_member_id ON subscriptions(member_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(gym_id, status);
CREATE INDEX idx_subscriptions_next_billing ON subscriptions(next_billing_date) WHERE status = 'active';

-- ===============================================
-- 6. PAYMENTS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),

  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'INR',

  -- Status
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded', 'cancelled')),

  -- Payment Method
  payment_method TEXT CHECK (payment_method IN ('card', 'upi', 'cash', 'bank_transfer', 'other')),
  last4 TEXT,

  -- Stripe/Razorpay
  stripe_payment_intent_id TEXT,
  stripe_invoice_id TEXT,
  stripe_charge_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT,

  -- Receipt
  receipt_url TEXT,
  invoice_number TEXT,

  description TEXT,

  -- Dates
  due_date DATE,
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  refund_amount DECIMAL(10,2),
  refund_reason TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_gym_id ON payments(gym_id);
CREATE INDEX idx_payments_member_id ON payments(member_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_date ON payments(paid_at);
CREATE INDEX idx_payments_due_date ON payments(due_date);

-- ===============================================
-- 7. CLASSES TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  name_translations JSONB DEFAULT '{}'::jsonb,
  description TEXT,
  description_translations JSONB DEFAULT '{}'::jsonb,
  category TEXT,

  -- Visuals
  color TEXT DEFAULT '#6366f1',
  icon_url TEXT,
  image_url TEXT,

  -- Settings
  duration_minutes INTEGER NOT NULL,
  default_capacity INTEGER NOT NULL,
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'all_levels')),

  prerequisites TEXT,
  equipment_required TEXT[],

  default_trainer_id UUID REFERENCES gym_users(id),

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_classes_gym_id ON classes(gym_id);
CREATE INDEX idx_classes_category ON classes(gym_id, category);

-- ===============================================
-- 8. CLASS_SCHEDULES TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS class_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,

  trainer_id UUID REFERENCES gym_users(id),

  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,

  capacity INTEGER NOT NULL,
  booked_count INTEGER DEFAULT 0,
  waitlist_count INTEGER DEFAULT 0,

  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')),

  room_location TEXT,
  notes TEXT,
  staff_notes TEXT,

  booking_opens_at TIMESTAMPTZ,
  booking_closes_at TIMESTAMPTZ,

  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_class_schedules_gym_id ON class_schedules(gym_id);
CREATE INDEX idx_class_schedules_class_id ON class_schedules(class_id);
CREATE INDEX idx_class_schedules_trainer_id ON class_schedules(trainer_id);
CREATE INDEX idx_class_schedules_time ON class_schedules(gym_id, start_time);
CREATE INDEX idx_class_schedules_status ON class_schedules(status) WHERE status != 'completed';

-- ===============================================
-- 9. BOOKINGS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  class_schedule_id UUID NOT NULL REFERENCES class_schedules(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,

  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'waitlist', 'cancelled', 'attended', 'no_show', 'late_cancel')),

  waitlist_position INTEGER,
  promoted_from_waitlist_at TIMESTAMPTZ,

  booked_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  checked_in_at TIMESTAMPTZ,

  cancellation_reason TEXT,
  late_cancellation BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(class_schedule_id, member_id)
);

CREATE INDEX idx_bookings_gym_id ON bookings(gym_id);
CREATE INDEX idx_bookings_class_schedule ON bookings(class_schedule_id);
CREATE INDEX idx_bookings_member_id ON bookings(member_id);
CREATE INDEX idx_bookings_status ON bookings(status);

-- ===============================================
-- 10. CHECK_INS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS check_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,

  check_in_time TIMESTAMPTZ DEFAULT NOW(),
  check_out_time TIMESTAMPTZ,

  method TEXT CHECK (method IN ('qr_code', 'manual', 'app', 'biometric', 'kiosk')),

  class_schedule_id UUID REFERENCES class_schedules(id),

  created_by UUID REFERENCES gym_users(id),

  location TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_check_ins_gym_id ON check_ins(gym_id);
CREATE INDEX idx_check_ins_member_id ON check_ins(member_id);
CREATE INDEX idx_check_ins_time ON check_ins(gym_id, check_in_time);
CREATE INDEX idx_check_ins_date ON check_ins((check_in_time::DATE));

-- ===============================================
-- 11. NOTIFICATIONS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,

  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('member', 'staff', 'all_members', 'filtered')),
  recipient_ids UUID[],
  recipient_filter JSONB,
  recipient_language TEXT DEFAULT 'en',

  channels TEXT[] NOT NULL,

  template TEXT,
  subject TEXT,
  message TEXT NOT NULL,

  html_content TEXT,

  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'cancelled')),

  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,

  error_message TEXT,

  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_gym_id ON notifications(gym_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_for) WHERE status = 'pending';

-- ===============================================
-- 12. LEADS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,

  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,

  source TEXT,
  source_details TEXT,

  interest TEXT[],

  stage TEXT DEFAULT 'new' CHECK (stage IN ('new', 'contacted', 'tour_scheduled', 'tour_completed', 'negotiating', 'converted', 'lost')),

  assigned_to UUID REFERENCES gym_users(id),

  next_follow_up_date DATE,
  last_contacted_at TIMESTAMPTZ,

  converted_to_member_id UUID REFERENCES members(id),
  converted_at TIMESTAMPTZ,

  lost_reason TEXT,
  lost_at TIMESTAMPTZ,

  notes TEXT,
  tags TEXT[],

  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_gym_id ON leads(gym_id);
CREATE INDEX idx_leads_stage ON leads(gym_id, stage);
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX idx_leads_next_follow_up ON leads(next_follow_up_date) WHERE stage NOT IN ('converted', 'lost');

-- ===============================================
-- 13. PRODUCTS TABLE (POS)
-- ===============================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  sku TEXT,

  category TEXT,

  price DECIMAL(10,2) NOT NULL,
  cost DECIMAL(10,2),

  stock_quantity INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 10,
  track_inventory BOOLEAN DEFAULT TRUE,

  image_url TEXT,

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_gym_id ON products(gym_id);
CREATE INDEX idx_products_category ON products(gym_id, category);
CREATE INDEX idx_products_sku ON products(gym_id, sku);

-- ===============================================
-- 14. SALES_TRANSACTIONS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS sales_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,

  transaction_number TEXT,

  member_id UUID REFERENCES members(id),

  items JSONB NOT NULL,

  subtotal DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,

  payment_method TEXT,
  payment_status TEXT DEFAULT 'completed' CHECK (payment_status IN ('pending', 'completed', 'refunded')),

  sold_by UUID REFERENCES gym_users(id),

  receipt_url TEXT,

  refunded_at TIMESTAMPTZ,
  refund_amount DECIMAL(10,2),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sales_transactions_gym_id ON sales_transactions(gym_id);
CREATE INDEX idx_sales_transactions_member_id ON sales_transactions(member_id);
CREATE INDEX idx_sales_transactions_date ON sales_transactions((created_at::DATE));

-- ===============================================
-- 15. ANALYTICS_EVENTS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,

  event_type TEXT NOT NULL,

  entity_type TEXT,
  entity_id UUID,

  user_type TEXT,
  user_id UUID,

  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_events_gym_id ON analytics_events(gym_id);
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_date ON analytics_events((created_at::DATE));

-- ===============================================
-- TRIGGERS AND FUNCTIONS
-- ===============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gyms_updated_at BEFORE UPDATE ON gyms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gym_users_updated_at BEFORE UPDATE ON gym_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_membership_plans_updated_at BEFORE UPDATE ON membership_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_class_schedules_updated_at BEFORE UPDATE ON class_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate member number
CREATE OR REPLACE FUNCTION generate_member_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.member_number := 'MEM-' || EXTRACT(YEAR FROM NOW()) || '-' ||
    LPAD((
      SELECT COUNT(*) + 1
      FROM members
      WHERE gym_id = NEW.gym_id
      AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
    )::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_member_number
  BEFORE INSERT ON members
  FOR EACH ROW
  EXECUTE FUNCTION generate_member_number();

-- Auto-generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.invoice_number := 'INV-' || EXTRACT(YEAR FROM NOW()) || '-' ||
    LPAD((
      SELECT COUNT(*) + 1
      FROM payments
      WHERE gym_id = NEW.gym_id
      AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
    )::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_invoice_number
  BEFORE INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION generate_invoice_number();

-- Generate QR code for member
CREATE OR REPLACE FUNCTION generate_member_qr_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.qr_code := encode(NEW.id::text::bytea, 'base64');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_member_qr_code
  BEFORE INSERT ON members
  FOR EACH ROW
  EXECUTE FUNCTION generate_member_qr_code();

-- Update class booked count
CREATE OR REPLACE FUNCTION update_class_booked_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status IN ('confirmed', 'attended') THEN
    UPDATE class_schedules
    SET booked_count = booked_count + 1
    WHERE id = NEW.class_schedule_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status IN ('confirmed', 'attended') THEN
    UPDATE class_schedules
    SET booked_count = booked_count - 1
    WHERE id = OLD.class_schedule_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IN ('confirmed', 'attended') AND NEW.status NOT IN ('confirmed', 'attended') THEN
      UPDATE class_schedules SET booked_count = booked_count - 1 WHERE id = NEW.class_schedule_id;
    ELSIF OLD.status NOT IN ('confirmed', 'attended') AND NEW.status IN ('confirmed', 'attended') THEN
      UPDATE class_schedules SET booked_count = booked_count + 1 WHERE id = NEW.class_schedule_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_booked_count
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_class_booked_count();
