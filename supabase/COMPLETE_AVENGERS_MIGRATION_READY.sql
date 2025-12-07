-- =====================================================
-- COMPLETE AVENGERS GYM MIGRATION - SINGLE FILE
-- =====================================================
-- Production Database: dbtdarmxvgbxeinwcxka
-- Date: December 7, 2025
--
-- ⭐ INSTRUCTIONS - SUPER SIMPLE ⭐
-- 1. Copy this ENTIRE file
-- 2. Production Supabase → SQL Editor  
-- 3. Paste and click RUN
-- 4. DONE!
--
-- Contains:
-- ✓ 1 Gym (Avengers)
-- ✓ 1 User (owner) + AUTH USER AUTO-CREATED
-- ✓ 4 Plans
-- ✓ 133 Members
-- ✓ 102 Payments
-- ✓ 174 Payment Schedules
--
-- IMPORTANT: Set password for avengers@fitflow.app after migration
-- Default password: FitFlow@2025! (Change immediately after first login)
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: CREATE AUTHENTICATION USER
-- =====================================================
-- This creates the actual auth user so you can login
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Create auth user
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at,
    is_sso_user,
    deleted_at
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    'c0000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'avengers@fitflow.app',
    crypt('FitFlow@2025!', gen_salt('bf')),
    NOW(),
    NULL,
    '',
    NULL,
    '',
    NULL,
    '',
    '',
    NULL,
    NULL,
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Avengers Gym Admin"}',
    NULL,
    NOW(),
    NOW(),
    NULL,
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    NULL,
    '',
    NULL,
    false,
    NULL
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create identity record
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    jsonb_build_object(
      'sub', 'c0000000-0000-0000-0000-000000000001',
      'email', 'avengers@fitflow.app'
    ),
    'email',
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE '✅ Auth user created: avengers@fitflow.app (Password: FitFlow@2025!)';
END $$;

-- =====================================================
-- STEP 2: CREATE GYM
-- =====================================================

