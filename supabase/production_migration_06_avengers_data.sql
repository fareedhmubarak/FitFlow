-- =====================================================
-- FITFLOW PRODUCTION DATA MIGRATION - AVENGERS GYM
-- Date: December 6, 2025
-- Source: Dev Database (qvszzwfvkvjxpkkiilyv)
-- Target: Production Database (dbtdarmxvgbxeinwcxka)
-- =====================================================
-- 
-- MIGRATION SUMMARY:
-- - 1 Gym Record
-- - 1 User Record (gym owner)
-- - 4 Membership Plans
-- - 133 Members (128 active, 5 inactive)
-- - 102 Payment Records
-- - 174 Payment Schedule Records (102 paid, 65 pending, 7 overdue)
-- - Member Photos (need storage bucket migration)
--
-- IMPORTANT: Run this AFTER all schema migrations are complete
-- =====================================================

-- =====================================================
-- STEP 1: DISABLE TRIGGERS TEMPORARILY
-- =====================================================
-- This prevents triggers from firing during bulk insert
-- and creating duplicate payment_schedule records

ALTER TABLE gym_payments DISABLE TRIGGER ALL;
ALTER TABLE gym_members DISABLE TRIGGER ALL;

-- =====================================================
-- STEP 2: INSERT GYM RECORD
-- =====================================================

