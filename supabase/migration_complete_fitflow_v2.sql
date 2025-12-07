-- ===============================================
-- FITFLOW GYM MANAGEMENT SYSTEM - COMPLETE V2 MIGRATION
-- Date: November 28, 2025
-- Purpose: Complete overhaul with membership periods, promotional plans, 
--          notifications, receipts, and member history
-- ===============================================

-- ===============================================
-- 1. ENHANCED MEMBERSHIP PLANS TABLE
-- Supports: Standard, Custom, Promotional (Buy X Get Y), Discounts
-- ===============================================

-- Add new columns to gym_membership_plans
ALTER TABLE gym_membership_plans 
ADD COLUMN IF NOT EXISTS base_duration_months INTEGER,
ADD COLUMN IF NOT EXISTS bonus_duration_months INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_duration_months INTEGER GENERATED ALWAYS AS (COALESCE(base_duration_months, duration_months) + COALESCE(bonus_duration_months, 0)) STORED,
ADD COLUMN IF NOT EXISTS base_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'none' CHECK (discount_type IN ('none', 'percentage', 'flat')),
ADD COLUMN IF NOT EXISTS discount_value DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS promo_type TEXT DEFAULT 'standard' CHECK (promo_type IN ('standard', 'promotional', 'trial', 'custom')),
ADD COLUMN IF NOT EXISTS valid_from DATE,
ADD COLUMN IF NOT EXISTS valid_until DATE,
ADD COLUMN IF NOT EXISTS max_uses INTEGER,
ADD COLUMN IF NOT EXISTS current_uses INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS promo_description TEXT,
ADD COLUMN IF NOT EXISTS highlight_text TEXT;

-- Update existing plans to set base values
UPDATE gym_membership_plans 
SET base_duration_months = duration_months,
    base_price = price,
    final_price = price
WHERE base_duration_months IS NULL;

-- ===============================================
-- 2. ENHANCED MEMBERS TABLE
-- Supports: Multiple membership periods, lifetime tracking
-- ===============================================

-- Add new columns to gym_members
ALTER TABLE gym_members
ADD COLUMN IF NOT EXISTS first_joining_date DATE,
ADD COLUMN IF NOT EXISTS total_periods INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS current_period_id UUID,
ADD COLUMN IF NOT EXISTS lifetime_value DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS last_visit_date DATE,
ADD COLUMN IF NOT EXISTS total_visits INTEGER DEFAULT 0;

-- Update first_joining_date for existing members
UPDATE gym_members 
SET first_joining_date = joining_date
WHERE first_joining_date IS NULL;

-- ===============================================
-- 3. MEMBERSHIP PERIODS TABLE
-- Tracks each join/rejoin as a separate period
-- ===============================================

CREATE TABLE IF NOT EXISTS gym_membership_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gym_gyms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
  
  -- Period Info
  period_number INTEGER NOT NULL DEFAULT 1,
  
  -- Plan Snapshot (in case plan changes/deleted)
  plan_id UUID REFERENCES gym_membership_plans(id) ON DELETE SET NULL,
  plan_name TEXT NOT NULL,
  plan_duration_months INTEGER NOT NULL,
  plan_amount DECIMAL(10,2) NOT NULL,
  bonus_months INTEGER DEFAULT 0,
  
  -- Pricing
  discount_amount DECIMAL(10,2) DEFAULT 0,
  paid_amount DECIMAL(10,2) NOT NULL,
  
  -- Dates
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  next_payment_due DATE,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'frozen')),
  end_reason TEXT CHECK (end_reason IN (NULL, 'expired', 'cancelled', 'upgraded', 'downgraded', 'refunded')),
  
  -- Notes
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_membership_periods_gym_id ON gym_membership_periods(gym_id);
CREATE INDEX idx_membership_periods_member_id ON gym_membership_periods(member_id);
CREATE INDEX idx_membership_periods_status ON gym_membership_periods(status);
CREATE INDEX idx_membership_periods_dates ON gym_membership_periods(start_date, end_date);

-- ===============================================
-- 4. RECEIPTS TABLE
-- Digital receipts for payments
-- ===============================================