-- =====================================================
-- STEP 2: CREATE GYM
-- =====================================================
INSERT INTO gym_gyms (
  id, name, email, phone, language, timezone, currency, logo_url,
  address_line1, address_line2, city, state, zip_code, country,
  gst_number, receipt_prefix, receipt_counter, member_counter,
  date_format, time_format, is_protected, created_at, updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Avengers Gym',
  'avengersgym@fitflow.in',
  '+919876543210',
  'en',
  'Asia/Kolkata',
  'INR',
  NULL,
  'Main Road',
  NULL,
  'Hyderabad',
  'Telangana',
  NULL,
  'India',
  NULL,
  'AVG',
  0,
  0,
  'DD/MM/YYYY',
  '12h',
  true,
  '2025-12-06 02:45:03.998825+00',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STEP 3: CREATE USER (Owner)
-- =====================================================
INSERT INTO gym_users (
  id, gym_id, auth_user_id, email, full_name, phone, role, is_active, created_at, updated_at
) VALUES (
  '499f6377-e323-4eed-921c-5dac05249edd',
  'a0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  'avengers@fitflow.app',
  'Avengers Gym Admin',
  NULL,
  'owner',
  true,
  '2025-12-06 02:53:37.757221+00',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STEP 4: CREATE MEMBERSHIP PLANS (4 plans)
-- =====================================================

-- Plan 1: Monthly (₹1000)
INSERT INTO gym_membership_plans (
  id, gym_id, name, description, duration_months, price, features,
  plan_type, is_active, display_order, bonus_duration_months,
  discount_type, discount_value, promo_type, current_uses, created_at, updated_at
) VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Monthly',
  'Monthly membership plan',
  1,
  1000.00,
  '[]',
  'standard',
  true,
  1,
  0,
  'none',
  0.00,
  'standard',
  0,
  '2025-12-06 02:45:12.896119+00',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Plan 2: 3 Months (₹2500)
INSERT INTO gym_membership_plans (
  id, gym_id, name, description, duration_months, price, features,
  plan_type, is_active, display_order, bonus_duration_months,
  discount_type, discount_value, promo_type, current_uses, created_at, updated_at
) VALUES (
  'b0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  '3 Months',
  'Quarterly membership plan',
  3,
  2500.00,
  '[]',
  'standard',
  true,
  2,
  0,
  'none',
  0.00,
  'standard',
  0,
  '2025-12-06 02:45:12.896119+00',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Plan 3: 6 Months (₹4500)
INSERT INTO gym_membership_plans (
  id, gym_id, name, description, duration_months, price, features,
  plan_type, is_active, display_order, bonus_duration_months,
  discount_type, discount_value, promo_type, current_uses, created_at, updated_at
) VALUES (
  'b0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  '6 Months',
  'Half-yearly membership plan',
  6,
  4500.00,
  '[]',
  'premium',
  true,
  3,
  0,
  'none',
  0.00,
  'standard',
  0,
  '2025-12-06 02:45:12.896119+00',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Plan 4: Yearly (₹8500)
INSERT INTO gym_membership_plans (
  id, gym_id, name, description, duration_months, price, features,
  plan_type, is_active, display_order, bonus_duration_months,
  discount_type, discount_value, promo_type, current_uses, created_at, updated_at
) VALUES (
  'b0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000001',
  'Yearly',
  'Annual membership plan',
  12,
  8500.00,
  '[]',
  'vip',
  true,
  4,
  0,
  'none',
  0.00,
  'standard',
  0,
  '2025-12-06 02:45:12.896119+00',
  NOW()
) ON CONFLICT (id) DO NOTHING;

COMMIT;

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Run after migration:
-- SELECT 'gym_gyms' as t, COUNT(*) FROM gym_gyms WHERE id = 'a0000000-0000-0000-0000-000000000001'
-- UNION ALL SELECT 'gym_users', COUNT(*) FROM gym_users WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'
-- UNION ALL SELECT 'gym_membership_plans', COUNT(*) FROM gym_membership_plans WHERE gym_id = 'a0000000-0000-0000-0000-000000000001';
-- =====================================================
-- PRODUCTION MIGRATION - PART 2A: MEMBERS (1-30)
-- Target: dbtdarmxvgbxeinwcxka (Production)
-- Gym: Avengers Gym (a0000000-0000-0000-0000-000000000001)
-- Run AFTER prod_01_gym_user_plans.sql
-- =====================================================

BEGIN;

-- =====================================================
-- MEMBERS BATCH 1 (1-30 of 133)
-- =====================================================

-- Missing member: Suresh (ID: 555e3020-9332-4e9a-848c-deb139568baf)
INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('555e3020-9332-4e9a-848c-deb139568baf','a0000000-0000-0000-0000-000000000001','Suresh','9035555651',NULL,'male',NULL,'87','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_157.jpg','2025-11-11','quarterly',2500.00,'active','b0000000-0000-0000-0000-000000000002','2026-02-11','2025-11-11','2026-02-11','2025-11-11',2500.00,2500.00,2500.00,'2025-12-06 02:49:08.694554+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('fe82e47f-200e-45ef-a816-8adbab127976','a0000000-0000-0000-0000-000000000001','Janaki ram','9676343710',NULL,'male','166','73','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_71.jpg','2025-11-06','quarterly',2500.00,'active','b0000000-0000-0000-0000-000000000002','2026-02-06','2025-11-06','2026-02-06','2025-11-06',2500.00,2500.00,2500.00,'2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('49e35abb-5534-4c52-866c-bca41ad58cbf','a0000000-0000-0000-0000-000000000001','Ismail','9533440610',NULL,'male',NULL,'74','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_53.jpg','2025-11-09','quarterly',2500.00,'active','b0000000-0000-0000-0000-000000000002','2026-02-09','2025-11-09','2026-02-09','2025-11-09',2500.00,2500.00,2500.00,'2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('329ed26c-e9c2-480a-a4da-a33871d6c795','a0000000-0000-0000-0000-000000000001','So Mohan kumar','9600769757',NULL,'male','175','43.7','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_69.jpg','2025-11-05','quarterly',2500.00,'active','b0000000-0000-0000-0000-000000000002','2026-02-05','2025-11-05','2026-02-05','2025-11-05',2500.00,2500.00,2500.00,'2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('860f22aa-8f92-4bad-be70-09a4c588c884','a0000000-0000-0000-0000-000000000001','Ashok','9949085030',NULL,'male','170','68','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_67.jpg','2025-11-05','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-05','2025-11-05','2025-12-05','2025-11-05',1000.00,1000.00,1000.00,'2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('eea6566a-a6c4-4c5a-b153-71a4c1851e2f','a0000000-0000-0000-0000-000000000001','Ajay  bro','7093631951',NULL,'male','180','80','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_47.jpg','2025-11-09','quarterly',2500.00,'active','b0000000-0000-0000-0000-000000000002','2026-02-09','2025-11-09','2026-02-09','2025-11-09',2500.00,2500.00,2500.00,'2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('73efac78-91d4-499f-aa07-fd86a39c64f2','a0000000-0000-0000-0000-000000000001','Kashif','9642307626',NULL,'male','172','79','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_36.jpg','2025-11-27','monthly',1000.00,'inactive','b0000000-0000-0000-0000-000000000001','2025-12-27','2025-11-27','2025-12-27','2025-11-27',1000.00,1000.00,1000.00,'2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('782b59c6-a2f6-4b1d-81cc-71ea4068f83e','a0000000-0000-0000-0000-000000000001','Vasu','9032722930',NULL,'male','185','80','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_70.jpg','2025-11-06','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-06','2025-11-06','2025-12-06','2025-11-06',1000.00,1000.00,1000.00,'2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('2a6ee905-0a10-4943-93fe-5ba3add00297','a0000000-0000-0000-0000-000000000001','Dhanujay ready','6281265501',NULL,'male','168','68','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_33.jpg','2025-11-01','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-01','2025-11-01','2025-12-01','2025-11-01',1000.00,1000.00,1000.00,'2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('af461e7f-ac13-47a9-b358-d61938c11fd2','a0000000-0000-0000-0000-000000000001','Pramod','9949470804',NULL,'male','170','59','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_46.jpg','2025-11-10','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-10','2025-11-10','2025-12-10','2025-11-10',1000.00,1000.00,1000.00,'2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('114145d0-d5a7-4036-9d4b-0862abc5802f','a0000000-0000-0000-0000-000000000001','N. Babu','9676269036',NULL,'male','165','77','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_60.jpg','2025-11-03','quarterly',2500.00,'active','b0000000-0000-0000-0000-000000000002','2026-02-03','2025-11-03','2026-02-03','2025-11-03',2500.00,2500.00,2500.00,'2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('0ebb1840-f1b1-4b7b-9afa-04ef3784bd9f','a0000000-0000-0000-0000-000000000001','Manoj','9110336947',NULL,'male','168','62','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_87.jpg','2025-11-15','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-15','2025-11-15','2025-12-15','2025-11-15',1000.00,1000.00,1000.00,'2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('c46d18fc-c312-46e9-ba67-28e041bf3dd1','a0000000-0000-0000-0000-000000000001','Pavan','6309962155',NULL,'male',NULL,'130','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_43.jpg','2025-11-01','quarterly',2500.00,'active','b0000000-0000-0000-0000-000000000002','2026-02-01','2025-11-01','2026-02-01','2025-11-01',2500.00,2500.00,2500.00,'2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('a5107a1d-17fc-4669-9a3f-1b2efbdc5991','a0000000-0000-0000-0000-000000000001','Bramhateja','9866800992',NULL,'male',NULL,'105','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_55.jpg','2025-11-01','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-01','2025-11-01','2025-12-01','2025-11-01',1000.00,1000.00,1000.00,'2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('2dbcbac0-162a-4765-ab32-0a7a46bc5cf7','a0000000-0000-0000-0000-000000000001','S palani','9347471124',NULL,'male',NULL,'67.5','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_83.jpg','2025-11-15','quarterly',2500.00,'active','b0000000-0000-0000-0000-000000000002','2026-02-15','2025-11-15','2026-02-15','2025-11-15',2500.00,2500.00,2500.00,'2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('1c61dd9e-69cc-4593-849c-176ed6a28123','a0000000-0000-0000-0000-000000000001','Jayasri','6303658151',NULL,'female',NULL,'63','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_44.jpg','2025-11-01','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-01','2025-11-01','2025-12-01','2025-11-01',1000.00,1000.00,1000.00,'2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('88aea046-c6a9-43cf-bede-b3c3d6624c0f','a0000000-0000-0000-0000-000000000001','Mr Dinesh Kumar','7793933634',NULL,'male',NULL,'95','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_52.jpg','2025-11-09','quarterly',2500.00,'active','b0000000-0000-0000-0000-000000000002','2026-02-09','2025-11-09','2026-02-09','2025-11-09',2500.00,2500.00,2500.00,'2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('e4e66bce-5f6e-4ba9-ac94-01e8e907f92a','a0000000-0000-0000-0000-000000000001','Adarsh','9494000132',NULL,'male',NULL,'85','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_30.jpg','2025-11-15','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-15','2025-11-15','2025-12-15','2025-11-15',1000.00,1000.00,1000.00,'2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('d29c2529-9526-4f92-a7d1-56974e89b883','a0000000-0000-0000-0000-000000000001','Sharath','7095682158',NULL,'male',NULL,'66','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_31.jpg','2025-11-20','monthly',1000.00,'inactive','b0000000-0000-0000-0000-000000000001','2025-12-20','2025-11-20','2025-12-20','2025-11-20',1000.00,1000.00,1000.00,'2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('0888748e-acb0-4c17-b607-425b34ad25f0','a0000000-0000-0000-0000-000000000001','Pream','8309577946',NULL,'male',NULL,'85','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_26.jpg','2025-11-20','quarterly',2500.00,'active','b0000000-0000-0000-0000-000000000002','2026-02-20','2025-11-20','2026-02-20','2025-11-20',2500.00,2500.00,2500.00,'2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('8975077e-a9fa-4f48-9e39-6d83bd42f7b7','a0000000-0000-0000-0000-000000000001','Sekar','7483286526',NULL,'male','165','80','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_35.jpg','2025-11-25','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-25','2025-11-25','2025-12-25','2025-11-25',1000.00,1000.00,1000.00,'2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('f9c0d23a-4553-4557-b564-bdf776b383e2','a0000000-0000-0000-0000-000000000001','Teja','7842732394',NULL,'male',NULL,'59','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_28.jpg','2025-11-16','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-16','2025-11-16','2025-12-16','2025-11-16',1000.00,1000.00,1000.00,'2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('a8468ade-1c2d-4c55-917c-a9efab90f94b','a0000000-0000-0000-0000-000000000001','Rohith','8125217166',NULL,'male',NULL,'51','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_64.jpg','2025-11-27','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-27','2025-11-27','2025-12-27','2025-11-27',1000.00,1000.00,1000.00,'2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('bd64b17b-9384-4945-812c-5d0c6abf8aee','a0000000-0000-0000-0000-000000000001','Sujith','9951000023',NULL,'male','179','93','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_39.jpg','2025-11-29','quarterly',2500.00,'active','b0000000-0000-0000-0000-000000000002','2026-02-28','2025-11-29','2026-02-28','2025-11-29',2500.00,2500.00,2500.00,'2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('411f7066-45fb-4467-a4f7-40fa96c5a6aa','a0000000-0000-0000-0000-000000000001','Devaraj','9100828815',NULL,'male','175','73','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_79.jpg','2025-11-01','quarterly',2500.00,'active','b0000000-0000-0000-0000-000000000002','2026-02-01','2025-11-01','2026-02-01','2025-11-01',2500.00,2500.00,2500.00,'2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('65bbabdb-ca47-496b-a306-f8da09cbe988','a0000000-0000-0000-0000-000000000001','Dinesh','9100115764',NULL,'male','168','80','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_57.jpg','2025-11-03','quarterly',2500.00,'active','b0000000-0000-0000-0000-000000000002','2026-02-03','2025-11-03','2026-02-03','2025-11-03',2500.00,2500.00,2500.00,'2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('ce0d7dca-f123-48e2-b2df-ef6997e8cc92','a0000000-0000-0000-0000-000000000001','Salman','7893589221',NULL,'male','165','64','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_76.jpg','2025-11-02','quarterly',2500.00,'active','b0000000-0000-0000-0000-000000000002','2026-02-02','2025-11-02','2026-02-02','2025-11-02',2500.00,2500.00,2500.00,'2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('deb65d40-52c1-4695-96f3-0697966c7301','a0000000-0000-0000-0000-000000000001','Muniraj','9652658065',NULL,'male',NULL,'86','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_68.jpg','2025-11-05','quarterly',2500.00,'active','b0000000-0000-0000-0000-000000000002','2026-02-05','2025-11-05','2026-02-05','2025-11-05',2500.00,2500.00,2500.00,'2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('7442c8fb-53aa-48d2-97ce-25fdfa3d1f30','a0000000-0000-0000-0000-000000000001','Sakib','9392160802',NULL,'male',NULL,'66','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_49.jpg','2025-11-15','quarterly',2500.00,'active','b0000000-0000-0000-0000-000000000002','2026-02-15','2025-11-15','2026-02-15','2025-11-15',2500.00,2500.00,2500.00,'2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('0e907068-9dbf-4283-965a-284dac747aaa','a0000000-0000-0000-0000-000000000001','Hari','7386229502',NULL,'male','170','82','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_82.jpg','2025-11-11','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-11','2025-11-11','2025-12-11','2025-11-11',1000.00,1000.00,1000.00,'2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

COMMIT;

-- =====================================================
-- VERIFICATION: Run after commit
-- =====================================================
-- SELECT COUNT(*) as members_part_a FROM gym_members WHERE gym_id = 'a0000000-0000-0000-0000-000000000001';
-- Expected: 30 (after this file)
-- =====================================================
-- PRODUCTION MIGRATION - PART 2B: MEMBERS (31-60)
-- Target: dbtdarmxvgbxeinwcxka (Production)
-- Gym: Avengers Gym (a0000000-0000-0000-0000-000000000001)
-- Run AFTER prod_02_members_part_a.sql
-- =====================================================

BEGIN;

-- =====================================================
-- MEMBERS BATCH 2 (31-60 of 133)
-- =====================================================

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('fc8382fd-c856-431c-b5ae-810b09dfebd5','a0000000-0000-0000-0000-000000000001','Ramanjinya','8722043110',NULL,'male',NULL,'85','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_106.jpg','2025-11-18','quarterly',2500.00,'active','b0000000-0000-0000-0000-000000000002','2026-02-18','2025-11-18','2026-02-18','2025-11-18',2500.00,2500.00,2500.00,'2025-12-06 02:48:15.616059+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('a2b00ea5-f4e6-4fd2-8aa7-1f3dc74de694','a0000000-0000-0000-0000-000000000001','Yugandhar','8639091348',NULL,'male','175','75','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_112.jpg','2025-11-19','quarterly',2500.00,'active','b0000000-0000-0000-0000-000000000002','2026-02-19','2025-11-19','2026-02-19','2025-11-19',2500.00,2500.00,2500.00,'2025-12-06 02:48:15.616059+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('3abd8568-d40c-4a7f-b824-04663d673444','a0000000-0000-0000-0000-000000000001','Subu','9177259338',NULL,'male',NULL,'75','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_96.jpg','2025-11-15','quarterly',2500.00,'active','b0000000-0000-0000-0000-000000000002','2026-02-15','2025-11-15','2026-02-15','2025-11-15',2500.00,2500.00,2500.00,'2025-12-06 02:48:15.616059+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('252817e6-86f8-404c-9e6f-e402833da2a3','a0000000-0000-0000-0000-000000000001','Vinod','8374052552',NULL,'male','178','81','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_111.jpg','2025-11-10','quarterly',2500.00,'active','b0000000-0000-0000-0000-000000000002','2026-02-10','2025-11-10','2026-02-10','2025-11-10',2500.00,2500.00,2500.00,'2025-12-06 02:48:15.616059+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('9f9a5e36-76f5-422f-8355-fe46882215f5','a0000000-0000-0000-0000-000000000001','Jaswanth','7993637021',NULL,'male',NULL,'85','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_107.jpg','2025-11-10','quarterly',2500.00,'active','b0000000-0000-0000-0000-000000000002','2026-02-10','2025-11-10','2026-02-10','2025-11-10',2500.00,2500.00,2500.00,'2025-12-06 02:48:15.616059+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('dac40a42-63a9-4732-b865-ac5cad82f364','a0000000-0000-0000-0000-000000000001','Prakash','9655593412',NULL,'male','178','80','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_103.jpg','2025-11-15','quarterly',2500.00,'active','b0000000-0000-0000-0000-000000000002','2026-02-15','2025-11-15','2026-02-15','2025-11-15',2500.00,2500.00,2500.00,'2025-12-06 02:48:15.616059+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('ea01652d-b37d-4583-bbd6-c4bb6e128ed9','a0000000-0000-0000-0000-000000000001','Hemanth','8105396384',NULL,'male',NULL,'75.3','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_100.jpg','2025-11-17','quarterly',2500.00,'active','b0000000-0000-0000-0000-000000000002','2026-02-17','2025-11-17','2026-02-17','2025-11-17',2500.00,2500.00,2500.00,'2025-12-06 02:48:15.616059+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('455c913a-18f9-44a4-992a-eb9fb11b7967','a0000000-0000-0000-0000-000000000001','Bhavani prasad','8074965550',NULL,'male',NULL,'85','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_102.jpg','2025-11-08','monthly',1000.00,'inactive','b0000000-0000-0000-0000-000000000001','2025-12-08','2025-11-08','2025-12-08','2025-11-08',1000.00,1000.00,1000.00,'2025-12-06 02:48:15.616059+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('2807b11f-1f90-4c54-9429-4f31bac466a4','a0000000-0000-0000-0000-000000000001','Hemanth''','9573468252',NULL,'male',NULL,'72.7','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_93.jpg','2025-11-14','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-14','2025-11-14','2025-12-14','2025-11-14',1000.00,1000.00,1000.00,'2025-12-06 02:48:15.616059+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('5e670063-37af-42b7-9a7e-e9cdbe51536e','a0000000-0000-0000-0000-000000000001','Radha Krishna','6302944600',NULL,'male',NULL,'64','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_90.jpg','2025-11-05','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-05','2025-11-05','2025-12-05','2025-11-05',1000.00,1000.00,1000.00,'2025-12-06 02:48:15.616059+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('c124edae-5e74-4fc3-b02d-7c98564b75e6','a0000000-0000-0000-0000-000000000001','Vamsi','8096477889',NULL,'male','170','82','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_89.jpg','2025-11-15','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-15','2025-11-15','2025-12-15','2025-11-15',1000.00,1000.00,1000.00,'2025-12-06 02:48:15.616059+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('bf10b0f9-368a-4ac4-826a-7efd2a36dc13','a0000000-0000-0000-0000-000000000001','Aishvrya','7337410348',NULL,'male','160','66','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_188.jpg','2025-11-10','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-10','2025-11-10','2025-12-10','2025-11-10',1000.00,1000.00,1000.00,'2025-12-06 02:49:08.694554+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('3b7b0d6b-0c11-4b2c-9b97-87e8694531a9','a0000000-0000-0000-0000-000000000001','Karthy','8106506201',NULL,'male','180','84','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_183.jpg','2025-11-30','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-30','2025-11-30','2025-12-30','2025-11-30',1000.00,1000.00,1000.00,'2025-12-06 02:49:08.694554+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('d5ac875b-afd7-43df-8908-23f81f79a2af','a0000000-0000-0000-0000-000000000001','Mohan ram','8096108952',NULL,'male','175','51','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_191.jpg','2025-11-10','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-10','2025-11-10','2025-12-10','2025-11-10',1000.00,1000.00,1000.00,'2025-12-06 02:49:08.694554+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('eec89812-9eac-4ea1-a459-eccb370cce57','a0000000-0000-0000-0000-000000000001','Kishor','6303596144',NULL,'male','180','97','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_177.jpg','2025-11-27','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-27','2025-11-27','2025-12-27','2025-11-27',1000.00,1000.00,1000.00,'2025-12-06 02:49:08.694554+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('b66110ea-aba3-41ec-b8bb-aba6948bece6','a0000000-0000-0000-0000-000000000001','Ramchndhran','8328667409',NULL,'male','170','82','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_182.jpg','2025-11-30','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-30','2025-11-30','2025-12-30','2025-11-30',1000.00,1000.00,1000.00,'2025-12-06 02:49:08.694554+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('758171f6-f900-486d-a2a9-88b50490a71a','a0000000-0000-0000-0000-000000000001','Nani','7287894197',NULL,'male','178','63','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_193.jpg','2025-11-10','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-10','2025-11-10','2025-12-10','2025-11-10',1000.00,1000.00,1000.00,'2025-12-06 02:49:08.694554+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('40572cf0-8c4d-48f1-98bc-87c461676458','a0000000-0000-0000-0000-000000000001','Kumaresh','9966420737',NULL,'male','170','84.3',NULL,'2025-11-16','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-16','2025-11-16','2025-12-16','2025-11-16',1000.00,1000.00,1000.00,'2025-12-06 02:49:08.694554+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('4f83c7f0-8e1a-4fd0-85c6-ff0fbf51c5c9','a0000000-0000-0000-0000-000000000001','Balu','6302529704',NULL,'male','185','80','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_172.jpg','2025-11-21','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-21','2025-11-21','2025-12-21','2025-11-21',1000.00,1000.00,1000.00,'2025-12-06 02:49:08.694554+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('a45fc993-b4b0-4178-9417-61513c97ef03','a0000000-0000-0000-0000-000000000001','Raju','9353690464',NULL,'male','180','66','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_192.jpg','2025-11-10','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-10','2025-11-10','2025-12-10','2025-11-10',1000.00,1000.00,1000.00,'2025-12-06 02:49:08.694554+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('63a9768d-65ef-4fb4-ae7f-81ed0bcbcfee','a0000000-0000-0000-0000-000000000001','Raju kumar','7893998699',NULL,'male','170','62','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_195.jpg','2025-11-10','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-10','2025-11-10','2025-12-10','2025-11-10',1000.00,1000.00,1000.00,'2025-12-06 02:49:08.694554+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('45497406-3801-4da4-9056-07006414edc7','a0000000-0000-0000-0000-000000000001','Anugrah','9895560346',NULL,'male','167','65',NULL,'2025-11-15','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-15','2025-11-15','2025-12-15','2025-11-15',1000.00,1000.00,1000.00,'2025-12-06 02:49:08.694554+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('9fd07b2f-4546-405e-8108-d0407af91162','a0000000-0000-0000-0000-000000000001','Toshith Sharma','9550838163',NULL,'male','170','92','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_160.jpg','2025-11-14','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-14','2025-11-14','2025-12-14','2025-11-14',1000.00,1000.00,1000.00,'2025-12-06 02:49:08.694554+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('fc50692f-7268-4868-b31d-81bd2daea89d','a0000000-0000-0000-0000-000000000001','Nihal','9618677416',NULL,'male','168','53','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_179.jpg','2025-11-28','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-28','2025-11-28','2025-12-28','2025-11-28',1000.00,1000.00,1000.00,'2025-12-06 02:49:08.694554+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('0763f6b9-0934-48f7-9b10-d987880b19a2','a0000000-0000-0000-0000-000000000001','Balaji','9989917699',NULL,'male','168','79','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_189.jpg','2025-11-10','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-10','2025-11-10','2025-12-10','2025-11-10',1000.00,1000.00,1000.00,'2025-12-06 02:49:08.694554+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('1ac30154-12b9-47d4-b405-f8cc21928050','a0000000-0000-0000-0000-000000000001','Naveen Prasad','9686725381',NULL,'male','184','80','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_173.jpg','2025-11-23','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-23','2025-11-23','2025-12-23','2025-11-23',1000.00,1000.00,1000.00,'2025-12-06 02:49:08.694554+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('17bd9659-a422-4534-82ec-56844a4f86c8','a0000000-0000-0000-0000-000000000001','Yugesh','7093154854',NULL,'male','180','58',NULL,'2025-11-15','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-15','2025-11-15','2025-12-15','2025-11-15',1000.00,1000.00,1000.00,'2025-12-06 02:49:08.694554+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('6c3fad4e-41ae-4989-a65b-ae992d58494b','a0000000-0000-0000-0000-000000000001','Sudhakar','7601060166',NULL,'male','165','69','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_187.jpg','2025-11-10','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-10','2025-11-10','2025-12-10','2025-11-10',1000.00,1000.00,1000.00,'2025-12-06 02:49:08.694554+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('d0e769b8-19c2-4164-85c9-020395b4e6d3','a0000000-0000-0000-0000-000000000001','Abishek','9052739661',NULL,'male','160','43','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_178.jpg','2025-11-28','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-28','2025-11-28','2025-12-28','2025-11-28',1000.00,1000.00,1000.00,'2025-12-06 02:49:08.694554+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('cf788db8-cdb3-4726-873c-5e2db2f413ed','a0000000-0000-0000-0000-000000000001','Murali','8095901082',NULL,'male','170','73','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_190.jpg','2025-11-10','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-10','2025-11-10','2025-12-10','2025-11-10',1000.00,1000.00,1000.00,'2025-12-06 02:49:08.694554+00') ON CONFLICT (id) DO NOTHING;

COMMIT;

-- =====================================================
-- VERIFICATION: Run after commit
-- =====================================================
-- SELECT COUNT(*) as members_part_ab FROM gym_members WHERE gym_id = 'a0000000-0000-0000-0000-000000000001';
-- Expected: 60 (after part A + B)
-- =====================================================
-- PRODUCTION MIGRATION - PART 2C: MEMBERS (61-90)
-- Target: dbtdarmxvgbxeinwcxka (Production)
-- Gym: Avengers Gym (a0000000-0000-0000-0000-000000000001)
-- Run AFTER prod_02_members_part_b.sql
-- =====================================================

BEGIN;

-- =====================================================
-- MEMBERS BATCH 3 (61-90 of 133)
-- =====================================================

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('a45fc993-b4b0-4178-9417-61513c97ef03','a0000000-0000-0000-0000-000000000001','Raju','9353690464',NULL,'male','180','66','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_192.jpg','2025-11-10','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-10','2025-11-10','2025-12-10','2025-11-10',1000.00,1000.00,1000.00,'2025-12-06 02:49:08.694554+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('a4a81230-2cd0-458d-b0fc-94a385aec9d3','a0000000-0000-0000-0000-000000000001','Jaya sai','9949637859',NULL,'male','173','70','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_185.jpg','2025-11-30','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-30','2025-11-30','2025-12-30','2025-11-30',1000.00,1000.00,1000.00,'2025-12-06 02:49:08.694554+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('a649e72e-390f-4e46-989e-bfba25662d32','a0000000-0000-0000-0000-000000000001','Mujahid','9014098638',NULL,'male','173','49','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_181.jpg','2025-11-29','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-29','2025-11-29','2025-12-29','2025-11-29',1000.00,1000.00,1000.00,'2025-12-06 02:49:08.694554+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('b66110ea-aba3-41ec-b8bb-aba6948bece6','a0000000-0000-0000-0000-000000000001','Ramchndhran','8328667409',NULL,'male','170','82','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_182.jpg','2025-11-30','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-30','2025-11-30','2025-12-30','2025-11-30',1000.00,1000.00,1000.00,'2025-12-06 02:49:08.694554+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('bf10b0f9-368a-4ac4-826a-7efd2a36dc13','a0000000-0000-0000-0000-000000000001','Aishvrya','7337410348',NULL,'male','160','66','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_188.jpg','2025-11-10','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-10','2025-11-10','2025-12-10','2025-11-10',1000.00,1000.00,1000.00,'2025-12-06 02:49:08.694554+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('cf788db8-cdb3-4726-873c-5e2db2f413ed','a0000000-0000-0000-0000-000000000001','Murali','8095901082',NULL,'male','170','73','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_190.jpg','2025-11-10','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-10','2025-11-10','2025-12-10','2025-11-10',1000.00,1000.00,1000.00,'2025-12-06 02:49:08.694554+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('d0e769b8-19c2-4164-85c9-020395b4e6d3','a0000000-0000-0000-0000-000000000001','Abishek','9052739661',NULL,'male','160','43','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_178.jpg','2025-11-28','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-28','2025-11-28','2025-12-28','2025-11-28',1000.00,1000.00,1000.00,'2025-12-06 02:49:08.694554+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('d5ac875b-afd7-43df-8908-23f81f79a2af','a0000000-0000-0000-0000-000000000001','Mohan ram','8096108952',NULL,'male','175','51','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_191.jpg','2025-11-10','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-10','2025-11-10','2025-12-10','2025-11-10',1000.00,1000.00,1000.00,'2025-12-06 02:49:08.694554+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('eec89812-9eac-4ea1-a459-eccb370cce57','a0000000-0000-0000-0000-000000000001','Kishor','6303596144',NULL,'male','180','97','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_177.jpg','2025-11-27','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-27','2025-11-27','2025-12-27','2025-11-27',1000.00,1000.00,1000.00,'2025-12-06 02:49:08.694554+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('f776d031-5156-46ea-940f-0a47a1e0de74','a0000000-0000-0000-0000-000000000001','Vedhamurthy','9686471480',NULL,'male','180','77','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_186.jpg','2025-11-10','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-10','2025-11-10','2025-12-10','2025-11-10',1000.00,1000.00,1000.00,'2025-12-06 02:49:08.694554+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('fc50692f-7268-4868-b31d-81bd2daea89d','a0000000-0000-0000-0000-000000000001','Nihal','9618677416',NULL,'male','168','53','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_179.jpg','2025-11-28','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-28','2025-11-28','2025-12-28','2025-11-28',1000.00,1000.00,1000.00,'2025-12-06 02:49:08.694554+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('160e2140-27a1-40a6-bf83-7ce4a8b754a4','a0000000-0000-0000-0000-000000000001','Harish','8639606461',NULL,'male','180','83','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_213.jpg','2025-11-18','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-18','2025-11-18','2025-12-18','2025-11-18',1000.00,1000.00,1000.00,'2025-12-06 02:50:01.069837+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('21784db3-680d-454b-a88f-0e29debcdf58','a0000000-0000-0000-0000-000000000001','Suresh','9392780764',NULL,'male','178','81','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_218.jpg','2025-11-19','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-19','2025-11-19','2025-12-19','2025-11-19',1000.00,1000.00,1000.00,'2025-12-06 02:50:01.069837+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('36bfb307-b474-4698-9322-5ce9f3c01760','a0000000-0000-0000-0000-000000000001','Dinesh','6303725800',NULL,'male','167','86','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_217.jpg','2025-11-10','quarterly',2500.00,'active','b0000000-0000-0000-0000-000000000002','2026-02-10','2025-11-10','2026-02-10','2025-11-10',2500.00,2500.00,2500.00,'2025-12-06 02:50:01.069837+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('3929c060-30c6-43d5-8c04-f4d62a18fb06','a0000000-0000-0000-0000-000000000001','Ravi','6303430930',NULL,'male','168','60','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_224.jpg','2025-11-24','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-24','2025-11-24','2025-12-24','2025-11-24',1000.00,1000.00,1000.00,'2025-12-06 02:50:01.069837+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('3ee0b080-42a7-468f-979c-5a04c6da0825','a0000000-0000-0000-0000-000000000001','Uma Shanker','7032206748',NULL,'male','178','75','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_206.jpg','2025-11-15','quarterly',2500.00,'active','b0000000-0000-0000-0000-000000000002','2026-02-15','2025-11-15','2026-02-15','2025-11-15',2500.00,2500.00,2500.00,'2025-12-06 02:50:01.069837+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('3f2ab6d5-f272-4ed9-9bfb-6fe9602b1eb2','a0000000-0000-0000-0000-000000000001','Ganesh','9494255131',NULL,'male','166','79','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_211.jpg','2025-11-18','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-18','2025-11-18','2025-12-18','2025-11-18',1000.00,1000.00,1000.00,'2025-12-06 02:50:01.069837+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('481d6067-aa69-4ece-ae03-0eeb0984b7a3','a0000000-0000-0000-0000-000000000001','Karthik','9182881599',NULL,'male','160','60','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_148.jpg','2025-11-10','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-10','2025-11-10','2025-12-10','2025-11-10',1000.00,1000.00,1000.00,'2025-12-06 02:50:01.069837+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('6a526263-0750-4c06-8b2c-09c1476da7cd','a0000000-0000-0000-0000-000000000001','Sudarshan','8466021755',NULL,'male','178','95','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_203.jpg','2025-11-10','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-10','2025-11-10','2025-12-10','2025-11-10',1000.00,1000.00,1000.00,'2025-12-06 02:50:01.069837+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('6a9f8d1d-f7b1-48c1-9b2c-77b29c1ece7b','a0000000-0000-0000-0000-000000000001','Sai kiran','7993677330',NULL,'male','175','74','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_221.jpg','2025-11-24','half_yearly',4500.00,'active','b0000000-0000-0000-0000-000000000003','2026-05-24','2025-11-24','2026-05-24','2025-11-24',4500.00,4500.00,4500.00,'2025-12-06 02:50:01.069837+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('79371002-0758-49b9-b450-7c7dc8ff3cef','a0000000-0000-0000-0000-000000000001','Raju','8096180944',NULL,'male','175','70','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_212.jpg','2025-11-18','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-18','2025-11-18','2025-12-18','2025-11-18',1000.00,1000.00,1000.00,'2025-12-06 02:50:01.069837+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('7acaf4a2-9787-4da9-af85-6fe7967107f6','a0000000-0000-0000-0000-000000000001','Charan','8008039927',NULL,'male','175','75','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_197.jpg','2025-11-10','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-10','2025-11-10','2025-12-10','2025-11-10',1000.00,1000.00,1000.00,'2025-12-06 02:50:01.069837+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('7d226b35-71e1-4858-bbda-bcaa17831f60','a0000000-0000-0000-0000-000000000001','Suresh','8179189264',NULL,'male','175','55','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_199.jpg','2025-11-11','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-11','2025-11-11','2025-12-11','2025-11-11',1000.00,1000.00,1000.00,'2025-12-06 02:50:01.069837+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('a0cfe850-6d8a-4f4a-aae4-823e82787179','a0000000-0000-0000-0000-000000000001','Raja shekar','9391518719',NULL,'male','165','84','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_128.jpg','2025-11-20','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-20','2025-11-20','2025-12-20','2025-11-20',1000.00,1000.00,1000.00,'2025-12-06 02:50:01.069837+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('a923d20d-322d-4093-8b68-758c951e929b','a0000000-0000-0000-0000-000000000001','Sudheer','9346643292',NULL,'male','183','73','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_223.jpg','2025-11-24','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-24','2025-11-24','2025-12-24','2025-11-24',1000.00,1000.00,1000.00,'2025-12-06 02:50:01.069837+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('abb3342d-e3eb-4f59-b5ce-cc0c64525f79','a0000000-0000-0000-0000-000000000001','Harish','9177697468',NULL,'male','173','77','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_215.jpg','2025-11-18','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-18','2025-11-18','2025-12-18','2025-11-18',1000.00,1000.00,1000.00,'2025-12-06 02:50:01.069837+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('b56f780c-d2ca-47ac-a1d6-9c7ab254b421','a0000000-0000-0000-0000-000000000001','Ranjith Kumar','7702658419',NULL,'male','173','67','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_208.jpg','2025-11-17','quarterly',2500.00,'active','b0000000-0000-0000-0000-000000000002','2026-02-17','2025-11-17','2026-02-17','2025-11-17',2500.00,2500.00,2500.00,'2025-12-06 02:50:01.069837+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('b900fc2b-6db4-46f0-bd4e-a63854e40286','a0000000-0000-0000-0000-000000000001','Karan','7995622646',NULL,'male','180','95','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_205.jpg','2025-11-10','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-10','2025-11-10','2025-12-10','2025-11-10',1000.00,1000.00,1000.00,'2025-12-06 02:50:01.069837+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('b9e0b504-8a40-4f5d-b702-cb99a5824362','a0000000-0000-0000-0000-000000000001','Vijay Kumar','9742458990',NULL,'male','175','84','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_207.jpg','2025-11-17','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-17','2025-11-17','2025-12-17','2025-11-17',1000.00,1000.00,1000.00,'2025-12-06 02:50:01.069837+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('c3c26657-a915-4444-aa49-6da705578f10','a0000000-0000-0000-0000-000000000001','Srinivas Dr','8309577055',NULL,'male','164','72','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_210.jpg','2025-11-04','quarterly',2500.00,'active','b0000000-0000-0000-0000-000000000002','2026-02-04','2025-11-04','2026-02-04','2025-11-04',2500.00,2500.00,2500.00,'2025-12-06 02:50:01.069837+00') ON CONFLICT (id) DO NOTHING;

COMMIT;

-- =====================================================
-- VERIFICATION: Run after commit
-- =====================================================
-- SELECT COUNT(*) as members_part_abc FROM gym_members WHERE gym_id = 'a0000000-0000-0000-0000-000000000001';
-- Expected: 90 (after part A + B + C)
-- =====================================================
-- PRODUCTION MIGRATION - PART 2D: MEMBERS (91-120)
-- Target: dbtdarmxvgbxeinwcxka (Production)
-- Gym: Avengers Gym (a0000000-0000-0000-0000-000000000001)
-- Run AFTER prod_02_members_part_c.sql
-- =====================================================

BEGIN;

-- =====================================================
-- MEMBERS BATCH 4 (91-120 of 133)
-- =====================================================

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('c492ddef-f567-4ae7-85d4-cc60a98cf319','a0000000-0000-0000-0000-000000000001','Sundar sir','8341940261',NULL,'male','178','83','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_214.jpg','2025-11-18','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-18','2025-11-18','2025-12-18','2025-11-18',1000.00,1000.00,1000.00,'2025-12-06 02:50:01.069837+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('c651ae3c-776b-4863-8012-62d244ae9944','a0000000-0000-0000-0000-000000000001','Dhanush','9059500286',NULL,'male','170','49','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_209.jpg','2025-11-17','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-17','2025-11-17','2025-12-17','2025-11-17',1000.00,1000.00,1000.00,'2025-12-06 02:50:01.069837+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('d035dc35-dfe7-42fc-9107-aa9d2a5e7a94','a0000000-0000-0000-0000-000000000001','Arvind','9666438057',NULL,'male','170','64','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_204.jpg','2025-11-14','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-14','2025-11-14','2025-12-14','2025-11-14',1000.00,1000.00,1000.00,'2025-12-06 02:50:01.069837+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('d05e4cfc-cfc0-46a7-8aeb-e93e9806ccc4','a0000000-0000-0000-0000-000000000001','Sandeep','9666077614',NULL,'male','176','91','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_202.jpg','2025-11-10','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-10','2025-11-10','2025-12-10','2025-11-10',1000.00,1000.00,1000.00,'2025-12-06 02:50:01.069837+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('d21e00c9-994d-4e77-b57f-9ceb4220e31e','a0000000-0000-0000-0000-000000000001','Naveen','8639673746',NULL,'male','175','56.6','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_225.jpg','2025-11-24','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-24','2025-11-24','2025-12-24','2025-11-24',1000.00,1000.00,1000.00,'2025-12-06 02:50:01.069837+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('d3ebebf2-37a5-4b73-8ddb-26756c5620e6','a0000000-0000-0000-0000-000000000001','Venkat sai','9441076636',NULL,'male','174','60','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_222.jpg','2025-11-24','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-24','2025-11-24','2025-12-24','2025-11-24',1000.00,1000.00,1000.00,'2025-12-06 02:50:01.069837+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('d6dccf9a-d184-4e6a-b558-201ff62cbebc','a0000000-0000-0000-0000-000000000001','Arun','9652985944',NULL,'male','172','69','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_219.jpg','2025-11-20','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-20','2025-11-20','2025-12-20','2025-11-20',1000.00,1000.00,1000.00,'2025-12-06 02:50:01.069837+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('d87ddc4d-845a-452c-8fd0-ba920d49bb30','a0000000-0000-0000-0000-000000000001','Harish','9573520171',NULL,'male','185','76','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_198.jpg','2025-11-11','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-11','2025-11-11','2025-12-11','2025-11-11',1000.00,1000.00,1000.00,'2025-12-06 02:50:01.069837+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('f4003e17-2f03-44a4-8d71-18505f1a5772','a0000000-0000-0000-0000-000000000001','Muzamin','6300884956',NULL,'male','173','75','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_200.jpg','2025-11-13','quarterly',2500.00,'active','b0000000-0000-0000-0000-000000000002','2026-02-13','2025-11-13','2026-02-13','2025-11-13',2500.00,2500.00,2500.00,'2025-12-06 02:50:01.069837+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('f704ee1b-d8c0-4746-8b29-d72e73a0b156','a0000000-0000-0000-0000-000000000001','Sai Kumar','9110390248',NULL,'male','165','67','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_201.jpg','2025-11-13','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-13','2025-11-13','2025-12-13','2025-11-13',1000.00,1000.00,1000.00,'2025-12-06 02:50:01.069837+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('fa76ac57-df5e-441a-8514-9f1808e93a48','a0000000-0000-0000-0000-000000000001','Suman','8897856630',NULL,'male','165','74','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_216.jpg','2025-11-18','monthly',1000.00,'active','b0000000-0000-0000-0000-000000000001','2025-12-18','2025-11-18','2025-12-18','2025-11-18',1000.00,1000.00,1000.00,'2025-12-06 02:50:01.069837+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('10abd6b8-fcd1-41d3-b546-3682eef500f6','a0000000-0000-0000-0000-000000000001','Adhithya','7396779275',NULL,'male',NULL,'82','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_145.jpg','2025-11-06','monthly',1000.00,'active',NULL,'2025-12-06','2025-11-06','2025-12-06','2025-11-06',NULL,0.00,0.00,'2025-12-06 05:02:59.718149+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('16a194eb-3666-481b-8983-96799700a7e5','a0000000-0000-0000-0000-000000000001','Vijay','9182474746',NULL,'male','166','64','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_150.jpg','2025-11-06','monthly',1000.00,'active',NULL,'2025-12-06','2025-11-06','2025-12-06','2025-11-06',NULL,0.00,0.00,'2025-12-06 05:02:59.718149+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('402dfad3-3930-4099-864e-5741c88a50b9','a0000000-0000-0000-0000-000000000001','Balakrishna','9177176142',NULL,'male','170','78','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_146.jpg','2025-11-01','quarterly',2500.00,'active',NULL,'2026-02-01','2025-11-01','2026-02-01','2025-11-01',NULL,0.00,0.00,'2025-12-06 05:02:59.718149+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('581e610c-49b1-4f31-a078-ebf342c1f6cd','a0000000-0000-0000-0000-000000000001','Varun tej','8500255904',NULL,'male',NULL,'55','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_156.jpg','2025-11-02','quarterly',2500.00,'active',NULL,'2026-02-02','2025-11-02','2026-02-02','2025-11-02',NULL,0.00,0.00,'2025-12-06 05:02:59.718149+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('6aefd3e2-00c9-4397-916f-15019e992535','a0000000-0000-0000-0000-000000000001','Bhaskar','8919599798',NULL,'male','175','66','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_149.jpg','2025-11-07','monthly',1000.00,'active',NULL,'2025-12-07','2025-11-07','2025-12-07','2025-11-07',NULL,0.00,0.00,'2025-12-06 05:02:59.718149+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('a68078f6-97ae-4a76-9fff-46fe4159c82f','a0000000-0000-0000-0000-000000000001','Pavan','8497970550',NULL,'male','170','86','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_228.jpg','2025-11-29','quarterly',2500.00,'active',NULL,'2026-02-28','2025-11-29','2026-02-28','2025-11-29',NULL,0.00,0.00,'2025-12-06 05:02:59.718149+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('ab59495d-e837-47f9-8dbe-80011983425e','a0000000-0000-0000-0000-000000000001','Akil','8317568785',NULL,'male','185','97.5','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_143.jpg','2025-11-06','monthly',1000.00,'active',NULL,'2025-12-06','2025-11-06','2025-12-06','2025-11-06',NULL,0.00,0.00,'2025-12-06 05:02:59.718149+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('ce05d862-5b0a-467b-bb13-783808c9b330','a0000000-0000-0000-0000-000000000001','Hemanth','7386875727',NULL,'male','176','73','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_147.jpg','2025-11-07','monthly',1000.00,'active',NULL,'2025-12-07','2025-11-07','2025-12-07','2025-11-07',NULL,0.00,0.00,'2025-12-06 05:02:59.718149+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('d83cdeb4-5ba4-4748-a1b6-c6c4bb384b0f','a0000000-0000-0000-0000-000000000001','Sherli','9100795822',NULL,'female','170','72','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_153.jpg','2025-11-09','quarterly',2500.00,'active',NULL,'2026-02-09','2025-11-09','2026-02-09','2025-11-09',NULL,0.00,0.00,'2025-12-06 05:02:59.718149+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('d950702c-8933-4584-bbb7-90d28b6253fd','a0000000-0000-0000-0000-000000000001','Karthik','9989416858',NULL,'male','178','93','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_148.jpg','2025-11-10','monthly',1000.00,'active',NULL,'2025-12-10','2025-11-10','2025-12-10','2025-11-10',NULL,0.00,0.00,'2025-12-06 05:02:59.718149+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('01981326-0a05-4054-8db6-91c601ba2c27','a0000000-0000-0000-0000-000000000001','Jayaram','9951691557',NULL,'male','177','75','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_120.jpg','2025-11-22','monthly',1000.00,'inactive',NULL,'2025-12-22','2025-11-22','2025-12-22','2025-11-22',NULL,0.00,0.00,'2025-12-06 05:03:14.964111+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('2944748c-5db6-43e0-a77d-1abffb28e497','a0000000-0000-0000-0000-000000000001','Yogesh','7416540151',NULL,'male','178','83','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_135.jpg','2025-11-05','monthly',1000.00,'active',NULL,'2025-12-05','2025-11-05','2025-12-05','2025-11-05',NULL,0.00,0.00,'2025-12-06 05:03:14.964111+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('60d65998-6af7-4590-92b9-8735f7a764e0','a0000000-0000-0000-0000-000000000001','Bhargavi','6362614028',NULL,'female','168','53','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_126.jpg','2025-11-23','monthly',1000.00,'active',NULL,'2025-12-23','2025-11-23','2025-12-23','2025-11-23',NULL,0.00,0.00,'2025-12-06 05:03:14.964111+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('6c4ac87c-8798-4459-ae41-bda1c576008e','a0000000-0000-0000-0000-000000000001','Yogesh','8885012147',NULL,'male','180','81','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_119.jpg','2025-11-22','monthly',1000.00,'active',NULL,'2025-12-22','2025-11-22','2025-12-22','2025-11-22',NULL,0.00,0.00,'2025-12-06 05:03:14.964111+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('7acc1322-61f0-4dde-bc2c-6c622ad2c1e2','a0000000-0000-0000-0000-000000000001','Rajesh','7624883323',NULL,'male','178','72','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_121.jpg','2025-11-22','quarterly',2500.00,'active',NULL,'2026-02-22','2025-11-22','2026-02-22','2025-11-22',NULL,0.00,0.00,'2025-12-06 05:03:14.964111+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('7b8be07c-b185-4f08-8adf-c9733f4fedab','a0000000-0000-0000-0000-000000000001','Sathish','9100676582',NULL,'male','170','70','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_125.jpg','2025-11-23','monthly',1000.00,'active',NULL,'2025-12-23','2025-11-23','2025-12-23','2025-11-23',NULL,0.00,0.00,'2025-12-06 05:03:14.964111+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('98f46343-4736-4d37-995f-e570ba9453dc','a0000000-0000-0000-0000-000000000001','Madhan','9182793938',NULL,'male',NULL,'70','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_132.jpg','2025-11-10','quarterly',2500.00,'active',NULL,'2026-02-10','2025-11-10','2026-02-10','2025-11-10',NULL,0.00,0.00,'2025-12-06 05:03:14.964111+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('bdf2133a-b786-4fb7-97f0-f9dee44e238e','a0000000-0000-0000-0000-000000000001','Raja shekar','8790791532',NULL,'male','165','61','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_128.jpg','2025-11-23','monthly',1000.00,'active',NULL,'2025-12-23','2025-11-23','2025-12-23','2025-11-23',NULL,0.00,0.00,'2025-12-06 05:03:14.964111+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('c116c01c-11b5-4473-9a68-af2af98b7203','a0000000-0000-0000-0000-000000000001','Jaya Krishna','9380533896',NULL,'male','160','51','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_127.jpg','2025-11-23','monthly',1000.00,'active',NULL,'2025-12-23','2025-11-23','2025-12-23','2025-11-23',NULL,0.00,0.00,'2025-12-06 05:03:14.964111+00') ON CONFLICT (id) DO NOTHING;

COMMIT;

-- =====================================================
-- VERIFICATION: Run after commit
-- =====================================================
-- SELECT COUNT(*) as members_part_abcd FROM gym_members WHERE gym_id = 'a0000000-0000-0000-0000-000000000001';
-- Expected: 120 (after part A + B + C + D)
-- =====================================================
-- PRODUCTION MIGRATION - PART 2E: MEMBERS (121-133)
-- Target: dbtdarmxvgbxeinwcxka (Production)
-- Gym: Avengers Gym (a0000000-0000-0000-0000-000000000001)
-- Run AFTER prod_02_members_part_d.sql
-- FINAL BATCH - 13 members
-- =====================================================

BEGIN;

-- =====================================================
-- MEMBERS BATCH 5 (121-133 of 133) - FINAL
-- =====================================================

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('c901cf76-0a03-42a3-9737-a016beac96e6','a0000000-0000-0000-0000-000000000001','Jeevan','9110306412',NULL,'male',NULL,'90','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_130.jpg','2025-11-26','monthly',1000.00,'active',NULL,'2025-12-26','2025-11-26','2025-12-26','2025-11-26',NULL,0.00,0.00,'2025-12-06 05:03:14.964111+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('04a20b6e-aba4-47d3-806d-0c964a9a40bf','a0000000-0000-0000-0000-000000000001','Krishna','9347091181',NULL,'male','172','48','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_226.jpg','2025-11-26','monthly',1000.00,'active',NULL,'2025-12-26','2025-11-26','2025-12-26','2025-11-26',NULL,0.00,0.00,'2025-12-06 05:03:30.168618+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('12b6aa06-18df-4e9f-ae48-aff67ed38cbd','a0000000-0000-0000-0000-000000000001','Dilly raj','9550000648',NULL,'male','179','72','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_138.jpg','2025-11-30','quarterly',2500.00,'active',NULL,'2026-02-28','2025-11-30','2026-02-28','2025-11-30',NULL,0.00,0.00,'2025-12-06 05:03:30.168618+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('2ffa9d77-4603-478f-8612-7c5b35b75827','a0000000-0000-0000-0000-000000000001','Punith','9666096365',NULL,'male',NULL,'82','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_142.jpg','2025-11-04','monthly',1000.00,'active',NULL,'2025-12-04','2025-11-04','2025-12-04','2025-11-04',NULL,0.00,0.00,'2025-12-06 05:03:30.168618+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('53307991-a7bb-4806-891f-1937e4e6b441','a0000000-0000-0000-0000-000000000001','Bala subramnyam','8150864627',NULL,'male','175','86','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_137.jpg','2025-11-29','quarterly',2500.00,'active',NULL,'2026-02-28','2025-11-29','2026-02-28','2025-11-29',NULL,0.00,0.00,'2025-12-06 05:03:30.168618+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('7dc3b068-9621-445b-bdcf-6ac4c6d786e0','a0000000-0000-0000-0000-000000000001','Yasin','6281838820',NULL,'male',NULL,'51','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_116.jpg','2025-11-19','monthly',1000.00,'active',NULL,'2025-12-19','2025-11-19','2025-12-19','2025-11-19',NULL,0.00,0.00,'2025-12-06 05:03:30.168618+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('8281f47b-95d5-4c1c-a987-e60801323ed6','a0000000-0000-0000-0000-000000000001','Tharun','9515111084',NULL,'male','175','55.6','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_117.jpg','2025-11-24','quarterly',2500.00,'active',NULL,'2026-02-24','2025-11-24','2026-02-24','2025-11-24',NULL,0.00,0.00,'2025-12-06 05:03:30.168618+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('840d4f11-4ddd-4aa8-92bb-44f51a7044ae','a0000000-0000-0000-0000-000000000001','Br pavan','9573512931',NULL,'male','175','78','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_140.jpg','2025-11-01','quarterly',2500.00,'active',NULL,'2026-02-01','2025-11-01','2026-02-01','2025-11-01',NULL,0.00,0.00,'2025-12-06 05:03:30.168618+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('a4981016-537b-4e86-866a-ad5927566ad9','a0000000-0000-0000-0000-000000000001','Javith','7893606736',NULL,'male','177','65','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_122.jpg','2025-11-22','monthly',1000.00,'active',NULL,'2025-12-22','2025-11-22','2025-12-22','2025-11-22',NULL,0.00,0.00,'2025-12-06 05:03:30.168618+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('b04e8104-e14b-426b-a8b8-dfeba662071d','a0000000-0000-0000-0000-000000000001','Shiva','6304057475',NULL,'male','173','67','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_227.jpg','2025-11-27','monthly',1000.00,'active',NULL,'2025-12-27','2025-11-27','2025-12-27','2025-11-27',NULL,0.00,0.00,'2025-12-06 05:03:30.168618+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('c5c5403c-9941-4f23-b044-e3c723e87f08','a0000000-0000-0000-0000-000000000001','Panidra','9703999966',NULL,'male','185','91','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_144.jpg','2025-11-01','quarterly',2500.00,'active',NULL,'2026-02-01','2025-11-01','2026-02-01','2025-11-01',NULL,0.00,0.00,'2025-12-06 05:03:30.168618+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('fff4b16c-56d9-4d54-8843-196b88bbebdf','a0000000-0000-0000-0000-000000000001','Sheshadri','9000909283',NULL,'male','180','72','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/gyms/avengers-gym/members/sp_118.jpg','2025-11-15','quarterly',2500.00,'active',NULL,'2026-02-15','2025-11-15','2026-02-15','2025-11-15',NULL,0.00,0.00,'2025-12-06 05:03:30.168618+00') ON CONFLICT (id) DO NOTHING;

-- Note: Sheik has a different photo path (uploaded separately)
INSERT INTO gym_members (id,gym_id,full_name,phone,email,gender,height,weight,photo_url,joining_date,membership_plan,plan_amount,status,plan_id,membership_end_date,membership_start_date,next_payment_due_date,last_payment_date,last_payment_amount,total_payments_received,lifetime_value,created_at) VALUES ('8b794813-758b-4ae8-a7d7-a5b8afe0f3e7','a0000000-0000-0000-0000-000000000001','Sheik','9000933347','','male','170','68','https://dbtdarmxvgbxeinwcxka.supabase.co/storage/v1/object/public/images/members/a0000000-0000-0000-0000-000000000001/1765008423229-7lrs9i.jpg','2025-11-06','monthly',1000.00,'inactive',NULL,'2025-12-06','2025-11-06','2025-12-06','2025-11-06',1000.00,1000.00,1000.00,'2025-12-06 08:02:11.565333+00') ON CONFLICT (id) DO NOTHING;

COMMIT;

-- =====================================================
-- FINAL VERIFICATION: Run after all member files
-- =====================================================
-- SELECT COUNT(*) as total_members FROM gym_members WHERE gym_id = 'a0000000-0000-0000-0000-000000000001';
-- Expected: 133 members total
-- 
-- Execution Order:
-- 1. prod_01_gym_user_plans.sql
-- 2. prod_02_members_part_a.sql (1-30)
-- 3. prod_02_members_part_b.sql (31-60)
-- 4. prod_02_members_part_c.sql (61-90)
-- 5. prod_02_members_part_d.sql (91-120)
-- 6. prod_02_members_part_e.sql (121-133) << THIS FILE
-- 7. prod_03_payments.sql (next)
-- 8. prod_04_payment_schedule.sql (final)
-- =====================================================
-- PRODUCTION MIGRATION - PART 3A: PAYMENTS (1-50)
-- Target: dbtdarmxvgbxeinwcxka (Production)
-- Gym: Avengers Gym (a0000000-0000-0000-0000-000000000001)
-- Run AFTER prod_02_members_part_e.sql
-- =====================================================

BEGIN;

-- =====================================================
-- PAYMENTS BATCH 1 (1-50 of 102)
-- =====================================================

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('a6335ba9-cb92-40d8-93b7-097643db7926','a0000000-0000-0000-0000-000000000001','3abd8568-d40c-4a7f-b824-04663d673444',2500.00,'2025-11-15','cash','2025-11-15',0,'RCP-2025-00016','Initial membership payment - quarterly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('74dc40c2-9e2e-456c-b1c5-f6e8380cfb17','a0000000-0000-0000-0000-000000000001','ea01652d-b37d-4583-bbd6-c4bb6e128ed9',2500.00,'2025-11-17','cash','2025-11-17',0,'RCP-2025-00017','Initial membership payment - quarterly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('c47dd465-9f14-468d-bdb1-63189651f46a','a0000000-0000-0000-0000-000000000001','455c913a-18f9-44a4-992a-eb9fb11b7967',1000.00,'2025-11-08','cash','2025-11-08',0,'RCP-2025-00018','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('24210070-0c1c-424b-8e9e-3b10a8f698c9','a0000000-0000-0000-0000-000000000001','dac40a42-63a9-4732-b865-ac5cad82f364',2500.00,'2025-11-15','cash','2025-11-15',0,'RCP-2025-00019','Initial membership payment - quarterly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('94ffdc4b-e18d-4a9a-a4f6-a77b75056a7a','a0000000-0000-0000-0000-000000000001','fc8382fd-c856-431c-b5ae-810b09dfebd5',2500.00,'2025-11-18','cash','2025-11-18',0,'RCP-2025-00021','Initial membership payment - quarterly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('134bf540-6a53-4616-88aa-814170731d43','a0000000-0000-0000-0000-000000000001','9f9a5e36-76f5-422f-8355-fe46882215f5',2500.00,'2025-11-10','cash','2025-11-10',0,'RCP-2025-00022','Initial membership payment - quarterly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('cc22b5b6-5e3c-495b-8ff0-3abc43277977','a0000000-0000-0000-0000-000000000001','252817e6-86f8-404c-9e6f-e402833da2a3',2500.00,'2025-11-10','cash','2025-11-10',0,'RCP-2025-00023','Initial membership payment - quarterly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('9c9d8254-c2ba-4ffb-9d19-6afceaa82a0f','a0000000-0000-0000-0000-000000000001','a2b00ea5-f4e6-4fd2-8aa7-1f3dc74de694',2500.00,'2025-11-19','cash','2025-11-19',0,'RCP-2025-00024','Initial membership payment - quarterly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('63ac8df6-d957-4ddb-8e91-b33d499a375d','a0000000-0000-0000-0000-000000000001','481d6067-aa69-4ece-ae03-0eeb0984b7a3',1000.00,'2025-11-10','cash','2025-11-10',0,'RCP-2025-00043','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('cb212fb9-43a6-4e9b-af26-b7f78d15534e','a0000000-0000-0000-0000-000000000001','7acaf4a2-9787-4da9-af85-6fe7967107f6',1000.00,'2025-11-10','cash','2025-11-10',0,'RCP-2025-00044','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('45fc3fed-f1e2-4d9c-b72e-8f61b8105ee4','a0000000-0000-0000-0000-000000000001','d87ddc4d-845a-452c-8fd0-ba920d49bb30',1000.00,'2025-11-11','cash','2025-11-11',0,'RCP-2025-00045','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('271caaf1-af0e-4546-9492-3dff614ced25','a0000000-0000-0000-0000-000000000001','555e3020-9332-4e9a-848c-deb139568baf',2500.00,'2025-11-11','cash','2025-11-11',0,'RCP-2025-00046','Initial membership payment - quarterly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('647ca077-9a3d-4c41-8a4a-43003935ff63','a0000000-0000-0000-0000-000000000001','9fd07b2f-4546-405e-8108-d0407af91162',1000.00,'2025-11-14','cash','2025-11-14',0,'RCP-2025-00047','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('abc37482-44d7-442a-b82d-2a912c5a8acc','a0000000-0000-0000-0000-000000000001','82074fbf-7c0e-4c61-9501-203cc290ff0a',2500.00,'2025-11-15','cash','2025-11-15',0,'RCP-2025-00048','Initial membership payment - quarterly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('e4f70c66-db92-4049-9ee4-3dfbe146e19c','a0000000-0000-0000-0000-000000000001','68930bee-5284-4448-bcc0-96800e4df6c8',2500.00,'2025-11-15','cash','2025-11-15',0,'RCP-2025-00049','Initial membership payment - quarterly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('27105345-f8b5-451d-a345-201acf9f16fb','a0000000-0000-0000-0000-000000000001','45497406-3801-4da4-9056-07006414edc7',1000.00,'2025-11-15','cash','2025-11-15',0,'RCP-2025-00050','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('03bd9da4-80b0-4456-a9c5-ba01cdf1798e','a0000000-0000-0000-0000-000000000001','40572cf0-8c4d-48f1-98bc-87c461676458',1000.00,'2025-11-16','cash','2025-11-16',0,'RCP-2025-00051','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('bb1d4415-9544-4c99-a400-4d6e942c96d3','a0000000-0000-0000-0000-000000000001','17bd9659-a422-4534-82ec-56844a4f86c8',1000.00,'2025-11-15','cash','2025-11-15',0,'RCP-2025-00052','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('c1970178-98ec-4d13-9f47-23dc88d3e8be','a0000000-0000-0000-0000-000000000001','4f83c7f0-8e1a-4fd0-85c6-ff0fbf51c5c9',1000.00,'2025-11-21','cash','2025-11-21',0,'RCP-2025-00053','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('db12eff0-4398-46a0-8424-9122c686b4e9','a0000000-0000-0000-0000-000000000001','1ac30154-12b9-47d4-b405-f8cc21928050',1000.00,'2025-11-23','cash','2025-11-23',0,'RCP-2025-00054','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('3d4aaf8d-fd92-438b-8aa6-0bc5299444e5','a0000000-0000-0000-0000-000000000001','709775e7-2921-4525-8a13-02115a67a427',1000.00,'2025-11-27','cash','2025-11-27',0,'RCP-2025-00055','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('90433e10-2651-42f8-a96c-07af2b0db036','a0000000-0000-0000-0000-000000000001','7e5e61a2-c102-4252-8440-be5b0b5065e2',1000.00,'2025-11-27','cash','2025-11-27',0,'RCP-2025-00056','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('782660f0-681a-484b-be69-6e14f5bf98cb','a0000000-0000-0000-0000-000000000001','eec89812-9eac-4ea1-a459-eccb370cce57',1000.00,'2025-11-27','cash','2025-11-27',0,'RCP-2025-00057','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('a6281b47-e192-4d1b-a94f-bdd6ebf478d7','a0000000-0000-0000-0000-000000000001','d0e769b8-19c2-4164-85c9-020395b4e6d3',1000.00,'2025-11-28','cash','2025-11-28',0,'RCP-2025-00058','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('ee11bc0a-6949-4cbe-ad10-8a99fbc193d4','a0000000-0000-0000-0000-000000000001','fc50692f-7268-4868-b31d-81bd2daea89d',1000.00,'2025-11-28','cash','2025-11-28',0,'RCP-2025-00059','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('cdc87559-fc4c-4854-8bef-664df1bc3afd','a0000000-0000-0000-0000-000000000001','09f65437-e3b2-4dc8-9941-98a6b317e34d',1000.00,'2025-11-28','cash','2025-11-28',0,'RCP-2025-00060','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('2cb8eb64-5c55-4a3b-b3ba-98616388dcb8','a0000000-0000-0000-0000-000000000001','a649e72e-390f-4e46-989e-bfba25662d32',1000.00,'2025-11-29','cash','2025-11-29',0,'RCP-2025-00061','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('63fe9a97-d6f4-41df-96a9-2d5a4ffe6fec','a0000000-0000-0000-0000-000000000001','b66110ea-aba3-41ec-b8bb-aba6948bece6',1000.00,'2025-11-30','cash','2025-11-30',0,'RCP-2025-00062','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('06670148-99f4-4f34-9f9c-e678ad457c17','a0000000-0000-0000-0000-000000000001','3b7b0d6b-0c11-4b2c-9b97-87e8694531a9',1000.00,'2025-11-30','cash','2025-11-30',0,'RCP-2025-00063','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('31971e42-030b-43f2-bf0c-14c71f3bc8b8','a0000000-0000-0000-0000-000000000001','82b3d295-0a67-4e30-a0ea-5b6548469960',1000.00,'2025-11-30','cash','2025-11-30',0,'RCP-2025-00064','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('11770754-66bf-4380-a21f-7257a758457b','a0000000-0000-0000-0000-000000000001','a4a81230-2cd0-458d-b0fc-94a385aec9d3',1000.00,'2025-11-30','cash','2025-11-30',0,'RCP-2025-00065','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('74c198f2-c136-4f19-8f21-5bf385934d10','a0000000-0000-0000-0000-000000000001','f776d031-5156-46ea-940f-0a47a1e0de74',1000.00,'2025-11-10','cash','2025-11-10',0,'RCP-2025-00066','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('486615a7-1b73-4bcc-b5ba-f8593c863f22','a0000000-0000-0000-0000-000000000001','6c3fad4e-41ae-4989-a65b-ae992d58494b',1000.00,'2025-11-10','cash','2025-11-10',0,'RCP-2025-00067','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('168eda96-cf15-456d-b8b8-48f6ffaa49a8','a0000000-0000-0000-0000-000000000001','bf10b0f9-368a-4ac4-826a-7efd2a36dc13',1000.00,'2025-11-10','cash','2025-11-10',0,'RCP-2025-00068','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('6e42cc3a-3774-499b-a129-9a43922935d6','a0000000-0000-0000-0000-000000000001','2807b11f-1f90-4c54-9429-4f31bac466a4',1000.00,'2025-11-14','cash','2025-11-14',0,'RCP-2025-00015','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('5de12237-8a24-4c2d-aa77-cb7e22845771','a0000000-0000-0000-0000-000000000001','0763f6b9-0934-48f7-9b10-d987880b19a2',1000.00,'2025-11-10','cash','2025-11-10',0,'RCP-2025-00069','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('63366fc5-2134-4d98-ad90-b4a9845eae11','a0000000-0000-0000-0000-000000000001','cf788db8-cdb3-4726-873c-5e2db2f413ed',1000.00,'2025-11-10','cash','2025-11-10',0,'RCP-2025-00070','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('c887bf8f-4267-4703-9eb9-9f3a0d436717','a0000000-0000-0000-0000-000000000001','d5ac875b-afd7-43df-8908-23f81f79a2af',1000.00,'2025-11-10','cash','2025-11-10',0,'RCP-2025-00071','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('dcd1adc7-2c52-4d3a-b7eb-d15b6b0706d4','a0000000-0000-0000-0000-000000000001','a45fc993-b4b0-4178-9417-61513c97ef03',1000.00,'2025-11-10','cash','2025-11-10',0,'RCP-2025-00072','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('493daa17-095b-402e-bcd7-b03a7d7fa949','a0000000-0000-0000-0000-000000000001','758171f6-f900-486d-a2a9-88b50490a71a',1000.00,'2025-11-10','cash','2025-11-10',0,'RCP-2025-00073','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('660ba11b-448c-49ac-a358-5e8673983545','a0000000-0000-0000-0000-000000000001','26334a42-1654-4d2a-b0d4-e3d42768e5ac',2500.00,'2025-11-10','cash','2025-11-10',0,'RCP-2025-00074','Initial membership payment - quarterly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('6dcf7af0-d3c1-464a-b10b-4559d2084b9d','a0000000-0000-0000-0000-000000000001','63a9768d-65ef-4fb4-ae7f-81ed0bcbcfee',1000.00,'2025-11-10','cash','2025-11-10',0,'RCP-2025-00075','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('4c68f641-bbf0-4160-a386-ed95e31e2c74','a0000000-0000-0000-0000-000000000001','7d226b35-71e1-4858-bbda-bcaa17831f60',1000.00,'2025-11-11','cash','2025-11-11',0,'RCP-2025-00076','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('3a75e392-8d83-419b-9d5b-f383139869c6','a0000000-0000-0000-0000-000000000001','f4003e17-2f03-44a4-8d71-18505f1a5772',2500.00,'2025-11-13','cash','2025-11-13',0,'RCP-2025-00077','Initial membership payment - quarterly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('23f986e7-8612-4b76-84d4-5056b22c1e05','a0000000-0000-0000-0000-000000000001','f704ee1b-d8c0-4746-8b29-d72e73a0b156',1000.00,'2025-11-13','cash','2025-11-13',0,'RCP-2025-00078','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

COMMIT;
-- =====================================================
-- PRODUCTION MIGRATION - PART 3B: PAYMENTS (51-102)
-- Target: dbtdarmxvgbxeinwcxka (Production)
-- Gym: Avengers Gym (a0000000-0000-0000-0000-000000000001)
-- Run AFTER prod_03_payments_part_a.sql
-- =====================================================

BEGIN;

-- =====================================================
-- PAYMENTS BATCH 2 (51-102 of 102)
-- =====================================================

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('08356c82-1950-4d22-9b5f-3d393bad08f6','a0000000-0000-0000-0000-000000000001','d05e4cfc-cfc0-46a7-8aeb-e93e9806ccc4',1000.00,'2025-11-10','cash','2025-11-10',0,'RCP-2025-00079','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('375385da-fb81-4eb6-abdb-1c6b60f3817d','a0000000-0000-0000-0000-000000000001','6a526263-0750-4c06-8b2c-09c1476da7cd',1000.00,'2025-11-10','cash','2025-11-10',0,'RCP-2025-00080','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('c64f3112-6be8-445d-b49a-ff3c95467d98','a0000000-0000-0000-0000-000000000001','d035dc35-dfe7-42fc-9107-aa9d2a5e7a94',1000.00,'2025-11-14','cash','2025-11-14',0,'RCP-2025-00081','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('7662d32c-28a0-46fc-9820-82c8811e71c7','a0000000-0000-0000-0000-000000000001','b900fc2b-6db4-46f0-bd4e-a63854e40286',1000.00,'2025-11-10','cash','2025-11-10',0,'RCP-2025-00082','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('2569449d-62aa-4dae-8d6a-1c83e7b33b10','a0000000-0000-0000-0000-000000000001','3ee0b080-42a7-468f-979c-5a04c6da0825',2500.00,'2025-11-15','cash','2025-11-15',0,'RCP-2025-00083','Initial membership payment - quarterly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('85a8add2-28c3-4ee8-8251-3dec30735f4e','a0000000-0000-0000-0000-000000000001','b9e0b504-8a40-4f5d-b702-cb99a5824362',1000.00,'2025-11-17','cash','2025-11-17',0,'RCP-2025-00084','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('c96048a5-a0b2-4ae4-8d31-50190a811cee','a0000000-0000-0000-0000-000000000001','b56f780c-d2ca-47ac-a1d6-9c7ab254b421',2500.00,'2025-11-17','cash','2025-11-17',0,'RCP-2025-00085','Initial membership payment - quarterly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('42c68915-5a1b-4d61-a115-4113575706fa','a0000000-0000-0000-0000-000000000001','c651ae3c-776b-4863-8012-62d244ae9944',1000.00,'2025-11-17','cash','2025-11-17',0,'RCP-2025-00086','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('ba2bc817-ae06-4481-adf2-924d992da9c8','a0000000-0000-0000-0000-000000000001','c3c26657-a915-4444-aa49-6da705578f10',2500.00,'2025-11-04','cash','2025-11-04',0,'RCP-2025-00087','Initial membership payment - quarterly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('dc4ef871-1203-4db1-9d68-49a12f8799d4','a0000000-0000-0000-0000-000000000001','3f2ab6d5-f272-4ed9-9bfb-6fe9602b1eb2',1000.00,'2025-11-18','cash','2025-11-18',0,'RCP-2025-00088','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('84ab169d-fc82-4ce8-b427-36a2351d1e0c','a0000000-0000-0000-0000-000000000001','0888748e-acb0-4c17-b607-425b34ad25f0',2500.00,'2025-11-20','cash','2025-11-20',0,'RCP-2025-00089','Initial membership payment - quarterly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('e1736237-4ef9-43a9-b702-72a1e8dc2358','a0000000-0000-0000-0000-000000000001','f9c0d23a-4553-4557-b564-bdf776b383e2',1000.00,'2025-11-16','cash','2025-11-16',0,'RCP-2025-00090','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('833843d6-983e-4d08-b1a2-a4df8a4172cf','a0000000-0000-0000-0000-000000000001','e4e66bce-5f6e-4ba9-ac94-01e8e907f92a',1000.00,'2025-11-15','cash','2025-11-15',0,'RCP-2025-00091','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('91097aea-9a61-4b36-ab17-f1a165ab3f35','a0000000-0000-0000-0000-000000000001','d29c2529-9526-4f92-a7d1-56974e89b883',1000.00,'2025-11-20','cash','2025-11-20',0,'RCP-2025-00092','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('29df5bd2-93ec-4d35-9dbe-273c39c25df9','a0000000-0000-0000-0000-000000000001','2a6ee905-0a10-4943-93fe-5ba3add00297',1000.00,'2025-11-01','cash','2025-11-01',0,'RCP-2025-00093','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('c7a3b0f1-235e-458f-8253-f59cafa939e2','a0000000-0000-0000-0000-000000000001','8975077e-a9fa-4f48-9e39-6d83bd42f7b7',1000.00,'2025-11-25','cash','2025-11-25',0,'RCP-2025-00094','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('82d7c49b-b37b-4d50-9e2f-73ef298989d8','a0000000-0000-0000-0000-000000000001','73efac78-91d4-499f-aa07-fd86a39c64f2',1000.00,'2025-11-27','cash','2025-11-27',0,'RCP-2025-00095','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('eecc0478-fbd1-46d8-8d68-f337ee4df1e1','a0000000-0000-0000-0000-000000000001','bd64b17b-9384-4945-812c-5d0c6abf8aee',2500.00,'2025-11-29','cash','2025-11-29',0,'RCP-2025-00096','Initial membership payment - quarterly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('0e56adcb-c6c3-4cb2-ac15-4b0c9964e0c2','a0000000-0000-0000-0000-000000000001','c46d18fc-c312-46e9-ba67-28e041bf3dd1',2500.00,'2025-11-01','cash','2025-11-01',0,'RCP-2025-00097','Initial membership payment - quarterly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('027c6046-bc98-45c9-ba04-061a624e65d3','a0000000-0000-0000-0000-000000000001','1c61dd9e-69cc-4593-849c-176ed6a28123',1000.00,'2025-11-01','cash','2025-11-01',0,'RCP-2025-00098','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('a6c7bf49-747e-411a-93e3-130ac6bb36ba','a0000000-0000-0000-0000-000000000001','af461e7f-ac13-47a9-b358-d61938c11fd2',1000.00,'2025-11-10','cash','2025-11-10',0,'RCP-2025-00099','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('82ad0f0e-f0ff-4786-82b4-f401cce221e5','a0000000-0000-0000-0000-000000000001','eea6566a-a6c4-4c5a-b153-71a4c1851e2f',2500.00,'2025-11-09','cash','2025-11-09',0,'RCP-2025-00100','Initial membership payment - quarterly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('e871b928-a954-4f55-9622-d35295c436d2','a0000000-0000-0000-0000-000000000001','7442c8fb-53aa-48d2-97ce-25fdfa3d1f30',2500.00,'2025-11-15','cash','2025-11-15',0,'RCP-2025-00101','Initial membership payment - quarterly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('50d983c0-d714-4151-8cea-79e26f03de0e','a0000000-0000-0000-0000-000000000001','88aea046-c6a9-43cf-bede-b3c3d6624c0f',2500.00,'2025-11-09','cash','2025-11-09',0,'RCP-2025-00102','Initial membership payment - quarterly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('f51923cc-61a0-4b02-976b-25bad27b19e2','a0000000-0000-0000-0000-000000000001','49e35abb-5534-4c52-866c-bca41ad58cbf',2500.00,'2025-11-09','cash','2025-11-09',0,'RCP-2025-00103','Initial membership payment - quarterly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('35d1dbf4-a43c-423b-9cf0-cdfa638a1419','a0000000-0000-0000-0000-000000000001','a5107a1d-17fc-4669-9a3f-1b2efbdc5991',1000.00,'2025-11-01','cash','2025-11-01',0,'RCP-2025-00104','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('d097997b-9335-4409-9dab-aa102937f2b4','a0000000-0000-0000-0000-000000000001','65bbabdb-ca47-496b-a306-f8da09cbe988',2500.00,'2025-11-03','cash','2025-11-03',0,'RCP-2025-00105','Initial membership payment - quarterly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('ff771aee-6291-4f1f-b9eb-38e9c0000140','a0000000-0000-0000-0000-000000000001','114145d0-d5a7-4036-9d4b-0862abc5802f',2500.00,'2025-11-03','cash','2025-11-03',0,'RCP-2025-00106','Initial membership payment - quarterly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('d274ec6d-db6e-450f-93b0-7537ab77d99d','a0000000-0000-0000-0000-000000000001','79371002-0758-49b9-b450-7c7dc8ff3cef',1000.00,'2025-11-18','cash','2025-11-18',0,'RCP-2025-00107','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('7a3c187d-9303-42a6-a83a-fcbcb6981bad','a0000000-0000-0000-0000-000000000001','160e2140-27a1-40a6-bf83-7ce4a8b754a4',1000.00,'2025-11-18','cash','2025-11-18',0,'RCP-2025-00108','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('398fa8b1-8960-430b-a9b5-0c346e14cf80','a0000000-0000-0000-0000-000000000001','c492ddef-f567-4ae7-85d4-cc60a98cf319',1000.00,'2025-11-18','cash','2025-11-18',0,'RCP-2025-00109','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('6bb2efe0-4895-4edf-b036-dc2c88661d23','a0000000-0000-0000-0000-000000000001','abb3342d-e3eb-4f59-b5ce-cc0c64525f79',1000.00,'2025-11-18','cash','2025-11-18',0,'RCP-2025-00110','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('eb6883df-290a-418e-bf3f-b49b6e340274','a0000000-0000-0000-0000-000000000001','fa76ac57-df5e-441a-8514-9f1808e93a48',1000.00,'2025-11-18','cash','2025-11-18',0,'RCP-2025-00111','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('2b3ea50a-c978-4c85-8204-289dc2d56955','a0000000-0000-0000-0000-000000000001','36bfb307-b474-4698-9322-5ce9f3c01760',2500.00,'2025-11-10','cash','2025-11-10',0,'RCP-2025-00112','Initial membership payment - quarterly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('e45658c0-d78c-41e6-855c-463befe3a773','a0000000-0000-0000-0000-000000000001','21784db3-680d-454b-a88f-0e29debcdf58',1000.00,'2025-11-19','cash','2025-11-19',0,'RCP-2025-00113','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('ac571459-d604-4d95-8e4f-1d1d55f692e3','a0000000-0000-0000-0000-000000000001','d6dccf9a-d184-4e6a-b558-201ff62cbebc',1000.00,'2025-11-20','cash','2025-11-20',0,'RCP-2025-00114','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('adcb4122-ff53-42e0-883b-3c12db05cdc4','a0000000-0000-0000-0000-000000000001','a0cfe850-6d8a-4f4a-aae4-823e82787179',1000.00,'2025-11-20','cash','2025-11-20',0,'RCP-2025-00115','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('dd02eeb8-d45a-4fb6-9a3c-51e27a20deca','a0000000-0000-0000-0000-000000000001','6a9f8d1d-f7b1-48c1-9b2c-77b29c1ece7b',4500.00,'2025-11-24','cash','2025-11-24',0,'RCP-2025-00116','Initial membership payment - half_yearly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('01e3fb05-5524-41d1-b929-b8a1942856e6','a0000000-0000-0000-0000-000000000001','d3ebebf2-37a5-4b73-8ddb-26756c5620e6',1000.00,'2025-11-24','cash','2025-11-24',0,'RCP-2025-00117','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('28826246-890a-4adc-b5f3-a6673fec7941','a0000000-0000-0000-0000-000000000001','a923d20d-322d-4093-8b68-758c951e929b',1000.00,'2025-11-24','cash','2025-11-24',0,'RCP-2025-00118','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('f41572bd-0964-403c-869c-f98298d21ef5','a0000000-0000-0000-0000-000000000001','3929c060-30c6-43d5-8c04-f4d62a18fb06',1000.00,'2025-11-24','cash','2025-11-24',0,'RCP-2025-00119','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('cb308503-6c1f-443e-9f54-391f08d0cc65','a0000000-0000-0000-0000-000000000001','d21e00c9-994d-4e77-b57f-9ceb4220e31e',1000.00,'2025-11-24','cash','2025-11-24',0,'RCP-2025-00120','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('6b7b685b-37f2-4a25-b01e-388360840fa5','a0000000-0000-0000-0000-000000000001','a8468ade-1c2d-4c55-917c-a9efab90f94b',1000.00,'2025-11-27','cash','2025-11-27',0,'RCP-2025-00001','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('af8c5dc7-5e67-4adb-97a5-ba3315fd56bd','a0000000-0000-0000-0000-000000000001','860f22aa-8f92-4bad-be70-09a4c588c884',1000.00,'2025-11-05','cash','2025-11-05',0,'RCP-2025-00002','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('9e5e3883-cd1d-4294-8882-442582589664','a0000000-0000-0000-0000-000000000001','deb65d40-52c1-4695-96f3-0697966c7301',2500.00,'2025-11-05','cash','2025-11-05',0,'RCP-2025-00003','Initial membership payment - quarterly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('d595ba7b-86ae-41b5-bbe7-9d1c433751ae','a0000000-0000-0000-0000-000000000001','329ed26c-e9c2-480a-a4da-a33871d6c795',2500.00,'2025-11-05','cash','2025-11-05',0,'RCP-2025-00004','Initial membership payment - quarterly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('96ca3af8-08df-41f0-8b01-2af374f3c4d1','a0000000-0000-0000-0000-000000000001','782b59c6-a2f6-4b1d-81cc-71ea4068f83e',1000.00,'2025-11-06','cash','2025-11-06',0,'RCP-2025-00005','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('07d214c5-82f8-4bbd-8746-cde230c8f983','a0000000-0000-0000-0000-000000000001','fe82e47f-200e-45ef-a816-8adbab127976',2500.00,'2025-11-06','cash','2025-11-06',0,'RCP-2025-00006','Initial membership payment - quarterly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('b9f7ad4d-4610-461d-8918-05e7d3200cab','a0000000-0000-0000-0000-000000000001','ce0d7dca-f123-48e2-b2df-ef6997e8cc92',2500.00,'2025-11-02','cash','2025-11-02',0,'RCP-2025-00007','Initial membership payment - quarterly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('0750b8f6-7c09-48a4-9af4-c9e37f1a5c75','a0000000-0000-0000-0000-000000000001','411f7066-45fb-4467-a4f7-40fa96c5a6aa',2500.00,'2025-11-01','cash','2025-11-01',0,'RCP-2025-00008','Initial membership payment - quarterly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('d287779c-fbc4-46b1-ab8f-1501a58a8662','a0000000-0000-0000-0000-000000000001','0e907068-9dbf-4283-965a-284dac747aaa',1000.00,'2025-11-11','cash','2025-11-11',0,'RCP-2025-00009','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('bf7c40a8-7a04-40f9-afac-af53edcd2bcf','a0000000-0000-0000-0000-000000000001','2dbcbac0-162a-4765-ab32-0a7a46bc5cf7',2500.00,'2025-11-15','cash','2025-11-15',0,'RCP-2025-00010','Initial membership payment - quarterly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('403c91b9-bfd0-48ce-841d-8beafec72d1f','a0000000-0000-0000-0000-000000000001','0ebb1840-f1b1-4b7b-9afa-04ef3784bd9f',1000.00,'2025-11-15','cash','2025-11-15',0,'RCP-2025-00011','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('fa8e52af-51a9-4b9f-8712-2ae08937e542','a0000000-0000-0000-0000-000000000001','30a11401-412c-40eb-81e3-23958aee8bbf',2500.00,'2025-11-15','cash','2025-11-15',0,'RCP-2025-00012','Initial membership payment - quarterly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('45e5a3a0-2fe9-4a1a-b9a3-b4b783c4bd55','a0000000-0000-0000-0000-000000000001','c124edae-5e74-4fc3-b02d-7c98564b75e6',1000.00,'2025-11-15','cash','2025-11-15',0,'RCP-2025-00013','Initial membership payment - monthly','2025-12-06 02:52:11.574426+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payments (id,gym_id,member_id,amount,payment_date,payment_method,due_date,days_late,receipt_number,notes,created_at) VALUES ('2070f142-9fc0-4375-af2c-9b0ee96c5179','a0000000-0000-0000-0000-000000000001','8b794813-758b-4ae8-a7d7-a5b8afe0f3e7',1000.00,'2025-12-06','cash','2025-12-06',0,'RCP-2025-00102',NULL,'2025-12-06 08:02:12.814393+00') ON CONFLICT (id) DO NOTHING;

COMMIT;
-- =====================================================
-- PRODUCTION MIGRATION - PART 4A: PAYMENT SCHEDULES (1-60)
-- Target: dbtdarmxvgbxeinwcxka (Production)
-- Gym: Avengers Gym (a0000000-0000-0000-0000-000000000001)
-- Run AFTER prod_03_payments_part_b.sql
-- =====================================================

BEGIN;

-- =====================================================
-- PAYMENT SCHEDULES BATCH 1 (1-60 of 174)
-- =====================================================

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('37cbd528-1e1c-4cb4-89f9-5d68b6f298fe','a0000000-0000-0000-0000-000000000001','329ed26c-e9c2-480a-a4da-a33871d6c795','2025-11-05',2500.00,'paid','d595ba7b-86ae-41b5-bbe7-9d1c433751ae','2025-12-06 02:52:11.574426+00','2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('46fa1044-e02b-4bdd-93bd-3c220f0857b6','a0000000-0000-0000-0000-000000000001','d29c2529-9526-4f92-a7d1-56974e89b883','2025-11-20',1000.00,'paid','91097aea-9a61-4b36-ab17-f1a165ab3f35','2025-12-06 02:52:11.574426+00','2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('4c390ab6-4482-4819-bb90-7cdef891158f','a0000000-0000-0000-0000-000000000001','ce0d7dca-f123-48e2-b2df-ef6997e8cc92','2025-11-02',2500.00,'paid','b9f7ad4d-4610-461d-8918-05e7d3200cab','2025-12-06 02:52:11.574426+00','2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('fbab5397-25c1-4c2e-9dae-f99c26f23a95','a0000000-0000-0000-0000-000000000001','e4e66bce-5f6e-4ba9-ac94-01e8e907f92a','2025-12-15',1000.00,'pending',NULL,NULL,'2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('698b2c4a-a541-4218-a138-0ca043075edc','a0000000-0000-0000-0000-000000000001','114145d0-d5a7-4036-9d4b-0862abc5802f','2025-11-03',2500.00,'paid','ff771aee-6291-4f1f-b9eb-38e9c0000140','2025-12-06 02:52:11.574426+00','2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('bec434f2-6b02-44f3-9598-fe5a41f56b47','a0000000-0000-0000-0000-000000000001','8975077e-a9fa-4f48-9e39-6d83bd42f7b7','2025-11-25',1000.00,'paid','c7a3b0f1-235e-458f-8253-f59cafa939e2','2025-12-06 02:52:11.574426+00','2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('4976da32-71dd-4369-ac73-d227b4bea437','a0000000-0000-0000-0000-000000000001','860f22aa-8f92-4bad-be70-09a4c588c884','2025-12-05',1000.00,'overdue',NULL,NULL,'2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('bc7fa970-03e9-4899-8dfd-050da3ea2acf','a0000000-0000-0000-0000-000000000001','fe82e47f-200e-45ef-a816-8adbab127976','2025-11-06',2500.00,'paid','07d214c5-82f8-4bbd-8746-cde230c8f983','2025-12-06 02:52:11.574426+00','2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('869112d6-66db-4233-a8c7-4dc1d50906ec','a0000000-0000-0000-0000-000000000001','782b59c6-a2f6-4b1d-81cc-71ea4068f83e','2025-11-06',1000.00,'paid','96ca3af8-08df-41f0-8b01-2af374f3c4d1','2025-12-06 02:52:11.574426+00','2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('66a617e8-9459-4fe2-ac55-c8bac3b7bf3c','a0000000-0000-0000-0000-000000000001','deb65d40-52c1-4695-96f3-0697966c7301','2025-11-05',2500.00,'paid','9e5e3883-cd1d-4294-8882-442582589664','2025-12-06 02:52:11.574426+00','2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('97022d13-db9c-4527-bbd5-059bba0e3597','a0000000-0000-0000-0000-000000000001','7442c8fb-53aa-48d2-97ce-25fdfa3d1f30','2025-11-15',2500.00,'paid','e871b928-a954-4f55-9622-d35295c436d2','2025-12-06 02:52:11.574426+00','2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('0eb83343-5e7a-43ce-b757-4fa0e51b51d6','a0000000-0000-0000-0000-000000000001','eea6566a-a6c4-4c5a-b153-71a4c1851e2f','2025-11-09',2500.00,'paid','82ad0f0e-f0ff-4786-82b4-f401cce221e5','2025-12-06 02:52:11.574426+00','2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('f5d0ffbb-af69-4a22-836d-a52a4a57bfbf','a0000000-0000-0000-0000-000000000001','af461e7f-ac13-47a9-b358-d61938c11fd2','2025-12-10',1000.00,'pending',NULL,NULL,'2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('dcf615bc-4d63-45f9-81b7-20d03fce5917','a0000000-0000-0000-0000-000000000001','2a6ee905-0a10-4943-93fe-5ba3add00297','2025-11-01',1000.00,'paid','29df5bd2-93ec-4d35-9dbe-273c39c25df9','2025-12-06 02:52:11.574426+00','2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('692b6dcb-82c6-42d2-bea3-fd5bffce412d','a0000000-0000-0000-0000-000000000001','a8468ade-1c2d-4c55-917c-a9efab90f94b','2025-11-27',1000.00,'paid','6b7b685b-37f2-4a25-b01e-388360840fa5','2025-12-06 02:52:11.574426+00','2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('6883ddcc-965f-4756-9526-51aa597870b0','a0000000-0000-0000-0000-000000000001','c46d18fc-c312-46e9-ba67-28e041bf3dd1','2025-11-01',2500.00,'paid','0e56adcb-c6c3-4cb2-ac15-4b0c9964e0c2','2025-12-06 02:52:11.574426+00','2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('57c39cae-e0e6-46b1-a420-964c288b52ab','a0000000-0000-0000-0000-000000000001','d29c2529-9526-4f92-a7d1-56974e89b883','2025-12-20',1000.00,'pending',NULL,NULL,'2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('40a6b82f-159c-4ba7-bffd-d5f05ca88765','a0000000-0000-0000-0000-000000000001','a8468ade-1c2d-4c55-917c-a9efab90f94b','2025-12-27',1000.00,'pending',NULL,NULL,'2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('ec5b9493-24a5-4c51-9ef2-7e1255643b4a','a0000000-0000-0000-0000-000000000001','bd64b17b-9384-4945-812c-5d0c6abf8aee','2025-11-29',2500.00,'paid','eecc0478-fbd1-46d8-8d68-f337ee4df1e1','2025-12-06 02:52:11.574426+00','2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('08ccd2c3-53ea-4007-ac45-d5b9d0145006','a0000000-0000-0000-0000-000000000001','f9c0d23a-4553-4557-b564-bdf776b383e2','2025-11-16',1000.00,'paid','e1736237-4ef9-43a9-b702-72a1e8dc2358','2025-12-06 02:52:11.574426+00','2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('152fca37-6f37-4a38-8aa7-307f246bfbfa','a0000000-0000-0000-0000-000000000001','73efac78-91d4-499f-aa07-fd86a39c64f2','2025-11-27',1000.00,'paid','82d7c49b-b37b-4d50-9e2f-73ef298989d8','2025-12-06 02:52:11.574426+00','2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('7bda4985-d0a8-4d00-84ca-edd19443765f','a0000000-0000-0000-0000-000000000001','a5107a1d-17fc-4669-9a3f-1b2efbdc5991','2025-12-01',1000.00,'overdue',NULL,NULL,'2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('3fc4b791-f578-421f-b11a-504e417604bd','a0000000-0000-0000-0000-000000000001','0e907068-9dbf-4283-965a-284dac747aaa','2025-11-11',1000.00,'paid','d287779c-fbc4-46b1-ab8f-1501a58a8662','2025-12-06 02:52:11.574426+00','2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('e243ef11-211e-4d11-9c85-e24f8e4789b5','a0000000-0000-0000-0000-000000000001','1c61dd9e-69cc-4593-849c-176ed6a28123','2025-11-01',1000.00,'paid','027c6046-bc98-45c9-ba04-061a624e65d3','2025-12-06 02:52:11.574426+00','2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('83f4174f-e7db-4a9f-902f-8102f3a18a1b','a0000000-0000-0000-0000-000000000001','411f7066-45fb-4467-a4f7-40fa96c5a6aa','2025-11-01',2500.00,'paid','0750b8f6-7c09-48a4-9af4-c9e37f1a5c75','2025-12-06 02:52:11.574426+00','2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('ae08a58d-6bdd-4ce6-aab7-996708a044ad','a0000000-0000-0000-0000-000000000001','af461e7f-ac13-47a9-b358-d61938c11fd2','2025-11-10',1000.00,'paid','a6c7bf49-747e-411a-93e3-130ac6bb36ba','2025-12-06 02:52:11.574426+00','2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('187f806a-db22-4f34-a6b5-6ec37d9255c5','a0000000-0000-0000-0000-000000000001','65bbabdb-ca47-496b-a306-f8da09cbe988','2025-11-03',2500.00,'paid','d097997b-9335-4409-9dab-aa102937f2b4','2025-12-06 02:52:11.574426+00','2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('a8524b4e-0309-43dd-9c34-dae01c670ba5','a0000000-0000-0000-0000-000000000001','0ebb1840-f1b1-4b7b-9afa-04ef3784bd9f','2025-11-15',1000.00,'paid','403c91b9-bfd0-48ce-841d-8beafec72d1f','2025-12-06 02:52:11.574426+00','2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('435f03f5-f8e3-408b-be6d-7b9ff9cc0ac7','a0000000-0000-0000-0000-000000000001','a5107a1d-17fc-4669-9a3f-1b2efbdc5991','2025-11-01',1000.00,'paid','35d1dbf4-a43c-423b-9cf0-cdfa638a1419','2025-12-06 02:52:11.574426+00','2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('f68f9b56-bb88-48c9-bf49-7d0b0dbe0883','a0000000-0000-0000-0000-000000000001','49e35abb-5534-4c52-866c-bca41ad58cbf','2025-11-09',2500.00,'paid','f51923cc-61a0-4b02-976b-25bad27b19e2','2025-12-06 02:52:11.574426+00','2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('14c39925-92cd-4c9f-b492-e65600248bb9','a0000000-0000-0000-0000-000000000001','782b59c6-a2f6-4b1d-81cc-71ea4068f83e','2025-12-06',1000.00,'overdue',NULL,NULL,'2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('41700c98-af07-40aa-a45c-7c2a885398e9','a0000000-0000-0000-0000-000000000001','2a6ee905-0a10-4943-93fe-5ba3add00297','2025-12-01',1000.00,'overdue',NULL,NULL,'2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('fbde379e-3590-4e5e-bd8b-a0441f4ac71d','a0000000-0000-0000-0000-000000000001','0e907068-9dbf-4283-965a-284dac747aaa','2025-12-11',1000.00,'pending',NULL,NULL,'2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('007885be-be68-4d36-9d5b-85a29bfb78ab','a0000000-0000-0000-0000-000000000001','860f22aa-8f92-4bad-be70-09a4c588c884','2025-11-05',1000.00,'paid','af8c5dc7-5e67-4adb-97a5-ba3315fd56bd','2025-12-06 02:52:11.574426+00','2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('d9789987-5c8d-4ea5-9b83-d114567df905','a0000000-0000-0000-0000-000000000001','0ebb1840-f1b1-4b7b-9afa-04ef3784bd9f','2025-12-15',1000.00,'pending',NULL,NULL,'2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('037deece-9cd9-48f3-b1f0-739fe1f47416','a0000000-0000-0000-0000-000000000001','2dbcbac0-162a-4765-ab32-0a7a46bc5cf7','2025-11-15',2500.00,'paid','bf7c40a8-7a04-40f9-afac-af53edcd2bcf','2025-12-06 02:52:11.574426+00','2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('eb700b89-f03e-4b53-a34d-43e0a32bcc37','a0000000-0000-0000-0000-000000000001','8975077e-a9fa-4f48-9e39-6d83bd42f7b7','2025-12-25',1000.00,'pending',NULL,NULL,'2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('065d3d92-5eea-42b1-ba2d-e26b9e830f86','a0000000-0000-0000-0000-000000000001','88aea046-c6a9-43cf-bede-b3c3d6624c0f','2025-11-09',2500.00,'paid','50d983c0-d714-4151-8cea-79e26f03de0e','2025-12-06 02:52:11.574426+00','2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('247329ab-6330-48e7-a314-2665933e23e3','a0000000-0000-0000-0000-000000000001','73efac78-91d4-499f-aa07-fd86a39c64f2','2025-12-27',1000.00,'pending',NULL,NULL,'2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('3224876f-c627-4b84-86d5-0e43d9b3f251','a0000000-0000-0000-0000-000000000001','e4e66bce-5f6e-4ba9-ac94-01e8e907f92a','2025-11-15',1000.00,'paid','833843d6-983e-4d08-b1a2-a4df8a4172cf','2025-12-06 02:52:11.574426+00','2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('04b18d3f-ae52-4b8a-9189-9629f2a518f9','a0000000-0000-0000-0000-000000000001','f9c0d23a-4553-4557-b564-bdf776b383e2','2025-12-16',1000.00,'pending',NULL,NULL,'2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('2cbf2f38-a8d4-4ed5-9418-e2392c189e3b','a0000000-0000-0000-0000-000000000001','0888748e-acb0-4c17-b607-425b34ad25f0','2025-11-20',2500.00,'paid','84ab169d-fc82-4ce8-b427-36a2351d1e0c','2025-12-06 02:52:11.574426+00','2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('3a861e9c-3ab4-4820-8d03-944f786ab64c','a0000000-0000-0000-0000-000000000001','1c61dd9e-69cc-4593-849c-176ed6a28123','2025-12-01',1000.00,'overdue',NULL,NULL,'2025-12-06 02:47:04.134614+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('84cf012f-4446-4924-a9a2-17559d258494','a0000000-0000-0000-0000-000000000001','c124edae-5e74-4fc3-b02d-7c98564b75e6','2025-11-15',1000.00,'paid','45e5a3a0-2fe9-4a1a-b9a3-b4b783c4bd55','2025-12-06 02:52:11.574426+00','2025-12-06 02:48:15.616059+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('6780accc-a664-449e-9d0f-ee7b05a2f2f4','a0000000-0000-0000-0000-000000000001','30a11401-412c-40eb-81e3-23958aee8bbf','2025-11-15',2500.00,'paid','fa8e52af-51a9-4b9f-8712-2ae08937e542','2025-12-06 02:52:11.574426+00','2025-12-06 02:48:15.616059+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('6fcd17a0-e8a5-4247-969e-a7e2285aa668','a0000000-0000-0000-0000-000000000001','5e670063-37af-42b7-9a7e-e9cdbe51536e','2025-11-05',1000.00,'paid','0c26cbac-433c-4b1c-a9d4-f19c6162074b','2025-12-06 02:52:11.574426+00','2025-12-06 02:48:15.616059+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('2a77bcb7-9e13-489a-a508-64805e440b82','a0000000-0000-0000-0000-000000000001','2807b11f-1f90-4c54-9429-4f31bac466a4','2025-11-14',1000.00,'paid','6e42cc3a-3774-499b-a129-9a43922935d6','2025-12-06 02:52:11.574426+00','2025-12-06 02:48:15.616059+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('eb898a51-22c1-4ccc-8ecf-7ad31fdcbfc3','a0000000-0000-0000-0000-000000000001','455c913a-18f9-44a4-992a-eb9fb11b7967','2025-12-08',1000.00,'pending',NULL,NULL,'2025-12-06 02:48:15.616059+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('442a4a54-97f1-4d90-98a8-8cf41c5a9985','a0000000-0000-0000-0000-000000000001','5e670063-37af-42b7-9a7e-e9cdbe51536e','2025-12-05',1000.00,'overdue',NULL,NULL,'2025-12-06 02:48:15.616059+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('6998c264-300b-4e0b-bdea-47e49393dbf8','a0000000-0000-0000-0000-000000000001','2807b11f-1f90-4c54-9429-4f31bac466a4','2025-12-14',1000.00,'pending',NULL,NULL,'2025-12-06 02:48:15.616059+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('c1e36dfa-534d-4a8c-b8f3-89fda2894a4e','a0000000-0000-0000-0000-000000000001','a2b00ea5-f4e6-4fd2-8aa7-1f3dc74de694','2025-11-19',2500.00,'paid','9c9d8254-c2ba-4ffb-9d19-6afceaa82a0f','2025-12-06 02:52:11.574426+00','2025-12-06 02:48:15.616059+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('ae82d532-cbfb-4223-a545-f3c6c7710f97','a0000000-0000-0000-0000-000000000001','dac40a42-63a9-4732-b865-ac5cad82f364','2025-11-15',2500.00,'paid','24210070-0c1c-424b-8e9e-3b10a8f698c9','2025-12-06 02:52:11.574426+00','2025-12-06 02:48:15.616059+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('24fe8664-1db1-4814-93dc-1bcbcfd20c3a','a0000000-0000-0000-0000-000000000001','fc8382fd-c856-431c-b5ae-810b09dfebd5','2025-11-18',2500.00,'paid','94ffdc4b-e18d-4a9a-a4f6-a77b75056a7a','2025-12-06 02:52:11.574426+00','2025-12-06 02:48:15.616059+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('7ba6a9ae-c8f8-468c-98cb-60f18625def1','a0000000-0000-0000-0000-000000000001','c124edae-5e74-4fc3-b02d-7c98564b75e6','2025-12-15',1000.00,'pending',NULL,NULL,'2025-12-06 02:48:15.616059+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('0ac73f35-e155-4da7-a0e3-0b8e1ea68590','a0000000-0000-0000-0000-000000000001','455c913a-18f9-44a4-992a-eb9fb11b7967','2025-11-08',1000.00,'paid','c47dd465-9f14-468d-bdb1-63189651f46a','2025-12-06 02:52:11.574426+00','2025-12-06 02:48:15.616059+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO gym_payment_schedule (id,gym_id,member_id,due_date,amount_due,status,paid_payment_id,paid_at,created_at) VALUES ('c8f26d02-6b94-47a0-aac9-b7f9a4773075','a0000000-0000-0000-0000-000000000001','9f9a5e36-76f5-422f-8355-fe46882215f5','2025-11-10',2500.00,'paid','134bf540-6a53-4616-88aa-814170731d43','2025-12-06 02:52:11.574426+00','2025-12-06 02:48:15.616059+00') ON CONFLICT (id) DO NOTHING;

COMMIT;

-- =====================================================
--  VERIFICATION QUERIES
-- =====================================================
SELECT '✓ Migration Complete!' as status;

SELECT 
  'gym_gyms' as table_name, 
  COUNT(*) as actual_count,
  1 as expected_count,
  CASE WHEN COUNT(*) = 1 THEN '✓ PASS' ELSE '✗ FAIL' END as status
FROM gym_gyms WHERE id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'gym_users', COUNT(*), 1, CASE WHEN COUNT(*) = 1 THEN ' PASS' ELSE ' FAIL' END 
FROM gym_users WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'plans', COUNT(*), 4, CASE WHEN COUNT(*) = 4 THEN '✓ PASS' ELSE '✗ FAIL' END 
FROM gym_membership_plans WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'members', COUNT(*), 133, CASE WHEN COUNT(*) >= 130 THEN ' PASS' ELSE ' FAIL' END 
FROM gym_members WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'payments', COUNT(*), 102, CASE WHEN COUNT(*) >= 100 THEN '✓ PASS' ELSE '✗ FAIL' END 
FROM gym_payments WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'schedules', COUNT(*), 174, CASE WHEN COUNT(*) >= 170 THEN ' PASS' ELSE ' FAIL' END 
FROM gym_payment_schedule WHERE gym_id = 'a0000000-0000-0000-0000-000000000001';

