-- =====================================================
-- FITFLOW PRODUCTION MIGRATION - RLS POLICIES
-- Date: December 6, 2025
-- Purpose: Row Level Security for multi-tenant isolation
-- =====================================================

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE gym_gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_payment_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_membership_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_member_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_member_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_click_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_navigation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_performance_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- GYM_GYMS POLICIES
-- =====================================================

CREATE POLICY "gym_gyms_select_own"
  ON gym_gyms FOR SELECT
  USING (id = get_current_gym_id() OR auth.uid() IS NOT NULL);

CREATE POLICY "gym_gyms_update_own"
  ON gym_gyms FOR UPDATE
  USING (id = get_current_gym_id());

CREATE POLICY "gym_gyms_delete_own"
  ON gym_gyms FOR DELETE
  USING (id = get_current_gym_id());

CREATE POLICY "Allow gym creation during signup"
  ON gym_gyms FOR INSERT
  WITH CHECK (true);

-- Demo gym policies (for non-protected gyms)
CREATE POLICY "Demo gyms - allow anonymous update"
  ON gym_gyms FOR UPDATE
  USING (auth.uid() IS NULL AND (is_protected = false OR is_protected IS NULL));

CREATE POLICY "Demo gyms - allow anonymous delete"
  ON gym_gyms FOR DELETE
  USING (auth.uid() IS NULL AND (is_protected = false OR is_protected IS NULL));

-- =====================================================
-- GYM_USERS POLICIES
-- =====================================================

CREATE POLICY "gym_users_select_own_gym"
  ON gym_users FOR SELECT
  USING (gym_id = get_current_gym_id() OR auth_user_id = auth.uid());

CREATE POLICY "gym_users_update_own_gym"
  ON gym_users FOR UPDATE
  USING (gym_id = get_current_gym_id());

CREATE POLICY "gym_users_delete_own_gym"
  ON gym_users FOR DELETE
  USING (gym_id = get_current_gym_id());

CREATE POLICY "Allow gym user creation during signup"
  ON gym_users FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can create gym user"
  ON gym_users FOR INSERT
  WITH CHECK (auth_user_id = auth.uid());

-- =====================================================
-- GYM_MEMBERSHIP_PLANS POLICIES
-- =====================================================

CREATE POLICY "gym_plans_select_own_gym"
  ON gym_membership_plans FOR SELECT
  USING (gym_id = get_current_gym_id());

CREATE POLICY "gym_plans_insert_own_gym"
  ON gym_membership_plans FOR INSERT
  WITH CHECK (gym_id = get_current_gym_id());

CREATE POLICY "gym_plans_update_own_gym"
  ON gym_membership_plans FOR UPDATE
  USING (gym_id = get_current_gym_id());

CREATE POLICY "gym_plans_delete_own_gym"
  ON gym_membership_plans FOR DELETE
  USING (gym_id = get_current_gym_id());

-- Demo plans policies
CREATE POLICY "Demo plans - allow anonymous insert"
  ON gym_membership_plans FOR INSERT
  WITH CHECK (auth.uid() IS NULL AND is_demo_gym(gym_id));

CREATE POLICY "Demo plans - allow anonymous update"
  ON gym_membership_plans FOR UPDATE
  USING (auth.uid() IS NULL AND is_demo_gym(gym_id));

CREATE POLICY "Demo plans - allow anonymous delete"
  ON gym_membership_plans FOR DELETE
  USING (auth.uid() IS NULL AND is_demo_gym(gym_id));

-- =====================================================
-- GYM_MEMBERS POLICIES
-- =====================================================

CREATE POLICY "gym_members_select_own_gym"
  ON gym_members FOR SELECT
  USING (gym_id = get_current_gym_id());

CREATE POLICY "gym_members_insert_own_gym"
  ON gym_members FOR INSERT
  WITH CHECK (gym_id = get_current_gym_id());

CREATE POLICY "gym_members_update_own_gym"
  ON gym_members FOR UPDATE
  USING (gym_id = get_current_gym_id());

CREATE POLICY "gym_members_delete_own_gym"
  ON gym_members FOR DELETE
  USING (gym_id = get_current_gym_id());

-- Demo members policies
CREATE POLICY "Demo members - allow anonymous insert"
  ON gym_members FOR INSERT
  WITH CHECK (auth.uid() IS NULL AND is_demo_gym(gym_id));