CREATE TABLE IF NOT EXISTS gym_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gym_gyms(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES gym_payments(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
  
  -- Receipt Info
  receipt_number TEXT NOT NULL,
  
  -- Snapshot Data (in case member/plan data changes)
  member_name TEXT NOT NULL,
  member_phone TEXT,
  plan_name TEXT NOT NULL,
  
  -- Amount Details
  amount DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  
  -- Payment Details
  payment_method TEXT NOT NULL,
  payment_date DATE NOT NULL,
  
  -- Validity
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,
  next_due_date DATE,
  
  -- Sharing
  shared_via_whatsapp BOOLEAN DEFAULT FALSE,
  shared_at TIMESTAMPTZ,
  
  -- PDF URL (if generated)
  pdf_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_receipts_gym_id ON gym_receipts(gym_id);
CREATE INDEX idx_receipts_member_id ON gym_receipts(member_id);
CREATE INDEX idx_receipts_payment_id ON gym_receipts(payment_id);
CREATE INDEX idx_receipts_number ON gym_receipts(receipt_number);
CREATE INDEX idx_receipts_date ON gym_receipts(payment_date);

-- ===============================================
-- 5. NOTIFICATION TEMPLATES TABLE
-- Customizable message templates
-- ===============================================

CREATE TABLE IF NOT EXISTS gym_notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gym_gyms(id) ON DELETE CASCADE,
  
  -- Template Info
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expiry_reminder', 'payment_due', 'payment_overdue', 'welcome', 'birthday', 'receipt', 'custom')),
  
  -- Content
  subject TEXT,
  message_template TEXT NOT NULL, -- Use {{member_name}}, {{gym_name}}, {{amount}}, {{due_date}}, etc.
  
  -- Settings
  is_active BOOLEAN DEFAULT TRUE,
  trigger_days INTEGER, -- Days before/after event to trigger
  trigger_type TEXT CHECK (trigger_type IN ('before', 'after', 'on')),
  
  -- Channels
  channels TEXT[] DEFAULT ARRAY['whatsapp'],
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_templates_gym_id ON gym_notification_templates(gym_id);
CREATE INDEX idx_notification_templates_type ON gym_notification_templates(type);

-- ===============================================
-- 6. NOTIFICATIONS TABLE
-- Track sent notifications
-- ===============================================

CREATE TABLE IF NOT EXISTS gym_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gym_gyms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
  template_id UUID REFERENCES gym_notification_templates(id) ON DELETE SET NULL,
  
  -- Notification Info
  type TEXT NOT NULL CHECK (type IN ('expiry_reminder', 'payment_due', 'payment_overdue', 'welcome', 'birthday', 'receipt', 'custom')),
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'email', 'push')),
  
  -- Content
  subject TEXT,
  message TEXT NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'clicked')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  
  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Reference
  reference_type TEXT, -- 'payment', 'membership', etc.
  reference_id UUID,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_gym_id ON gym_notifications(gym_id);
CREATE INDEX idx_notifications_member_id ON gym_notifications(member_id);
CREATE INDEX idx_notifications_type ON gym_notifications(type);
CREATE INDEX idx_notifications_status ON gym_notifications(status);
CREATE INDEX idx_notifications_date ON gym_notifications(created_at);

-- ===============================================
-- 7. NOTIFICATION SETTINGS TABLE
-- Per-gym notification configuration
-- ===============================================

CREATE TABLE IF NOT EXISTS gym_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID UNIQUE NOT NULL REFERENCES gym_gyms(id) ON DELETE CASCADE,
  
  -- Expiry Reminders
  expiry_reminder_enabled BOOLEAN DEFAULT TRUE,
  expiry_reminder_days INTEGER[] DEFAULT ARRAY[7, 3, 1, 0], -- Days before expiry
  
  -- Payment Due Reminders
  payment_due_enabled BOOLEAN DEFAULT TRUE,
  payment_due_days INTEGER[] DEFAULT ARRAY[0], -- On due date
  
  -- Overdue Reminders
  payment_overdue_enabled BOOLEAN DEFAULT TRUE,
  payment_overdue_days INTEGER[] DEFAULT ARRAY[1, 3, 7], -- Days after due date
  
  -- Other Notifications
  welcome_enabled BOOLEAN DEFAULT TRUE,
  birthday_enabled BOOLEAN DEFAULT TRUE,
  receipt_enabled BOOLEAN DEFAULT TRUE,
  
  -- Default Channel
  default_channel TEXT DEFAULT 'whatsapp' CHECK (default_channel IN ('whatsapp', 'sms', 'email')),
  
  -- WhatsApp Settings
  whatsapp_business_number TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- 8. MEMBER HISTORY TABLE
