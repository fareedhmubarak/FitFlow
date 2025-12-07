# Avengers Gym Data Migration Guide

This guide explains how to export demo data from the **development** Supabase project and import it into **production**.

## Database Information

| Environment | Project ID | Database |
|------------|------------|----------|
| **Development (Source)** | `qvszzwfvkvjxpkkiilyv` | Branch database with demo data |
| **Production (Target)** | `dbtdarmxvgbxeinwcxka` | Clean production database |

## Data Summary

| Table | Records | Description |
|-------|---------|-------------|
| `gym_gyms` | 1 | Avengers Gym profile |
| `gym_users` | 1 | Owner account |
| `gym_membership_plans` | 4 | Monthly, 3 Months, 6 Months, Yearly |
| `gym_members` | 133 | All gym members (128 with photos) |
| `gym_payments` | 102 | Payment records |
| `gym_payment_schedule` | 174 | Payment schedules |

## Gym ID
```
a0000000-0000-0000-0000-000000000001
```

---

## Step 1: Run Base Migration (avengers_01_base.sql)

This creates the gym, user, and membership plans. Run this file in production SQL editor.

---

## Step 2: Export Members from Dev Database

Run this query in the **DEV** database SQL editor and copy the results:

```sql
-- Generate INSERT statements for all members
SELECT 
  'INSERT INTO gym_members (id, gym_id, full_name, phone, email, gender, height, weight, photo_url, joining_date, membership_plan, plan_amount, status, plan_id, membership_end_date, membership_start_date, next_payment_due_date, last_payment_date, last_payment_amount, total_payments_received, lifetime_value, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ',' ||
  quote_literal(gym_id) || ',' ||
  quote_literal(full_name) || ',' ||
  COALESCE(quote_literal(phone), 'NULL') || ',' ||
  COALESCE(quote_literal(email), 'NULL') || ',' ||
  COALESCE(quote_literal(gender), '''male''') || ',' ||
  COALESCE(quote_literal(height), 'NULL') || ',' ||
  COALESCE(quote_literal(weight), 'NULL') || ',' ||
  COALESCE(quote_literal(REPLACE(photo_url, 'qvszzwfvkvjxpkkiilyv', 'dbtdarmxvgbxeinwcxka')), 'NULL') || ',' ||
  quote_literal(joining_date::text) || ',' ||
  COALESCE(quote_literal(membership_plan), 'NULL') || ',' ||
  COALESCE(plan_amount::text, 'NULL') || ',' ||
  quote_literal(status) || ',' ||
  COALESCE(quote_literal(plan_id::text), 'NULL') || ',' ||
  COALESCE(quote_literal(membership_end_date::text), 'NULL') || ',' ||
  COALESCE(quote_literal(membership_start_date::text), 'NULL') || ',' ||
  COALESCE(quote_literal(next_payment_due_date::text), 'NULL') || ',' ||
  COALESCE(quote_literal(last_payment_date::text), 'NULL') || ',' ||
  COALESCE(last_payment_amount::text, 'NULL') || ',' ||
  COALESCE(total_payments_received::text, '0') || ',' ||
  COALESCE(lifetime_value::text, '0') || ',' ||
  'NOW(),NOW()) ON CONFLICT (id) DO NOTHING;' as sql
FROM gym_members
WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'
ORDER BY created_at;
```

---

## Step 3: Export Payments from Dev Database

Run this query in the **DEV** database SQL editor:

```sql
-- Generate INSERT statements for all payments
SELECT 
  'INSERT INTO gym_payments (id, gym_id, member_id, amount, payment_date, payment_method, receipt_number, notes, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ',' ||
  quote_literal(gym_id) || ',' ||
  quote_literal(member_id) || ',' ||
  amount::text || ',' ||
  quote_literal(payment_date::text) || ',' ||
  COALESCE(quote_literal(payment_method), '''cash''') || ',' ||
  COALESCE(quote_literal(receipt_number), 'NULL') || ',' ||
  COALESCE(quote_literal(notes), 'NULL') || ',' ||
  quote_literal(created_at::text) || ',NOW()) ON CONFLICT (id) DO NOTHING;' as sql
FROM gym_payments
WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'
ORDER BY created_at;
```

---

## Step 4: Export Payment Schedules from Dev Database

Run this query in the **DEV** database SQL editor:

```sql
-- Generate INSERT statements for payment schedules
SELECT 
  'INSERT INTO gym_payment_schedule (id, gym_id, member_id, due_date, amount_due, status, paid_payment_id, paid_at, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ',' ||
  quote_literal(gym_id) || ',' ||
  quote_literal(member_id) || ',' ||
  quote_literal(due_date::text) || ',' ||
  amount_due::text || ',' ||
  quote_literal(status) || ',' ||
  COALESCE(quote_literal(paid_payment_id::text), 'NULL') || ',' ||
  COALESCE(quote_literal(paid_at::text), 'NULL') || ',' ||
  quote_literal(created_at::text) || ',NOW()) ON CONFLICT (id) DO NOTHING;' as sql
FROM gym_payment_schedule
WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'
ORDER BY created_at;
```

---

## Step 5: Photo Storage Migration

Member photos are stored in Supabase Storage. To migrate:

1. **Path format**: `images/gyms/avengers-gym/members/sp_XXX.jpg`
2. **URL transformation**: Replace `qvszzwfvkvjxpkkiilyv` with `dbtdarmxvgbxeinwcxka`

### Option A: Manual Download/Upload
1. Go to Dev Supabase Storage → images bucket
2. Download all files from `gyms/avengers-gym/members/`
3. Upload to Production Supabase Storage (same path)

### Option B: Use Supabase CLI
```bash
# Download from dev
supabase storage cp -r supabase://qvszzwfvkvjxpkkiilyv/images/gyms/avengers-gym ./local-backup

# Upload to production
supabase storage cp -r ./local-backup supabase://dbtdarmxvgbxeinwcxka/images/gyms/avengers-gym
```

---

## Verification Queries

Run these in **PRODUCTION** after migration:

```sql
-- Check counts
SELECT 'gym_gyms' as table_name, COUNT(*) FROM gym_gyms WHERE id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL SELECT 'gym_users', COUNT(*) FROM gym_users WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL SELECT 'gym_membership_plans', COUNT(*) FROM gym_membership_plans WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL SELECT 'gym_members', COUNT(*) FROM gym_members WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL SELECT 'gym_payments', COUNT(*) FROM gym_payments WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL SELECT 'gym_payment_schedule', COUNT(*) FROM gym_payment_schedule WHERE gym_id = 'a0000000-0000-0000-0000-000000000001';
```

### Expected Results:
| Table | Expected Count |
|-------|---------------|
| gym_gyms | 1 |
| gym_users | 1 |
| gym_membership_plans | 4 |
| gym_members | 133 |
| gym_payments | 102 |
| gym_payment_schedule | 174 |

---

## Important Notes

1. **Photo URLs**: All photo URLs in member inserts already have the production project ID
2. **Plan IDs**: Members reference these plan IDs:
   - `b0000000-0000-0000-0000-000000000001` - Monthly (₹1000)
   - `b0000000-0000-0000-0000-000000000002` - 3 Months (₹2500)
   - `b0000000-0000-0000-0000-000000000003` - 6 Months (₹4500)
   - `b0000000-0000-0000-0000-000000000004` - Yearly (₹8500)
3. **Owner Auth**: Create auth user with email `avengers@fitflow.app` before running user insert
4. **Execution Order**: base → members → payments → payment_schedules