INSERT INTO gym_gyms (
  id, name, slug, email, phone, address, city, state, country, pincode,
  currency, currency_symbol, timezone, status, is_protected,
  receipt_prefix, receipt_counter, settings, created_at, updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Avengers Gym',
  'avengers-gym',
  'avengers@gym.com',
  '+919876543210',
  '123 Hero Street, Marvel District',
  'Mumbai',
  'Maharashtra',
  'India',
  '400001',
  'INR',
  '₹',
  'Asia/Kolkata',
  'active',
  true,  -- is_protected
  'AVG',
  102,   -- receipt_counter (matches payment count)
  '{"theme": "default", "features": {"sms": true, "email": true, "whatsapp": true}}',
  '2024-01-01 00:00:00+00',
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  receipt_counter = EXCLUDED.receipt_counter,
  updated_at = NOW();

-- =====================================================
-- STEP 3: INSERT GYM USER (OWNER)
-- =====================================================
-- NOTE: The auth_user_id must match an existing auth.users record
-- You may need to create the auth user first via Supabase Dashboard

INSERT INTO gym_users (
  id, gym_id, auth_user_id, email, full_name, role, status, created_at, updated_at
) VALUES (
  'u0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  NULL,  -- Set this to actual auth.users UUID after creating auth user
  'avengers@gym.com',
  'Tony Stark',
  'owner',
  'active',
  '2024-01-01 00:00:00+00',
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  updated_at = NOW();

-- =====================================================
-- STEP 4: INSERT MEMBERSHIP PLANS
-- =====================================================

INSERT INTO gym_membership_plans (id, gym_id, name, description, price, duration_months, base_duration_months, bonus_duration_months, status, features, created_at, updated_at) VALUES
('p0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Monthly Basic', 'Basic monthly membership with gym access', 1000, 1, 1, 0, 'active', '["Gym Access", "Locker"]', '2024-01-01 00:00:00+00', NOW()),
('p0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Quarterly Standard', 'Standard quarterly membership', 2700, 3, 3, 0, 'active', '["Gym Access", "Locker", "Personal Training 2x"]', '2024-01-01 00:00:00+00', NOW()),
('p0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Half Yearly Premium', 'Premium half-yearly with bonus month', 5000, 7, 6, 1, 'active', '["Gym Access", "Locker", "Personal Training 4x", "Nutrition Plan"]', '2024-01-01 00:00:00+00', NOW()),
('p0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Annual Elite', 'Elite annual membership with 2 bonus months', 9000, 14, 12, 2, 'active', '["Gym Access", "Premium Locker", "Unlimited PT", "Nutrition Plan", "Spa Access"]', '2024-01-01 00:00:00+00', NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  duration_months = EXCLUDED.duration_months,
  updated_at = NOW();

-- =====================================================
-- STEP 5: INSERT MEMBERS
-- =====================================================
-- NOTE: photo_url paths need to be updated after storage migration
-- Current format: https://[DEV_PROJECT].supabase.co/storage/v1/object/public/member-photos/...
-- Target format: https://[PROD_PROJECT].supabase.co/storage/v1/object/public/member-photos/...

-- You need to run this query on DEV to get all member data:
/*
SELECT 
  'INSERT INTO gym_members (id, gym_id, member_id, full_name, email, phone, gender, date_of_birth, address, emergency_contact_name, emergency_contact_phone, photo_url, plan_id, plan_name, plan_amount, membership_type, joining_date, membership_start_date, membership_end_date, next_payment_due_date, last_payment_date, last_payment_amount, total_payments_received, lifetime_value, status, notes, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(gym_id) || ', ' ||
  quote_literal(member_id) || ', ' ||
  quote_literal(full_name) || ', ' ||
  COALESCE(quote_literal(email), 'NULL') || ', ' ||
  quote_literal(phone) || ', ' ||
  quote_literal(gender) || ', ' ||
  COALESCE(quote_literal(date_of_birth::text), 'NULL') || ', ' ||
  COALESCE(quote_literal(address), 'NULL') || ', ' ||
  COALESCE(quote_literal(emergency_contact_name), 'NULL') || ', ' ||
  COALESCE(quote_literal(emergency_contact_phone), 'NULL') || ', ' ||
  COALESCE(quote_literal(REPLACE(photo_url, 'qvszzwfvkvjxpkkiilyv', 'dbtdarmxvgbxeinwcxka')), 'NULL') || ', ' ||
  COALESCE(quote_literal(plan_id::text), 'NULL') || ', ' ||
  COALESCE(quote_literal(plan_name), 'NULL') || ', ' ||
  COALESCE(plan_amount::text, 'NULL') || ', ' ||
  COALESCE(quote_literal(membership_type), '''monthly''') || ', ' ||
  quote_literal(joining_date::text) || ', ' ||
  COALESCE(quote_literal(membership_start_date::text), 'NULL') || ', ' ||
  COALESCE(quote_literal(membership_end_date::text), 'NULL') || ', ' ||
  COALESCE(quote_literal(next_payment_due_date::text), 'NULL') || ', ' ||
  COALESCE(quote_literal(last_payment_date::text), 'NULL') || ', ' ||
  COALESCE(last_payment_amount::text, 'NULL') || ', ' ||
  COALESCE(total_payments_received::text, '0') || ', ' ||
  COALESCE(lifetime_value::text, '0') || ', ' ||
  quote_literal(status) || ', ' ||
  COALESCE(quote_literal(notes), 'NULL') || ', ' ||
  quote_literal(created_at::text) || ', NOW());'
FROM gym_members 
WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'
ORDER BY created_at;
*/

-- PLACEHOLDER: Paste generated INSERT statements here after running above query
-- Example format:
-- INSERT INTO gym_members (id, gym_id, member_id, full_name, ...) VALUES (...);

-- =====================================================
-- STEP 6: INSERT PAYMENTS
-- =====================================================

-- Run this query on DEV to get all payment data:
/*
SELECT 
  'INSERT INTO gym_payments (id, gym_id, member_id, amount, payment_date, payment_method, payment_mode, due_date, receipt_number, notes, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(gym_id) || ', ' ||
  quote_literal(member_id) || ', ' ||
  amount::text || ', ' ||
  quote_literal(payment_date::text) || ', ' ||
  COALESCE(quote_literal(payment_method), '''cash''') || ', ' ||
  COALESCE(quote_literal(payment_mode), '''offline''') || ', ' ||
  COALESCE(quote_literal(due_date::text), 'NULL') || ', ' ||
  COALESCE(quote_literal(receipt_number), 'NULL') || ', ' ||
  COALESCE(quote_literal(notes), 'NULL') || ', ' ||
  quote_literal(created_at::text) || ', NOW());'
FROM gym_payments 
WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'
ORDER BY created_at;
*/

-- PLACEHOLDER: Paste generated INSERT statements here after running above query

-- =====================================================
-- STEP 7: INSERT PAYMENT SCHEDULE
-- =====================================================

-- Run this query on DEV to get all payment schedule data:
/*
SELECT 
  'INSERT INTO gym_payment_schedule (id, gym_id, member_id, due_date, amount_due, status, paid_payment_id, paid_at, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(gym_id) || ', ' ||
  quote_literal(member_id) || ', ' ||
  quote_literal(due_date::text) || ', ' ||
  amount_due::text || ', ' ||
  quote_literal(status) || ', ' ||
  COALESCE(quote_literal(paid_payment_id::text), 'NULL') || ', ' ||
  COALESCE(quote_literal(paid_at::text), 'NULL') || ', ' ||
  quote_literal(created_at::text) || ', NOW());'
FROM gym_payment_schedule 
WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'
ORDER BY created_at;
*/

-- PLACEHOLDER: Paste generated INSERT statements here after running above query

-- =====================================================
-- STEP 8: RE-ENABLE TRIGGERS
-- =====================================================

ALTER TABLE gym_payments ENABLE TRIGGER ALL;
ALTER TABLE gym_members ENABLE TRIGGER ALL;

-- =====================================================
-- STEP 9: VERIFY DATA MIGRATION
-- =====================================================

-- Run these queries to verify data was migrated correctly:
/*
SELECT 'Gym' as table_name, COUNT(*) as count FROM gym_gyms WHERE id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL SELECT 'Users', COUNT(*) FROM gym_users WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL SELECT 'Plans', COUNT(*) FROM gym_membership_plans WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL SELECT 'Members', COUNT(*) FROM gym_members WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL SELECT 'Payments', COUNT(*) FROM gym_payments WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL SELECT 'Payment Schedule', COUNT(*) FROM gym_payment_schedule WHERE gym_id = 'a0000000-0000-0000-0000-000000000001';
*/

-- Expected Results:
-- Gym: 1
-- Users: 1
-- Plans: 4
-- Members: 133
-- Payments: 102
-- Payment Schedule: 174

-- =====================================================
-- STORAGE MIGRATION NOTES
-- =====================================================
-- 
-- Member photos are stored in Supabase Storage bucket: member-photos
-- 
-- OPTION 1: Manual Migration via Dashboard
-- 1. Download all photos from DEV storage bucket
-- 2. Upload to PRODUCTION storage bucket maintaining same folder structure
-- 3. Photo URLs will automatically work after replacing project ID in member records
--
-- OPTION 2: Script Migration
-- Use the Supabase CLI or SDK to copy files between buckets:
-- 
-- const { data: files } = await devSupabase.storage.from('member-photos').list();
-- for (const file of files) {
--   const { data } = await devSupabase.storage.from('member-photos').download(file.name);
--   await prodSupabase.storage.from('member-photos').upload(file.name, data);
-- }
--
-- Photo URL format:
-- DEV:  https://qvszzwfvkvjxpkkiilyv.supabase.co/storage/v1/object/public/member-photos/{gym_id}/{filename}
-- PROD: https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/member-photos/{gym_id}/{filename}
-- =====================================================