-- Track all changes to member data
-- ===============================================

CREATE TABLE IF NOT EXISTS gym_member_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gym_gyms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
  
  -- Change Info
  change_type TEXT NOT NULL CHECK (change_type IN ('created', 'updated', 'status_changed', 'plan_changed', 'payment_made', 'period_started', 'period_ended', 'rejoined')),
  
  -- Details
  old_value JSONB,
  new_value JSONB,
  description TEXT,
  
  -- Who made the change
  changed_by UUID REFERENCES gym_users(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_member_history_gym_id ON gym_member_history(gym_id);
CREATE INDEX idx_member_history_member_id ON gym_member_history(member_id);
CREATE INDEX idx_member_history_type ON gym_member_history(change_type);
CREATE INDEX idx_member_history_date ON gym_member_history(created_at);

-- ===============================================
-- 9. GYM SETTINGS TABLE
-- Additional gym configuration
-- ===============================================

ALTER TABLE gym_gyms
ADD COLUMN IF NOT EXISTS address_line1 TEXT,
ADD COLUMN IF NOT EXISTS address_line2 TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS zip_code TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'India',
ADD COLUMN IF NOT EXISTS gst_number TEXT,
ADD COLUMN IF NOT EXISTS receipt_prefix TEXT DEFAULT 'RCP',
ADD COLUMN IF NOT EXISTS receipt_counter INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS member_counter INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS date_format TEXT DEFAULT 'DD/MM/YYYY',
ADD COLUMN IF NOT EXISTS time_format TEXT DEFAULT '12h';

-- ===============================================
-- 10. CALENDAR EVENTS VIEW
-- Unified view for calendar display
-- ===============================================

CREATE OR REPLACE VIEW gym_calendar_events AS
-- Expiring Memberships
SELECT 
  gm.gym_id,
  gm.id as member_id,
  gm.full_name as member_name,
  gm.phone as member_phone,
  gm.photo_url,
  gm.membership_end_date as event_date,
  'expiry' as event_type,
  CONCAT('Membership expires for ', gm.full_name) as event_title,
  gm.plan_amount as amount,
  gm.membership_plan as plan_name,
  CASE 
    WHEN gm.membership_end_date < CURRENT_DATE THEN 'overdue'
    WHEN gm.membership_end_date = CURRENT_DATE THEN 'today'
    WHEN gm.membership_end_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'upcoming'
    ELSE 'future'
  END as urgency
FROM gym_members gm
WHERE gm.status = 'active' 
  AND gm.membership_end_date IS NOT NULL

UNION ALL

-- Payment Due Dates
SELECT 
  gm.gym_id,
  gm.id as member_id,
  gm.full_name as member_name,
  gm.phone as member_phone,
  gm.photo_url,
  gm.next_payment_due_date as event_date,
  'payment_due' as event_type,
  CONCAT('Payment due from ', gm.full_name) as event_title,
  gm.plan_amount as amount,
  gm.membership_plan as plan_name,
  CASE 
    WHEN gm.next_payment_due_date < CURRENT_DATE THEN 'overdue'
    WHEN gm.next_payment_due_date = CURRENT_DATE THEN 'today'
    WHEN gm.next_payment_due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'upcoming'
    ELSE 'future'
  END as urgency
FROM gym_members gm
WHERE gm.status = 'active' 
  AND gm.next_payment_due_date IS NOT NULL

UNION ALL

-- Birthdays
SELECT 
  gm.gym_id,
  gm.id as member_id,
  gm.full_name as member_name,
  gm.phone as member_phone,
  gm.photo_url,
  -- Create date in current year
  MAKE_DATE(
    EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
    EXTRACT(MONTH FROM gm.date_of_birth)::INTEGER,
    EXTRACT(DAY FROM gm.date_of_birth)::INTEGER
  ) as event_date,
  'birthday' as event_type,
  CONCAT('Birthday: ', gm.full_name) as event_title,
  NULL::DECIMAL as amount,
  NULL as plan_name,
  'info' as urgency
FROM gym_members gm
WHERE gm.status = 'active' 
  AND gm.date_of_birth IS NOT NULL;

-- ===============================================
-- 11. FUNCTIONS FOR MEMBERSHIP CALCULATIONS
-- ===============================================

-- Function to calculate membership end date
CREATE OR REPLACE FUNCTION calculate_membership_end_date(
  p_start_date DATE,
  p_duration_months INTEGER,
  p_bonus_months INTEGER DEFAULT 0
) RETURNS DATE AS $$
BEGIN
  RETURN p_start_date + INTERVAL '1 month' * (p_duration_months + COALESCE(p_bonus_months, 0));
END;
$$ LANGUAGE plpgsql;

-- Function to get next payment due date
CREATE OR REPLACE FUNCTION calculate_next_payment_due(
  p_end_date DATE
) RETURNS DATE AS $$
BEGIN
  RETURN p_end_date + INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;

-- Function to get member status based on dates
CREATE OR REPLACE FUNCTION get_member_status(
  p_end_date DATE,
  p_current_status TEXT
) RETURNS TEXT AS $$
BEGIN
  IF p_current_status = 'inactive' THEN
    RETURN 'inactive';
  ELSIF p_end_date < CURRENT_DATE - INTERVAL '30 days' THEN
    RETURN 'inactive';
  ELSIF p_end_date < CURRENT_DATE THEN
    RETURN 'expired';
  ELSE
    RETURN 'active';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- 12. TRIGGER FOR AUTO-UPDATING MEMBER STATUS
-- ===============================================

CREATE OR REPLACE FUNCTION update_member_status_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_duration INTEGER;
  v_bonus_months INTEGER;
  v_new_end_date DATE;
  v_plan_name TEXT;
  v_plan_amount DECIMAL;
BEGIN
  -- Get plan details
  SELECT 
    COALESCE(base_duration_months, duration_months),
    COALESCE(bonus_duration_months, 0),
    name,
    COALESCE(final_price, price)
  INTO v_plan_duration, v_bonus_months, v_plan_name, v_plan_amount
  FROM gym_membership_plans
  WHERE id = (SELECT plan_id FROM gym_members WHERE id = NEW.member_id);
  
  -- Calculate new end date from payment date
  v_new_end_date := NEW.payment_date + INTERVAL '1 month' * (COALESCE(v_plan_duration, 1) + COALESCE(v_bonus_months, 0));
  
  -- Update member
  UPDATE gym_members
  SET 
    membership_end_date = v_new_end_date,
    next_payment_due_date = v_new_end_date + INTERVAL '1 day',
    last_payment_date = NEW.payment_date,
    last_payment_amount = NEW.amount,
    total_payments_received = COALESCE(total_payments_received, 0) + NEW.amount,
    lifetime_value = COALESCE(lifetime_value, 0) + NEW.amount,
    status = 'active',
    updated_at = NOW()
  WHERE id = NEW.member_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS trg_update_member_on_payment ON gym_payments;
CREATE TRIGGER trg_update_member_on_payment
  AFTER INSERT ON gym_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_member_status_on_payment();

-- ===============================================
-- 13. TRIGGER FOR REVERTING PAYMENT DELETION
-- ===============================================

CREATE OR REPLACE FUNCTION revert_member_on_payment_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_previous_payment RECORD;
  v_plan_duration INTEGER;
  v_bonus_months INTEGER;
BEGIN
  -- Get the previous payment for this member
  SELECT * INTO v_previous_payment
  FROM gym_payments
  WHERE member_id = OLD.member_id
    AND id != OLD.id
  ORDER BY payment_date DESC
  LIMIT 1;
  
  -- Get plan details
  SELECT 
    COALESCE(base_duration_months, duration_months),
    COALESCE(bonus_duration_months, 0)
  INTO v_plan_duration, v_bonus_months
  FROM gym_membership_plans
  WHERE id = (SELECT plan_id FROM gym_members WHERE id = OLD.member_id);
  
  IF v_previous_payment IS NULL THEN
    -- No previous payment, reset to joining state
    UPDATE gym_members
    SET 
      membership_end_date = joining_date + INTERVAL '1 month' * (COALESCE(v_plan_duration, 1) + COALESCE(v_bonus_months, 0)),
      next_payment_due_date = joining_date + INTERVAL '1 month' * (COALESCE(v_plan_duration, 1) + COALESCE(v_bonus_months, 0)) + INTERVAL '1 day',
      last_payment_date = NULL,
      last_payment_amount = NULL,
      total_payments_received = COALESCE(total_payments_received, 0) - OLD.amount,
      lifetime_value = GREATEST(COALESCE(lifetime_value, 0) - OLD.amount, 0),
      updated_at = NOW()
    WHERE id = OLD.member_id;
  ELSE
    -- Revert to previous payment state
    UPDATE gym_members
    SET 
      membership_end_date = v_previous_payment.payment_date + INTERVAL '1 month' * (COALESCE(v_plan_duration, 1) + COALESCE(v_bonus_months, 0)),
      next_payment_due_date = v_previous_payment.payment_date + INTERVAL '1 month' * (COALESCE(v_plan_duration, 1) + COALESCE(v_bonus_months, 0)) + INTERVAL '1 day',
      last_payment_date = v_previous_payment.payment_date,
      last_payment_amount = v_previous_payment.amount,
      total_payments_received = COALESCE(total_payments_received, 0) - OLD.amount,
      lifetime_value = GREATEST(COALESCE(lifetime_value, 0) - OLD.amount, 0),
      updated_at = NOW()
    WHERE id = OLD.member_id;
  END IF;
  
  -- Update status based on new dates
  UPDATE gym_members
  SET status = CASE 
    WHEN membership_end_date < CURRENT_DATE THEN 'inactive'
    ELSE 'active'
  END
  WHERE id = OLD.member_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_revert_member_on_payment_delete ON gym_payments;
CREATE TRIGGER trg_revert_member_on_payment_delete
  AFTER DELETE ON gym_payments
  FOR EACH ROW
  EXECUTE FUNCTION revert_member_on_payment_delete();

-- ===============================================
-- 14. FUNCTION TO GENERATE RECEIPT NUMBER
-- ===============================================

CREATE OR REPLACE FUNCTION generate_receipt_number(p_gym_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_prefix TEXT;
  v_counter INTEGER;
  v_year TEXT;
BEGIN
  -- Get prefix and increment counter
  SELECT 
    COALESCE(receipt_prefix, 'RCP'),
    COALESCE(receipt_counter, 0) + 1
  INTO v_prefix, v_counter
  FROM gym_gyms
  WHERE id = p_gym_id;
  
  -- Update counter
  UPDATE gym_gyms
  SET receipt_counter = v_counter
  WHERE id = p_gym_id;
  
  -- Generate receipt number
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  RETURN v_prefix || '-' || v_year || '-' || LPAD(v_counter::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- 15. RLS POLICIES FOR NEW TABLES
-- ===============================================

-- Membership Periods
ALTER TABLE gym_membership_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gym_membership_periods_select" ON gym_membership_periods
  FOR SELECT USING (gym_id = get_current_gym_id());

CREATE POLICY "gym_membership_periods_insert" ON gym_membership_periods
  FOR INSERT WITH CHECK (gym_id = get_current_gym_id());

CREATE POLICY "gym_membership_periods_update" ON gym_membership_periods
  FOR UPDATE USING (gym_id = get_current_gym_id());

CREATE POLICY "gym_membership_periods_delete" ON gym_membership_periods
  FOR DELETE USING (gym_id = get_current_gym_id());

-- Receipts
ALTER TABLE gym_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gym_receipts_select" ON gym_receipts
  FOR SELECT USING (gym_id = get_current_gym_id());

CREATE POLICY "gym_receipts_insert" ON gym_receipts
  FOR INSERT WITH CHECK (gym_id = get_current_gym_id());

CREATE POLICY "gym_receipts_update" ON gym_receipts
  FOR UPDATE USING (gym_id = get_current_gym_id());

CREATE POLICY "gym_receipts_delete" ON gym_receipts
  FOR DELETE USING (gym_id = get_current_gym_id());

-- Notification Templates
ALTER TABLE gym_notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gym_notification_templates_select" ON gym_notification_templates
  FOR SELECT USING (gym_id = get_current_gym_id());

CREATE POLICY "gym_notification_templates_insert" ON gym_notification_templates
  FOR INSERT WITH CHECK (gym_id = get_current_gym_id());

CREATE POLICY "gym_notification_templates_update" ON gym_notification_templates
  FOR UPDATE USING (gym_id = get_current_gym_id());

CREATE POLICY "gym_notification_templates_delete" ON gym_notification_templates
  FOR DELETE USING (gym_id = get_current_gym_id());

-- Notifications
ALTER TABLE gym_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gym_notifications_select" ON gym_notifications
  FOR SELECT USING (gym_id = get_current_gym_id());

CREATE POLICY "gym_notifications_insert" ON gym_notifications
  FOR INSERT WITH CHECK (gym_id = get_current_gym_id());

CREATE POLICY "gym_notifications_update" ON gym_notifications
  FOR UPDATE USING (gym_id = get_current_gym_id());

CREATE POLICY "gym_notifications_delete" ON gym_notifications
  FOR DELETE USING (gym_id = get_current_gym_id());

-- Notification Settings
ALTER TABLE gym_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gym_notification_settings_select" ON gym_notification_settings
  FOR SELECT USING (gym_id = get_current_gym_id());

CREATE POLICY "gym_notification_settings_insert" ON gym_notification_settings
  FOR INSERT WITH CHECK (gym_id = get_current_gym_id());

CREATE POLICY "gym_notification_settings_update" ON gym_notification_settings
  FOR UPDATE USING (gym_id = get_current_gym_id());

CREATE POLICY "gym_notification_settings_delete" ON gym_notification_settings
  FOR DELETE USING (gym_id = get_current_gym_id());

-- Member History
ALTER TABLE gym_member_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gym_member_history_select" ON gym_member_history
  FOR SELECT USING (gym_id = get_current_gym_id());

CREATE POLICY "gym_member_history_insert" ON gym_member_history
  FOR INSERT WITH CHECK (gym_id = get_current_gym_id());

-- ===============================================
-- 16. INSERT DEFAULT NOTIFICATION TEMPLATES
-- ===============================================

-- This will be done per-gym when they set up notifications

-- ===============================================
-- 17. MIGRATION FOR EXISTING DATA
-- Create Period #1 for all existing members
-- ===============================================

INSERT INTO gym_membership_periods (
  gym_id,
  member_id,
  period_number,
  plan_id,
  plan_name,
  plan_duration_months,
  plan_amount,
  bonus_months,
  discount_amount,
  paid_amount,
  start_date,
  end_date,
  next_payment_due,
  status
)
SELECT 
  gm.gym_id,
  gm.id,
  1,
  gm.plan_id,
  COALESCE(gmp.name, gm.membership_plan),
  COALESCE(gmp.duration_months, 
    CASE gm.membership_plan 
      WHEN 'monthly' THEN 1 
      WHEN 'quarterly' THEN 3 
      WHEN 'half_yearly' THEN 6 
      WHEN 'annual' THEN 12 
      ELSE 1 
    END),
  gm.plan_amount,
  0,
  0,
  gm.plan_amount,
  gm.joining_date,
  COALESCE(gm.membership_end_date, gm.joining_date + INTERVAL '1 month'),
  gm.next_payment_due_date,
  CASE 
    WHEN gm.status = 'inactive' THEN 'expired'
    WHEN gm.membership_end_date < CURRENT_DATE THEN 'expired'
    ELSE 'active'
  END
FROM gym_members gm
LEFT JOIN gym_membership_plans gmp ON gm.plan_id = gmp.id
WHERE NOT EXISTS (
  SELECT 1 FROM gym_membership_periods gp WHERE gp.member_id = gm.id
);

-- Update members with period references
UPDATE gym_members gm
SET 
  current_period_id = (
    SELECT id FROM gym_membership_periods gp 
    WHERE gp.member_id = gm.id 
    ORDER BY period_number DESC 
    LIMIT 1
  ),
  first_joining_date = COALESCE(first_joining_date, joining_date),
  total_periods = (
    SELECT COUNT(*) FROM gym_membership_periods gp 
    WHERE gp.member_id = gm.id
  ),
  lifetime_value = COALESCE(total_payments_received, plan_amount)
WHERE current_period_id IS NULL;

-- ===============================================
-- MIGRATION COMPLETE
-- ===============================================