CREATE POLICY "Demo members - allow anonymous update"
  ON gym_members FOR UPDATE
  USING (auth.uid() IS NULL AND is_demo_gym(gym_id));

CREATE POLICY "Demo members - allow anonymous delete"
  ON gym_members FOR DELETE
  USING (auth.uid() IS NULL AND is_demo_gym(gym_id));

-- =====================================================
-- GYM_PAYMENTS POLICIES
-- =====================================================

CREATE POLICY "gym_payments_select_own_gym"
  ON gym_payments FOR SELECT
  USING (gym_id = get_current_gym_id());

CREATE POLICY "gym_payments_insert_own_gym"
  ON gym_payments FOR INSERT
  WITH CHECK (gym_id = get_current_gym_id());

CREATE POLICY "gym_payments_update_own_gym"
  ON gym_payments FOR UPDATE
  USING (gym_id = get_current_gym_id());

CREATE POLICY "gym_payments_delete_own_gym"
  ON gym_payments FOR DELETE
  USING (gym_id = get_current_gym_id());

-- Demo payments policies
CREATE POLICY "Demo payments - allow anonymous insert"
  ON gym_payments FOR INSERT
  WITH CHECK (auth.uid() IS NULL AND is_demo_gym(gym_id));

CREATE POLICY "Demo payments - allow anonymous update"
  ON gym_payments FOR UPDATE
  USING (auth.uid() IS NULL AND is_demo_gym(gym_id));

CREATE POLICY "Demo payments - allow anonymous delete"
  ON gym_payments FOR DELETE
  USING (auth.uid() IS NULL AND is_demo_gym(gym_id));

-- =====================================================
-- GYM_PAYMENT_SCHEDULE POLICIES
-- =====================================================

CREATE POLICY "gym_schedule_select_own_gym"
  ON gym_payment_schedule FOR SELECT
  USING (gym_id = get_current_gym_id());

CREATE POLICY "gym_schedule_insert_own_gym"
  ON gym_payment_schedule FOR INSERT
  WITH CHECK (gym_id = get_current_gym_id());

CREATE POLICY "gym_schedule_update_own_gym"
  ON gym_payment_schedule FOR UPDATE
  USING (gym_id = get_current_gym_id());

CREATE POLICY "gym_schedule_delete_own_gym"
  ON gym_payment_schedule FOR DELETE
  USING (gym_id = get_current_gym_id());

-- =====================================================
-- GYM_MEMBERSHIP_PERIODS POLICIES
-- =====================================================

CREATE POLICY "gym_membership_periods_select"
  ON gym_membership_periods FOR SELECT
  USING (gym_id = get_current_gym_id());

CREATE POLICY "gym_membership_periods_insert"
  ON gym_membership_periods FOR INSERT
  WITH CHECK (gym_id = get_current_gym_id());

CREATE POLICY "gym_membership_periods_update"
  ON gym_membership_periods FOR UPDATE
  USING (gym_id = get_current_gym_id());

CREATE POLICY "gym_membership_periods_delete"
  ON gym_membership_periods FOR DELETE
  USING (gym_id = get_current_gym_id());

-- =====================================================
-- GYM_RECEIPTS POLICIES
-- =====================================================

CREATE POLICY "gym_receipts_select"
  ON gym_receipts FOR SELECT
  USING (gym_id = get_current_gym_id());

CREATE POLICY "gym_receipts_insert"
  ON gym_receipts FOR INSERT
  WITH CHECK (gym_id = get_current_gym_id());

CREATE POLICY "gym_receipts_update"
  ON gym_receipts FOR UPDATE
  USING (gym_id = get_current_gym_id());

CREATE POLICY "gym_receipts_delete"
  ON gym_receipts FOR DELETE
  USING (gym_id = get_current_gym_id());

-- =====================================================
-- GYM_MEMBER_PROGRESS POLICIES
-- =====================================================

CREATE POLICY "gym_member_progress_select"
  ON gym_member_progress FOR SELECT
  USING (gym_id = get_current_gym_id());

CREATE POLICY "gym_member_progress_insert"
  ON gym_member_progress FOR INSERT
  WITH CHECK (gym_id = get_current_gym_id());

CREATE POLICY "gym_member_progress_update"
  ON gym_member_progress FOR UPDATE
  USING (gym_id = get_current_gym_id());

CREATE POLICY "gym_member_progress_delete"
  ON gym_member_progress FOR DELETE
  USING (gym_id = get_current_gym_id());

