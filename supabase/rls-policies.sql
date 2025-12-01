-- ===============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Multi-Tenant Data Isolation for FitFlow
-- ===============================================

-- Enable RLS on all tables
ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's gym_id
CREATE OR REPLACE FUNCTION get_user_gym_id()
RETURNS UUID AS $$
  SELECT gym_id FROM gym_users WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- ===============================================
-- GYMS TABLE POLICIES
-- ===============================================

CREATE POLICY "Users can view their own gym"
  ON gyms FOR SELECT
  USING (id = get_user_gym_id());

CREATE POLICY "Owners can update their gym"
  ON gyms FOR UPDATE
  USING (
    id = get_user_gym_id() AND
    EXISTS (
      SELECT 1 FROM gym_users
      WHERE gym_id = gyms.id
      AND auth_user_id = auth.uid()
      AND role = 'owner'
    )
  );

-- ===============================================
-- GYM_USERS TABLE POLICIES
-- ===============================================

CREATE POLICY "Users can view their gym's staff"
  ON gym_users FOR SELECT
  USING (gym_id = get_user_gym_id());

CREATE POLICY "Owners and admins can insert staff"
  ON gym_users FOR INSERT
  WITH CHECK (
    gym_id = get_user_gym_id() AND
    EXISTS (
      SELECT 1 FROM gym_users
      WHERE gym_id = gym_users.gym_id
      AND auth_user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can update staff"
  ON gym_users FOR UPDATE
  USING (
    gym_id = get_user_gym_id() AND
    EXISTS (
      SELECT 1 FROM gym_users gu
      WHERE gu.gym_id = gym_users.gym_id
      AND gu.auth_user_id = auth.uid()
      AND gu.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners can delete staff"
  ON gym_users FOR DELETE
  USING (
    gym_id = get_user_gym_id() AND
    EXISTS (
      SELECT 1 FROM gym_users gu
      WHERE gu.gym_id = gym_users.gym_id
      AND gu.auth_user_id = auth.uid()
      AND gu.role = 'owner'
    )
  );

-- ===============================================
-- MEMBERS TABLE POLICIES
-- ===============================================

CREATE POLICY "Users can view their gym's members"
  ON members FOR SELECT
  USING (gym_id = get_user_gym_id());

CREATE POLICY "Users can insert members to their gym"
  ON members FOR INSERT
  WITH CHECK (gym_id = get_user_gym_id());

CREATE POLICY "Users can update their gym's members"
  ON members FOR UPDATE
  USING (gym_id = get_user_gym_id());

CREATE POLICY "Managers and above can delete members"
  ON members FOR DELETE
  USING (
    gym_id = get_user_gym_id() AND
    EXISTS (
      SELECT 1 FROM gym_users
      WHERE gym_id = members.gym_id
      AND auth_user_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager')
    )
  );

-- ===============================================
-- MEMBERSHIP_PLANS TABLE POLICIES
-- ===============================================

CREATE POLICY "Users can view their gym's plans"
  ON membership_plans FOR SELECT
  USING (gym_id = get_user_gym_id());

CREATE POLICY "Managers and above can manage plans"
  ON membership_plans FOR ALL
  USING (
    gym_id = get_user_gym_id() AND
    EXISTS (
      SELECT 1 FROM gym_users
      WHERE gym_id = membership_plans.gym_id
      AND auth_user_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager')
    )
  );

-- ===============================================
-- SUBSCRIPTIONS TABLE POLICIES
-- ===============================================

CREATE POLICY "Users can view their gym's subscriptions"
  ON subscriptions FOR SELECT
  USING (gym_id = get_user_gym_id());

CREATE POLICY "Users can create subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (gym_id = get_user_gym_id());

CREATE POLICY "Users can update subscriptions"
  ON subscriptions FOR UPDATE
  USING (gym_id = get_user_gym_id());

CREATE POLICY "Managers can delete subscriptions"
  ON subscriptions FOR DELETE
  USING (
    gym_id = get_user_gym_id() AND
    EXISTS (
      SELECT 1 FROM gym_users
      WHERE gym_id = subscriptions.gym_id
      AND auth_user_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager')
    )
  );

-- ===============================================
-- PAYMENTS TABLE POLICIES
-- ===============================================

CREATE POLICY "Users can view their gym's payments"
  ON payments FOR SELECT
  USING (gym_id = get_user_gym_id());

CREATE POLICY "Users can create payments"
  ON payments FOR INSERT
  WITH CHECK (gym_id = get_user_gym_id());

CREATE POLICY "Managers can update payments"
  ON payments FOR UPDATE
  USING (
    gym_id = get_user_gym_id() AND
    EXISTS (
      SELECT 1 FROM gym_users
      WHERE gym_id = payments.gym_id
      AND auth_user_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager')
    )
  );

-- ===============================================
-- CLASSES TABLE POLICIES
-- ===============================================

CREATE POLICY "Users can view their gym's classes"
  ON classes FOR SELECT
  USING (gym_id = get_user_gym_id());

CREATE POLICY "Managers and trainers can manage classes"
  ON classes FOR ALL
  USING (
    gym_id = get_user_gym_id() AND
    EXISTS (
      SELECT 1 FROM gym_users
      WHERE gym_id = classes.gym_id
      AND auth_user_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager', 'trainer')
    )
  );

-- ===============================================
-- CLASS_SCHEDULES TABLE POLICIES
-- ===============================================

CREATE POLICY "Users can view their gym's class schedules"
  ON class_schedules FOR SELECT
  USING (gym_id = get_user_gym_id());

CREATE POLICY "Managers and trainers can manage schedules"
  ON class_schedules FOR ALL
  USING (
    gym_id = get_user_gym_id() AND
    EXISTS (
      SELECT 1 FROM gym_users
      WHERE gym_id = class_schedules.gym_id
      AND auth_user_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager', 'trainer')
    )
  );

-- ===============================================
-- BOOKINGS TABLE POLICIES
-- ===============================================

CREATE POLICY "Users can view their gym's bookings"
  ON bookings FOR SELECT
  USING (gym_id = get_user_gym_id());

CREATE POLICY "Users can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (gym_id = get_user_gym_id());

CREATE POLICY "Users can update bookings"
  ON bookings FOR UPDATE
  USING (gym_id = get_user_gym_id());

CREATE POLICY "Users can delete bookings"
  ON bookings FOR DELETE
  USING (gym_id = get_user_gym_id());

-- ===============================================
-- CHECK_INS TABLE POLICIES
-- ===============================================

CREATE POLICY "Users can view their gym's check-ins"
  ON check_ins FOR SELECT
  USING (gym_id = get_user_gym_id());

CREATE POLICY "Users can create check-ins"
  ON check_ins FOR INSERT
  WITH CHECK (gym_id = get_user_gym_id());

-- ===============================================
-- NOTIFICATIONS TABLE POLICIES
-- ===============================================

CREATE POLICY "Users can view their gym's notifications"
  ON notifications FOR SELECT
  USING (gym_id = get_user_gym_id());

CREATE POLICY "Managers can manage notifications"
  ON notifications FOR ALL
  USING (
    gym_id = get_user_gym_id() AND
    EXISTS (
      SELECT 1 FROM gym_users
      WHERE gym_id = notifications.gym_id
      AND auth_user_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager')
    )
  );

-- ===============================================
-- LEADS TABLE POLICIES
-- ===============================================

CREATE POLICY "Users can view their gym's leads"
  ON leads FOR SELECT
  USING (gym_id = get_user_gym_id());

CREATE POLICY "Users can manage leads"
  ON leads FOR ALL
  USING (gym_id = get_user_gym_id());

-- ===============================================
-- PRODUCTS TABLE POLICIES
-- ===============================================

CREATE POLICY "Users can view their gym's products"
  ON products FOR SELECT
  USING (gym_id = get_user_gym_id());

CREATE POLICY "Managers can manage products"
  ON products FOR ALL
  USING (
    gym_id = get_user_gym_id() AND
    EXISTS (
      SELECT 1 FROM gym_users
      WHERE gym_id = products.gym_id
      AND auth_user_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager')
    )
  );

-- ===============================================
-- SALES_TRANSACTIONS TABLE POLICIES
-- ===============================================

CREATE POLICY "Users can view their gym's sales"
  ON sales_transactions FOR SELECT
  USING (gym_id = get_user_gym_id());

CREATE POLICY "Users can create sales"
  ON sales_transactions FOR INSERT
  WITH CHECK (gym_id = get_user_gym_id());

-- ===============================================
-- ANALYTICS_EVENTS TABLE POLICIES
-- ===============================================

CREATE POLICY "Users can view their gym's analytics"
  ON analytics_events FOR SELECT
  USING (gym_id = get_user_gym_id());

CREATE POLICY "System can insert analytics events"
  ON analytics_events FOR INSERT
  WITH CHECK (gym_id = get_user_gym_id());

-- ===============================================
-- ENABLE REALTIME (for WebSocket subscriptions)
-- ===============================================

ALTER PUBLICATION supabase_realtime ADD TABLE check_ins;
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE payments;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
