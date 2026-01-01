-- =====================================================
-- COMPLETE PRODUCTION DATA RESTORE TO DEVELOPMENT
-- =====================================================
-- Source: Production FitFlowProd (dbtdarmxvgbxeinwcxka)
-- Target: GymDev (qvszzwfvkvjxpkkiilyv)
-- Date: 2026-01-01
-- =====================================================
-- 
-- STEP 1: Run this section first to clear existing data
-- in your DEVELOPMENT database
-- https://supabase.com/dashboard/project/qvszzwfvkvjxpkkiilyv/sql/new
-- =====================================================

DELETE FROM gym_payment_schedule WHERE gym_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM gym_payments WHERE gym_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM gym_members WHERE gym_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM gym_membership_plans WHERE gym_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM gym_users WHERE gym_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM gym_gyms WHERE id = 'a0000000-0000-0000-0000-000000000001';

-- =====================================================
-- STEP 2: INSERT gym_gyms
-- =====================================================

INSERT INTO gym_gyms (id, name, email, phone, language, timezone, currency, logo_url, address_line1, address_line2, city, state, zip_code, country, gst_number, receipt_prefix, receipt_counter, member_counter, date_format, time_format, is_protected, created_at, updated_at) 
VALUES ('a0000000-0000-0000-0000-000000000001', 'Avengers Gym', 'avengersgym@fitflow.in', '+919876543210', 'en', 'Asia/Kolkata', 'INR', NULL, 'Main Road', NULL, 'Hyderabad', 'Telangana', NULL, 'India', NULL, 'AVG', 0, 0, 'DD/MM/YYYY', '12h', true, '2025-12-07 03:47:09.175+00', '2025-12-07 03:47:12.679551+00');

-- =====================================================
-- STEP 3: INSERT gym_users
-- =====================================================

INSERT INTO gym_users (id, gym_id, auth_user_id, email, full_name, phone, role, is_active, created_at, updated_at)
VALUES ('499f6377-e323-4eed-921c-5dac05249edd', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'avengers@fitflow.app', 'Avengers Gym Admin', NULL, 'owner', true, '2025-12-07 03:47:09.773+00', '2025-12-07 03:47:13.079708+00');

-- =====================================================
-- STEP 4: INSERT gym_membership_plans
-- =====================================================

INSERT INTO gym_membership_plans (id, gym_id, name, description, duration_months, price, plan_type, is_active, display_order) VALUES 
('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Monthly', 'Monthly membership plan', 1, 1000.00, 'standard', true, 1),
('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '3 Months', 'Quarterly membership plan', 3, 2500.00, 'standard', true, 2),
('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', '6 Months', 'Half-yearly membership plan', 6, 4500.00, 'premium', true, 3),
('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Yearly', 'Annual membership plan', 12, 8500.00, 'vip', true, 4);

-- =====================================================
-- STEP 5-7: Members, Payments, Schedules
-- These are generated in separate files due to size
-- =====================================================
-- See:
--   - restore_prod_to_dev_members.sql (164 members)
--   - restore_prod_to_dev_payments.sql (161 payments)
--   - restore_prod_to_dev_schedules.sql (582 schedules)
-- =====================================================