-- =====================================================
-- GYM_MEMBER_HISTORY POLICIES
-- =====================================================

CREATE POLICY "gym_member_history_select"
  ON gym_member_history FOR SELECT
  USING (gym_id = get_current_gym_id());

CREATE POLICY "gym_member_history_insert"
  ON gym_member_history FOR INSERT
  WITH CHECK (gym_id = get_current_gym_id());

-- =====================================================
-- NOTIFICATION POLICIES
-- =====================================================

CREATE POLICY "gym_notification_settings_select"
  ON gym_notification_settings FOR SELECT
  USING (gym_id = get_current_gym_id());

CREATE POLICY "gym_notification_settings_insert"
  ON gym_notification_settings FOR INSERT
  WITH CHECK (gym_id = get_current_gym_id());

CREATE POLICY "gym_notification_settings_update"
  ON gym_notification_settings FOR UPDATE
  USING (gym_id = get_current_gym_id());

CREATE POLICY "gym_notification_settings_delete"
  ON gym_notification_settings FOR DELETE
  USING (gym_id = get_current_gym_id());

CREATE POLICY "gym_notification_templates_select"
  ON gym_notification_templates FOR SELECT
  USING (gym_id = get_current_gym_id());

CREATE POLICY "gym_notification_templates_insert"
  ON gym_notification_templates FOR INSERT
  WITH CHECK (gym_id = get_current_gym_id());

CREATE POLICY "gym_notification_templates_update"
  ON gym_notification_templates FOR UPDATE
  USING (gym_id = get_current_gym_id());

CREATE POLICY "gym_notification_templates_delete"
  ON gym_notification_templates FOR DELETE
  USING (gym_id = get_current_gym_id());

CREATE POLICY "gym_notifications_select"
  ON gym_notifications FOR SELECT
  USING (gym_id = get_current_gym_id());

CREATE POLICY "gym_notifications_insert"
  ON gym_notifications FOR INSERT
  WITH CHECK (gym_id = get_current_gym_id());

CREATE POLICY "gym_notifications_update"
  ON gym_notifications FOR UPDATE
  USING (gym_id = get_current_gym_id());

CREATE POLICY "gym_notifications_delete"
  ON gym_notifications FOR DELETE
  USING (gym_id = get_current_gym_id());

-- =====================================================
-- AUDIT/LOGGING POLICIES
-- =====================================================

CREATE POLICY "gym_sessions_select_own_gym"
  ON gym_sessions FOR SELECT
  USING (gym_id = get_current_gym_id() OR gym_id IS NULL);

CREATE POLICY "gym_sessions_insert"
  ON gym_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "gym_sessions_update_own_gym"
  ON gym_sessions FOR UPDATE
  USING (gym_id = get_current_gym_id() OR gym_id IS NULL);

CREATE POLICY "gym_audit_logs_select_own_gym"
  ON gym_audit_logs FOR SELECT
  USING (gym_id = get_current_gym_id() OR gym_id IS NULL);

CREATE POLICY "gym_audit_logs_insert"
  ON gym_audit_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "gym_api_logs_select_own_gym"
  ON gym_api_logs FOR SELECT
  USING (gym_id = get_current_gym_id() OR gym_id IS NULL);

CREATE POLICY "gym_api_logs_insert"
  ON gym_api_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "gym_error_logs_select_own_gym"
  ON gym_error_logs FOR SELECT
  USING (gym_id = get_current_gym_id() OR gym_id IS NULL);

CREATE POLICY "gym_error_logs_insert"
  ON gym_error_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "gym_click_logs_select_own_gym"
  ON gym_click_logs FOR SELECT
  USING (gym_id = get_current_gym_id() OR gym_id IS NULL);

CREATE POLICY "gym_click_logs_insert"
  ON gym_click_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "gym_navigation_logs_select_own_gym"
  ON gym_navigation_logs FOR SELECT
  USING (gym_id = get_current_gym_id() OR gym_id IS NULL);

CREATE POLICY "gym_navigation_logs_insert"
  ON gym_navigation_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "gym_performance_logs_select_own_gym"
  ON gym_performance_logs FOR SELECT
  USING (gym_id = get_current_gym_id() OR gym_id IS NULL);

CREATE POLICY "gym_performance_logs_insert"
  ON gym_performance_logs FOR INSERT
  WITH CHECK (true);
