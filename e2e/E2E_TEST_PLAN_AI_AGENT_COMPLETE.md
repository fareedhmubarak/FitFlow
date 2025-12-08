# FitFlow End-to-End Test Plan for AI Agents

## 📋 DOCUMENT PURPOSE
This test plan is designed for **ANY AI AGENT** to execute. It provides:
- **EXACT SQL queries** to capture database state before and after each action
- **EXACT UI steps** with specific element identifiers
- **EXACT expected outcomes** with specific values
- **Complete verification** of all affected tables, history records, and audit logs
- **Photo auto-capture verification** requirements

---

## 🔑 CRITICAL BUSINESS RULES TO VERIFY

### Rule 1: ONE Payment Schedule Record Per Member
- Each member has **EXACTLY 1** record in `gym_payment_schedule`
- This record tracks their **NEXT** payment due date
- **NEVER** multiple schedule records per member

### Rule 2: THREE Records Created on New Member
When adding a new member with initial payment:
1. **1 record** in `gym_members`
2. **1 record** in `gym_payments` (initial payment)
3. **1 record** in `gym_payment_schedule` (next due date)

### Rule 3: Payment Delete Reverts State
When deleting a payment:
- Schedule's `due_date` reverts to previous date
- Member's `membership_end_date` reverts
- Member's `next_payment_due_date` reverts
- History record created in `gym_payment_schedule_history`
- Member **remains ACTIVE** if they have pending schedules

### Rule 4: Complete Audit Trail
Every operation must create:
- `record_versions` entry (INSERT/UPDATE/DELETE logged by database triggers)
- `gym_audit_logs` entry (business action logged by application)
- `gym_member_history` entry (for status changes)
- `gym_payment_schedule_history` entry (for schedule changes on payment delete)

### Rule 5: Photo Auto-Capture
- Camera should open **AUTOMATICALLY** (not file picker)
- Photo URL stored in `images` bucket
- URL must be accessible (HTTP 200)

---

## 🌐 Test Environment Configuration

### Application Details
| Setting | Value |
|---------|-------|
| Application URL | `http://localhost:5173` |
| Test Gym Name | Avengers Gym |
| Gym ID | `a0000000-0000-0000-0000-000000000001` |
| Supabase Project ID | `qvszzwfvkvjxpkkiilyv` |

### Test Phone Number Format
```
Format: 99990[MMDD][N]
Example for Dec 8: 9999012081, 9999012082, etc.
This ensures unique phone numbers per test run.
```

---

## 📊 Database Tables to Monitor

### Primary Data Tables
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `gym_members` | Member master data | id, full_name, phone, status, photo_url, membership_end_date, next_payment_due_date |
| `gym_payments` | Payment transactions | id, member_id, amount, payment_date, receipt_number |
| `gym_payment_schedule` | **SINGLE record per member** - Next payment due | id, member_id, due_date, status, paid_payment_id |
| `gym_member_progress` | Body measurements & progress photos | id, member_id, weight, height, photo_front_url |
| `gym_receipts` | Receipt records linked to payments | id, payment_id, receipt_number |

### Audit/History Tables (Must Verify After Each Action)
| Table | Purpose | Triggered By |
|-------|---------|--------------|
| `record_versions` | All INSERT/UPDATE/DELETE operations | Database triggers |
| `gym_audit_logs` | Business-level action logs | Application code |
| `gym_member_history` | Member status changes | Application code |
| `gym_payment_schedule_history` | Schedule changes on payment delete | Application code |

### Storage Buckets
| Bucket | Purpose |
|--------|---------|
| `images` | Member photos and progress photos |

---

## 📝 Test Data Constants

```javascript
const TEST_CONFIG = {
  GYM_ID: "a0000000-0000-0000-0000-000000000001",
  GYM_NAME: "Avengers Gym",
  TEST_PHONE_PREFIX: "999901208",  // Change date portion for each day
  TEST_MEMBER_NAME_PREFIX: "E2E Test Member",
  DEFAULT_GENDER: "male",
  DEFAULT_PAYMENT_METHOD: "cash"
};
```

---

# 🧪 TEST CASE 1: Add New Member (Full Flow)

## 🎯 Objective
Verify that adding a new member creates **EXACTLY**:
- **1 record** in `gym_members`
- **1 record** in `gym_payments` (initial payment)
- **1 record** in `gym_payment_schedule` (next due date)
- **1 record** in `gym_receipts`
- Photo uploaded to `images` bucket
- Audit logs generated in `record_versions` and `gym_audit_logs`

## ⚠️ IMPORTANT VERIFICATION
After adding member, verify **ONLY 1** record exists in `gym_payment_schedule` for this member (NOT 12 records).

---

## PHASE 1: PRE-TEST - Capture Baseline Database State

### 🔍 Query TC1-PRE: Capture All Baseline Counts
Execute this query and **SAVE THE RESULTS** as `BASELINE_TC1`:

```sql
SELECT json_build_object(
  'timestamp', NOW(),
  'members_count', (SELECT COUNT(*) FROM gym_members WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'),
  'payments_count', (SELECT COUNT(*) FROM gym_payments WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'),
  'schedules_count', (SELECT COUNT(*) FROM gym_payment_schedule WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'),
  'receipts_count', (SELECT COUNT(*) FROM gym_receipts WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'),
  'record_versions_members', (SELECT COUNT(*) FROM record_versions WHERE table_name = 'gym_members'),
  'record_versions_payments', (SELECT COUNT(*) FROM record_versions WHERE table_name = 'gym_payments'),
  'record_versions_schedules', (SELECT COUNT(*) FROM record_versions WHERE table_name = 'gym_payment_schedule'),
  'audit_logs_count', (SELECT COUNT(*) FROM gym_audit_logs WHERE gym_id = 'a0000000-0000-0000-0000-000000000001')
) as baseline_tc1;
```

**📌 RECORD:** Store the JSON result as `BASELINE_TC1`

---

## PHASE 2: UI TEST EXECUTION

### 📍 Step TC1-S1: Navigate to Add Member
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1.1 | Click "Members" in bottom navigation | Members list page loads |
| 1.2 | Click the "+" (Add) floating button | Add Member form opens |

### 📍 Step TC1-S2: Fill Member Form
Fill the form with these values:

| Field | Value | Input Method |
|-------|-------|--------------|
| Full Name | `E2E Test Member TC1 [TIMESTAMP]` | Type in text input |
| Phone | `9999012081` | Type in phone input |
| Gender | `Male` | Select from dropdown/radio |
| Plan | Select **first available plan** | Select from dropdown |
| Payment Method | `Cash` | Select from dropdown |

**📌 RECORD THE FOLLOWING:**
- `SELECTED_PLAN_NAME` = [Name of selected plan]
- `SELECTED_PLAN_AMOUNT` = [Amount of selected plan]
- `SELECTED_PLAN_DURATION` = [Duration in months]

### 📍 Step TC1-S3: Photo Capture (CRITICAL)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 3.1 | Click on photo/camera area | Camera should open **AUTOMATICALLY** |
| 3.2 | (If prompted) Allow camera permission | Camera preview visible |
| 3.3 | Capture photo | Photo preview appears in form |

**⚠️ CRITICAL VERIFICATION:**
- Camera MUST open automatically (NOT file picker dialog)
- If file picker opens instead of camera, **LOG AS BUG**

### 📍 Step TC1-S4: Submit Form
| Step | Action | Expected Result |
|------|--------|-----------------|
| 4.1 | Click "Add Member" or "Save" button | Form submits |
| 4.2 | Wait for response | Success message appears |
| 4.3 | Verify redirect | Redirects to Members list or Member details |

---

## PHASE 3: POST-TEST - Database Verification

### 🔍 Query TC1-POST1: Find the New Member
```sql
SELECT 
  id,
  full_name,
  phone,
  status,
  photo_url,
  membership_plan,
  plan_amount,
  joining_date,
  membership_start_date,
  membership_end_date,
  next_payment_due_date,
  created_at
FROM gym_members 
WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'
  AND phone = '9999012081'
ORDER BY created_at DESC 
LIMIT 1;
```

**📌 RECORD:** `TEST_MEMBER_ID_TC1` = [id from result]

**✅ EXPECTED:**
- Exactly 1 record returned
- `status` = 'active'
- `photo_url` is NOT NULL
- `membership_end_date` is set
- `next_payment_due_date` is set

---

### 🔍 Query TC1-POST2: Verify Payment Record Created
```sql
SELECT 
  id,
  member_id,
  amount,
  payment_method,
  payment_date,
  receipt_number,
  created_at
FROM gym_payments 
WHERE member_id = '[TEST_MEMBER_ID_TC1]'
ORDER BY created_at DESC;
```

**📌 RECORD:** `TEST_PAYMENT_ID_TC1` = [id from result]

**✅ EXPECTED:**
| Check | Expected Value |
|-------|----------------|
| Record count | **EXACTLY 1** |
| `amount` | = `SELECTED_PLAN_AMOUNT` |
| `payment_method` | = 'cash' |
| `payment_date` | = today's date |
| `receipt_number` | NOT NULL (format: RCP-YYYY-XXXXX) |

---

### 🔍 Query TC1-POST3: Verify Payment Schedule (CRITICAL - MUST BE 1 RECORD)
```sql
SELECT 
  id,
  member_id,
  due_date,
  amount_due,
  status,
  paid_payment_id,
  created_at
FROM gym_payment_schedule 
WHERE member_id = '[TEST_MEMBER_ID_TC1]';
```

**📌 RECORD:** `TEST_SCHEDULE_ID_TC1` = [id from result]

**✅ EXPECTED:**
| Check | Expected Value |
|-------|----------------|
| Record count | **EXACTLY 1** ⚠️ CRITICAL |
| `status` | = 'pending' |
| `due_date` | = `next_payment_due_date` from member record |
| `amount_due` | = `SELECTED_PLAN_AMOUNT` |

**❌ FAILURE:** If more than 1 record exists, **LOG AS CRITICAL BUG**

---

### 🔍 Query TC1-POST4: Verify Receipt Created
```sql
SELECT 
  id,
  payment_id,
  member_id,
  receipt_number,
  amount,
  payment_date,
  valid_from,
  valid_until,
  next_due_date
FROM gym_receipts 
WHERE member_id = '[TEST_MEMBER_ID_TC1]';
```

**✅ EXPECTED:**
| Check | Expected Value |
|-------|----------------|
| Record count | **EXACTLY 1** |
| `payment_id` | = `TEST_PAYMENT_ID_TC1` |
| `receipt_number` | Matches payment's receipt_number |

---

### 🔍 Query TC1-POST5: Verify Photo URL Accessible
```sql
SELECT photo_url FROM gym_members WHERE id = '[TEST_MEMBER_ID_TC1]';
```

**✅ VERIFICATION:**
1. `photo_url` is NOT NULL
2. URL contains 'images' bucket reference
3. **HTTP GET request to URL returns status 200**

---

### 🔍 Query TC1-POST6: Verify Record Versions (INSERT Operations Logged)
```sql
SELECT 
  table_name,
  record_id,
  operation,
  new_data->>'full_name' as member_name,
  created_at
FROM record_versions 
WHERE record_id = '[TEST_MEMBER_ID_TC1]'
   OR record_id = '[TEST_PAYMENT_ID_TC1]'
   OR record_id = '[TEST_SCHEDULE_ID_TC1]'
ORDER BY created_at DESC;
```

**✅ EXPECTED:**
| Table | Operation | Expected |
|-------|-----------|----------|
| `gym_members` | INSERT | 1 record |
| `gym_payments` | INSERT | 1 record |
| `gym_payment_schedule` | INSERT | 1 record |

---

### 🔍 Query TC1-POST7: Verify Audit Logs
```sql
SELECT 
  event_type,
  action,
  resource_type,
  resource_id,
  new_values,
  created_at
FROM gym_audit_logs 
WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'
  AND (resource_id = '[TEST_MEMBER_ID_TC1]' OR resource_id = '[TEST_PAYMENT_ID_TC1]')
ORDER BY created_at DESC;
```

**✅ EXPECTED:** Audit entries for member creation and payment

---

### 🔍 Query TC1-POST8: Final Count Verification
```sql
SELECT json_build_object(
  'timestamp', NOW(),
  'members_count', (SELECT COUNT(*) FROM gym_members WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'),
  'payments_count', (SELECT COUNT(*) FROM gym_payments WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'),
  'schedules_count', (SELECT COUNT(*) FROM gym_payment_schedule WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'),
  'receipts_count', (SELECT COUNT(*) FROM gym_receipts WHERE gym_id = 'a0000000-0000-0000-0000-000000000001')
) as post_tc1;
```

**✅ COMPARE WITH BASELINE_TC1:**
| Metric | Expected Change |
|--------|-----------------|
| members_count | +1 |
| payments_count | +1 |
| schedules_count | +1 |
| receipts_count | +1 |

---

## ✅ TEST CASE 1 SUCCESS CRITERIA

| # | Check | Expected | Status |
|---|-------|----------|--------|
| 1 | Member record created | 1 new record | ⬜ |
| 2 | Payment record created | 1 new record | ⬜ |
| 3 | Schedule record created | **EXACTLY 1** new record | ⬜ |
| 4 | Receipt record created | 1 new record | ⬜ |
| 5 | Photo captured | URL not null, accessible | ⬜ |
| 6 | Camera auto-opened | Not file picker | ⬜ |
| 7 | record_versions INSERT logged | 3 entries (member, payment, schedule) | ⬜ |
| 8 | gym_audit_logs entries | Created | ⬜ |

---

# 🧪 TEST CASE 2: Delete Payment Record (Revert Member State)

## 🎯 Objective
Verify that when we delete the payment record created in TC1:
- **All 3 related records get deleted** (payment, schedule, receipt)
- Member record gets updated (dates reverted)
- History record created in `gym_payment_schedule_history`
- Audit trail created in `record_versions`

## ⚠️ IMPORTANT
This test uses the member created in TC1. The member should **REMAIN** after payment deletion, but with reverted dates.

---

## PHASE 1: PRE-TEST - Capture Current State

### 🔍 Query TC2-PRE1: Capture Member State Before Delete
```sql
SELECT json_build_object(
  'timestamp', NOW(),
  'member_id', id,
  'status', status,
  'membership_end_date', membership_end_date,
  'next_payment_due_date', next_payment_due_date,
  'last_payment_date', last_payment_date,
  'total_payments_received', total_payments_received
) as member_state_before
FROM gym_members 
WHERE id = '[TEST_MEMBER_ID_TC1]';
```

**📌 RECORD:** Store result as `MEMBER_STATE_BEFORE_TC2`

### 🔍 Query TC2-PRE2: Capture All Related Records
```sql
SELECT json_build_object(
  'payment_exists', (SELECT COUNT(*) FROM gym_payments WHERE id = '[TEST_PAYMENT_ID_TC1]'),
  'schedule_count', (SELECT COUNT(*) FROM gym_payment_schedule WHERE member_id = '[TEST_MEMBER_ID_TC1]'),
  'schedule_due_date', (SELECT due_date FROM gym_payment_schedule WHERE member_id = '[TEST_MEMBER_ID_TC1]'),
  'schedule_status', (SELECT status FROM gym_payment_schedule WHERE member_id = '[TEST_MEMBER_ID_TC1]'),
  'receipt_exists', (SELECT COUNT(*) FROM gym_receipts WHERE payment_id = '[TEST_PAYMENT_ID_TC1]'),
  'schedule_history_count', (SELECT COUNT(*) FROM gym_payment_schedule_history WHERE member_id = '[TEST_MEMBER_ID_TC1]')
) as related_records_before;
```

**📌 RECORD:** Store result as `RELATED_RECORDS_BEFORE_TC2`

---

## PHASE 2: UI TEST EXECUTION

### 📍 Step TC2-S1: Navigate to Payment
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1.1 | Go to "Payments" page from navigation | Payments list loads |
| 1.2 | **OR** Go to Member Details > Payments tab | Member's payments shown |
| 1.3 | Find the payment for TEST_MEMBER_ID_TC1 | Payment record visible |

### 📍 Step TC2-S2: Delete Payment
| Step | Action | Expected Result |
|------|--------|-----------------|
| 2.1 | Click on payment record or trash icon | Delete option appears |
| 2.2 | Click "Delete" | Confirmation dialog appears |
| 2.3 | Confirm deletion | Success message appears |

### 📍 Step TC2-S3: Verify UI Update
| Check | Expected |
|-------|----------|
| Payment removed from list | ✓ |
| Member still visible in members list | ✓ (not deleted) |
| Member status | Should reflect updated state |

---

## PHASE 3: POST-TEST - Database Verification

### 🔍 Query TC2-POST1: Verify Payment Deleted
```sql
SELECT COUNT(*) as payment_count 
FROM gym_payments 
WHERE id = '[TEST_PAYMENT_ID_TC1]';
```

**✅ EXPECTED:** `payment_count` = 0

---

### 🔍 Query TC2-POST2: Verify Receipt Deleted (Cascade)
```sql
SELECT COUNT(*) as receipt_count 
FROM gym_receipts 
WHERE payment_id = '[TEST_PAYMENT_ID_TC1]';
```

**✅ EXPECTED:** `receipt_count` = 0

---

### 🔍 Query TC2-POST3: Verify Schedule Updated (NOT Deleted)
```sql
SELECT 
  id,
  due_date,
  status,
  paid_payment_id,
  paid_at
FROM gym_payment_schedule 
WHERE member_id = '[TEST_MEMBER_ID_TC1]';
```

**✅ EXPECTED:**
| Check | Expected Value |
|-------|----------------|
| Record count | **EXACTLY 1** (schedule still exists) |
| `status` | 'pending' or 'overdue' |
| `paid_payment_id` | NULL |
| `paid_at` | NULL |
| `due_date` | Reverted to original/previous date |

---

### 🔍 Query TC2-POST4: Verify Member State Reverted
```sql
SELECT 
  id,
  status,
  membership_end_date,
  next_payment_due_date,
  last_payment_date,
  total_payments_received
FROM gym_members 
WHERE id = '[TEST_MEMBER_ID_TC1]';
```

**✅ EXPECTED:**
| Check | Expected Value |
|-------|----------------|
| `status` | 'active' (if due_date >= today) OR 'inactive' |
| `membership_end_date` | Reverted to earlier date |
| `next_payment_due_date` | Reverted to earlier date |
| `total_payments_received` | Reduced by payment amount |

---

### 🔍 Query TC2-POST5: Verify Schedule History Created (CRITICAL)
```sql
SELECT 
  id,
  member_id,
  schedule_id,
  old_due_date,
  new_due_date,
  old_status,
  new_status,
  change_type,
  payment_id,
  created_at
FROM gym_payment_schedule_history 
WHERE member_id = '[TEST_MEMBER_ID_TC1]'
ORDER BY created_at DESC
LIMIT 1;
```

**✅ EXPECTED:**
| Check | Expected Value |
|-------|----------------|
| Record exists | ✓ NEW record created |
| `change_type` | 'payment_deleted' |
| `payment_id` | = `[TEST_PAYMENT_ID_TC1]` |
| `old_due_date` | Previous due date |
| `new_due_date` | Reverted due date |

---

### 🔍 Query TC2-POST6: Verify Record Versions (DELETE Logged)
```sql
SELECT 
  table_name,
  record_id,
  operation,
  old_data,
  created_at
FROM record_versions 
WHERE record_id = '[TEST_PAYMENT_ID_TC1]'
  AND operation = 'DELETE'
ORDER BY created_at DESC;
```

**✅ EXPECTED:**
| Check | Expected Value |
|-------|----------------|
| Operation | 'DELETE' |
| `table_name` | 'gym_payments' |
| `old_data` | Contains deleted payment data |

---

### 🔍 Query TC2-POST7: Verify Audit Logs
```sql
SELECT 
  event_type,
  action,
  resource_type,
  resource_id,
  created_at
FROM gym_audit_logs 
WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'
  AND resource_id = '[TEST_PAYMENT_ID_TC1]'
  AND action LIKE '%delete%'
ORDER BY created_at DESC;
```

**✅ EXPECTED:** Audit entry for payment deletion

---

## ✅ TEST CASE 2 SUCCESS CRITERIA

| # | Check | Expected | Status |
|---|-------|----------|--------|
| 1 | Payment deleted | 0 records | ⬜ |
| 2 | Receipt cascade deleted | 0 records | ⬜ |
| 3 | Schedule still exists | 1 record (reverted state) | ⬜ |
| 4 | Schedule due_date reverted | Previous date | ⬜ |
| 5 | Schedule history created | 1 new record with change_type='payment_deleted' | ⬜ |
| 6 | Member dates reverted | membership_end_date, next_payment_due_date updated | ⬜ |
| 7 | Member remains in DB | Not deleted | ⬜ |
| 8 | record_versions DELETE logged | Entry exists | ⬜ |
| 9 | gym_audit_logs entry | Delete action logged | ⬜ |

---

# 🧪 TEST CASE 3: Add Payment to Existing Member

## 🎯 Objective
Verify that adding a payment to an existing member:
- Creates **1 new record** in `gym_payments`
- Updates the **single** `gym_payment_schedule` record (extends due_date)
- Creates **1 new record** in `gym_receipts`
- Updates member's `membership_end_date`, `last_payment_date`
- Creates history record in `gym_payment_schedule_history`
- Generates audit logs

---

## PHASE 1: PRE-TEST - Select Existing Member & Capture State

### 🔍 Query TC3-PRE1: Find Existing Active Member with Pending Schedule
```sql
SELECT 
  m.id as member_id,
  m.full_name,
  m.phone,
  m.status,
  m.membership_end_date,
  m.next_payment_due_date,
  m.plan_amount,
  m.total_payments_received,
  s.id as schedule_id,
  s.due_date as schedule_due_date,
  s.status as schedule_status,
  s.amount_due
FROM gym_members m
JOIN gym_payment_schedule s ON s.member_id = m.id
WHERE m.gym_id = 'a0000000-0000-0000-0000-000000000001'
  AND m.status = 'active'
  AND s.status IN ('pending', 'overdue')
ORDER BY m.full_name
LIMIT 1;
```

**📌 RECORD:**
- `EXISTING_MEMBER_ID_TC3` = [member_id]
- `EXISTING_SCHEDULE_ID_TC3` = [schedule_id]
- `BEFORE_DUE_DATE_TC3` = [schedule_due_date]
- `BEFORE_END_DATE_TC3` = [membership_end_date]
- `BEFORE_TOTAL_PAYMENTS_TC3` = [total_payments_received]

### 🔍 Query TC3-PRE2: Capture Counts Before
```sql
SELECT json_build_object(
  'timestamp', NOW(),
  'payments_count', (SELECT COUNT(*) FROM gym_payments WHERE member_id = '[EXISTING_MEMBER_ID_TC3]'),
  'schedule_history_count', (SELECT COUNT(*) FROM gym_payment_schedule_history WHERE member_id = '[EXISTING_MEMBER_ID_TC3]'),
  'receipts_count', (SELECT COUNT(*) FROM gym_receipts WHERE member_id = '[EXISTING_MEMBER_ID_TC3]')
) as counts_before_tc3;
```

**📌 RECORD:** Store as `COUNTS_BEFORE_TC3`

---

## PHASE 2: UI TEST EXECUTION

### 📍 Step TC3-S1: Navigate to Member
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1.1 | Go to "Members" page | Members list loads |
| 1.2 | Find and click on the selected member | Member details page opens |

### 📍 Step TC3-S2: Record Payment
| Step | Action | Expected Result |
|------|--------|-----------------|
| 2.1 | Click "Record Payment" or "Add Payment" button | Payment form/dialog opens |
| 2.2 | Fill payment amount (use plan_amount) | Amount entered |
| 2.3 | Select payment method: `Cash` or `UPI` | Method selected |
| 2.4 | Select payment date: Today | Date selected |
| 2.5 | Click "Save" or "Submit" | Success message appears |

---

## PHASE 3: POST-TEST - Database Verification

### 🔍 Query TC3-POST1: Find New Payment Record
```sql
SELECT 
  id,
  member_id,
  amount,
  payment_method,
  payment_date,
  receipt_number,
  created_at
FROM gym_payments 
WHERE member_id = '[EXISTING_MEMBER_ID_TC3]'
ORDER BY created_at DESC
LIMIT 1;
```

**📌 RECORD:** `NEW_PAYMENT_ID_TC3` = [id]

**✅ EXPECTED:**
| Check | Expected Value |
|-------|----------------|
| New record created | ✓ |
| `payment_date` | = today |
| `receipt_number` | NOT NULL |

---

### 🔍 Query TC3-POST2: Verify Schedule Updated (NOT New Record)
```sql
SELECT 
  id,
  due_date,
  status,
  amount_due,
  paid_payment_id
FROM gym_payment_schedule 
WHERE member_id = '[EXISTING_MEMBER_ID_TC3]';
```

**✅ EXPECTED:**
| Check | Expected Value |
|-------|----------------|
| Record count | **EXACTLY 1** (same schedule, updated) |
| `due_date` | Extended forward (> BEFORE_DUE_DATE_TC3) |
| `status` | 'pending' (for next payment) |

---

### 🔍 Query TC3-POST3: Verify Schedule History Created
```sql
SELECT 
  id,
  old_due_date,
  new_due_date,
  old_status,
  new_status,
  change_type,
  payment_id,
  created_at
FROM gym_payment_schedule_history 
WHERE member_id = '[EXISTING_MEMBER_ID_TC3]'
ORDER BY created_at DESC
LIMIT 1;
```

**✅ EXPECTED:**
| Check | Expected Value |
|-------|----------------|
| New record created | ✓ |
| `change_type` | 'payment_received' or similar |
| `old_due_date` | = `BEFORE_DUE_DATE_TC3` |
| `new_due_date` | Extended date |

---

### 🔍 Query TC3-POST4: Verify Member Updated
```sql
SELECT 
  membership_end_date,
  next_payment_due_date,
  last_payment_date,
  last_payment_amount,
  total_payments_received
FROM gym_members 
WHERE id = '[EXISTING_MEMBER_ID_TC3]';
```

**✅ EXPECTED:**
| Check | Expected Value |
|-------|----------------|
| `membership_end_date` | Extended (> BEFORE_END_DATE_TC3) |
| `next_payment_due_date` | Extended |
| `last_payment_date` | = today |
| `total_payments_received` | > BEFORE_TOTAL_PAYMENTS_TC3 |

---

### 🔍 Query TC3-POST5: Verify Receipt Created
```sql
SELECT 
  id,
  payment_id,
  receipt_number,
  amount
FROM gym_receipts 
WHERE payment_id = '[NEW_PAYMENT_ID_TC3]';
```

**✅ EXPECTED:** 1 new receipt record

---

### 🔍 Query TC3-POST6: Verify Record Versions
```sql
SELECT 
  table_name,
  operation,
  record_id,
  created_at
FROM record_versions 
WHERE record_id = '[NEW_PAYMENT_ID_TC3]'
   OR (record_id = '[EXISTING_MEMBER_ID_TC3]' AND operation = 'UPDATE')
ORDER BY created_at DESC;
```

**✅ EXPECTED:**
- INSERT for gym_payments
- UPDATE for gym_members
- UPDATE for gym_payment_schedule

---

## ✅ TEST CASE 3 SUCCESS CRITERIA

| # | Check | Expected | Status |
|---|-------|----------|--------|
| 1 | New payment created | 1 record | ⬜ |
| 2 | Schedule count unchanged | Still EXACTLY 1 | ⬜ |
| 3 | Schedule due_date extended | New date > old date | ⬜ |
| 4 | Schedule history created | 1 new record | ⬜ |
| 5 | Member dates updated | Extended | ⬜ |
| 6 | Receipt created | 1 record | ⬜ |
| 7 | record_versions logged | INSERT + UPDATE entries | ⬜ |

---

# 🧪 TEST CASE 4: Delete Payment (Revert to Previous State)

## 🎯 Objective
Verify that deleting the payment from TC3:
- Reverts schedule to previous state
- Creates history record for the reversion
- Member dates revert appropriately
- Member stays ACTIVE (if still has pending schedule)

---

## PHASE 1: PRE-TEST - Capture Current State

### 🔍 Query TC4-PRE1: Capture State Before Delete
```sql
SELECT json_build_object(
  'member_end_date', (SELECT membership_end_date FROM gym_members WHERE id = '[EXISTING_MEMBER_ID_TC3]'),
  'member_next_due', (SELECT next_payment_due_date FROM gym_members WHERE id = '[EXISTING_MEMBER_ID_TC3]'),
  'schedule_due_date', (SELECT due_date FROM gym_payment_schedule WHERE member_id = '[EXISTING_MEMBER_ID_TC3]'),
  'schedule_status', (SELECT status FROM gym_payment_schedule WHERE member_id = '[EXISTING_MEMBER_ID_TC3]'),
  'payments_count', (SELECT COUNT(*) FROM gym_payments WHERE member_id = '[EXISTING_MEMBER_ID_TC3]'),
  'history_count', (SELECT COUNT(*) FROM gym_payment_schedule_history WHERE member_id = '[EXISTING_MEMBER_ID_TC3]')
) as state_before_tc4;
```

**📌 RECORD:** Store as `STATE_BEFORE_TC4`

---

## PHASE 2: UI TEST EXECUTION

### 📍 Step TC4-S1: Navigate to Payment
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1.1 | Go to Payments page OR Member Details > Payments | Payments visible |
| 1.2 | Find the payment with ID = `[NEW_PAYMENT_ID_TC3]` | Payment found |

### 📍 Step TC4-S2: Delete Payment
| Step | Action | Expected Result |
|------|--------|-----------------|
| 2.1 | Click delete option (trash icon/menu) | Confirmation dialog |
| 2.2 | Confirm deletion | Success message |
| 2.3 | Verify payment removed from list | ✓ |

---

## PHASE 3: POST-TEST - Database Verification

### 🔍 Query TC4-POST1: Verify Payment Deleted
```sql
SELECT COUNT(*) as count FROM gym_payments WHERE id = '[NEW_PAYMENT_ID_TC3]';
```

**✅ EXPECTED:** count = 0

---

### 🔍 Query TC4-POST2: Verify Schedule Reverted
```sql
SELECT 
  due_date,
  status,
  paid_payment_id
FROM gym_payment_schedule 
WHERE member_id = '[EXISTING_MEMBER_ID_TC3]';
```

**✅ EXPECTED:**
| Check | Expected Value |
|-------|----------------|
| `due_date` | Reverted to `BEFORE_DUE_DATE_TC3` (from TC3-PRE1) |
| `status` | 'pending' or 'overdue' |
| `paid_payment_id` | NULL |

---

### 🔍 Query TC4-POST3: Verify Schedule History for Reversion
```sql
SELECT 
  old_due_date,
  new_due_date,
  change_type,
  payment_id
FROM gym_payment_schedule_history 
WHERE member_id = '[EXISTING_MEMBER_ID_TC3]'
ORDER BY created_at DESC
LIMIT 1;
```

**✅ EXPECTED:**
| Check | Expected Value |
|-------|----------------|
| `change_type` | 'payment_deleted' |
| `payment_id` | = `[NEW_PAYMENT_ID_TC3]` |
| Shows reversion | old_due_date → new_due_date |

---

### 🔍 Query TC4-POST4: Verify Member State
```sql
SELECT 
  status,
  membership_end_date,
  next_payment_due_date
FROM gym_members 
WHERE id = '[EXISTING_MEMBER_ID_TC3]';
```

**✅ EXPECTED:**
| Check | Expected Value |
|-------|----------------|
| `status` | 'active' (if due_date >= today) |
| Dates | Reverted to previous values |

---

### 🔍 Query TC4-POST5: Verify Record Versions
```sql
SELECT 
  table_name,
  operation,
  old_data->>'id' as record_id
FROM record_versions 
WHERE record_id = '[NEW_PAYMENT_ID_TC3]'
  AND operation = 'DELETE';
```

**✅ EXPECTED:** DELETE operation logged

---

## ✅ TEST CASE 4 SUCCESS CRITERIA

| # | Check | Expected | Status |
|---|-------|----------|--------|
| 1 | Payment deleted | 0 records | ⬜ |
| 2 | Schedule reverted | due_date = original | ⬜ |
| 3 | Schedule history created | change_type='payment_deleted' | ⬜ |
| 4 | Member status correct | 'active' if schedule pending | ⬜ |
| 5 | Member dates reverted | Back to previous | ⬜ |
| 6 | record_versions DELETE logged | ✓ | ⬜ |

---

# 🧪 TEST CASE 5: Edit Member - Change Status (Active ↔ Inactive)

## 🎯 Objective
Verify that changing member status:
- Updates `gym_members.status`
- Creates history record in `gym_member_history`
- Logs in `record_versions`
- Audit log created

---

## PHASE 1: PRE-TEST - Find Active Member

### 🔍 Query TC5-PRE1: Select Active Member
```sql
SELECT 
  id,
  full_name,
  phone,
  status,
  (SELECT COUNT(*) FROM gym_member_history WHERE member_id = gym_members.id) as history_count
FROM gym_members 
WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'
  AND status = 'active'
LIMIT 1;
```

**📌 RECORD:**
- `EDIT_MEMBER_ID_TC5` = [id]
- `HISTORY_COUNT_BEFORE_TC5` = [history_count]

---

## PHASE 2: UI TEST EXECUTION - Change to INACTIVE

### 📍 Step TC5-S1: Navigate to Edit Member
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1.1 | Go to Members list | List loads |
| 1.2 | Click on selected member | Member details open |
| 1.3 | Click "Edit" button | Edit form opens |

### 📍 Step TC5-S2: Change Status to Inactive
| Step | Action | Expected Result |
|------|--------|-----------------|
| 2.1 | Find Status field/toggle | Status control visible |
| 2.2 | Change from "Active" to "Inactive" | Status changed |
| 2.3 | Click "Save" | Success message |

---

## PHASE 3: POST-TEST - Verify Status Change to Inactive

### 🔍 Query TC5-POST1: Verify Status Changed
```sql
SELECT status FROM gym_members WHERE id = '[EDIT_MEMBER_ID_TC5]';
```

**✅ EXPECTED:** `status` = 'inactive'

---

### 🔍 Query TC5-POST2: Verify Member History Created
```sql
SELECT 
  id,
  change_type,
  old_value,
  new_value,
  description,
  created_at
FROM gym_member_history 
WHERE member_id = '[EDIT_MEMBER_ID_TC5]'
ORDER BY created_at DESC
LIMIT 1;
```

**✅ EXPECTED:**
| Check | Expected Value |
|-------|----------------|
| New record created | ✓ |
| `change_type` | 'status_change' or similar |
| `old_value` | Contains 'active' |
| `new_value` | Contains 'inactive' |

---

### 🔍 Query TC5-POST3: Verify Record Versions
```sql
SELECT 
  operation,
  old_data->>'status' as old_status,
  new_data->>'status' as new_status,
  changed_fields
FROM record_versions 
WHERE record_id = '[EDIT_MEMBER_ID_TC5]'
  AND table_name = 'gym_members'
ORDER BY created_at DESC
LIMIT 1;
```

**✅ EXPECTED:**
| Check | Expected Value |
|-------|----------------|
| `operation` | 'UPDATE' |
| `old_status` | 'active' |
| `new_status` | 'inactive' |
| `changed_fields` | Contains 'status' |

---

## PHASE 4: REVERT - Change Back to ACTIVE

### 📍 Step TC5-S3: Change Status Back to Active
| Step | Action | Expected Result |
|------|--------|-----------------|
| 3.1 | Edit the same member | Edit form opens |
| 3.2 | Change status to "Active" | Status changed |
| 3.3 | Save | Success message |

### 🔍 Query TC5-POST4: Verify Reverted to Active
```sql
SELECT status FROM gym_members WHERE id = '[EDIT_MEMBER_ID_TC5]';
```

**✅ EXPECTED:** `status` = 'active'

### 🔍 Query TC5-POST5: Verify Another History Record Created
```sql
SELECT COUNT(*) as history_count 
FROM gym_member_history 
WHERE member_id = '[EDIT_MEMBER_ID_TC5]';
```

**✅ EXPECTED:** `history_count` = `HISTORY_COUNT_BEFORE_TC5` + 2 (two changes made)

---

## ✅ TEST CASE 5 SUCCESS CRITERIA

| # | Check | Expected | Status |
|---|-------|----------|--------|
| 1 | Status changed to inactive | ✓ | ⬜ |
| 2 | gym_member_history created | 1 new record | ⬜ |
| 3 | record_versions UPDATE logged | ✓ | ⬜ |
| 4 | Status reverted to active | ✓ | ⬜ |
| 5 | Second history record created | ✓ | ⬜ |
| 6 | UI reflects changes | Badge updates | ⬜ |

---

# 🧪 TEST CASE 6: Add Progress Record (With Photo Capture)

## 🎯 Objective
Verify that adding a progress record:
- Creates **1 record** in `gym_member_progress`
- Uploads progress photo(s) to `images` bucket
- Photo URLs stored correctly
- Camera opens **automatically** (not file picker)
- Audit trail created

---

## PHASE 1: PRE-TEST - Select Member & Capture State

### 🔍 Query TC6-PRE1: Select Active Member
```sql
SELECT 
  id,
  full_name,
  phone
FROM gym_members 
WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'
  AND status = 'active'
LIMIT 1;
```

**📌 RECORD:** `PROGRESS_MEMBER_ID_TC6` = [id]

### 🔍 Query TC6-PRE2: Capture Progress Count Before
```sql
SELECT COUNT(*) as progress_count 
FROM gym_member_progress 
WHERE member_id = '[PROGRESS_MEMBER_ID_TC6]';
```

**📌 RECORD:** `PROGRESS_COUNT_BEFORE_TC6` = [progress_count]

---

## PHASE 2: UI TEST EXECUTION

### 📍 Step TC6-S1: Navigate to Progress
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1.1 | Go to Member Details | Member page loads |
| 1.2 | Find "Progress" tab/section | Progress area visible |
| 1.3 | Click "Add Progress" or "Track Progress" | Progress form opens |

### 📍 Step TC6-S2: Fill Progress Form
| Field | Value |
|-------|-------|
| Weight | `75` (kg) |
| Height | `175` (cm) |
| Chest | `100` (cm) |
| Waist | `85` (cm) |
| Hips | `95` (cm) |
| Notes | `E2E Test Progress Record TC6` |

### 📍 Step TC6-S3: Capture Progress Photo (CRITICAL)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 3.1 | Click on photo capture area | Camera opens **AUTOMATICALLY** |
| 3.2 | Allow camera permission if prompted | Camera preview |
| 3.3 | Capture photo | Photo preview appears |

**⚠️ CRITICAL VERIFICATION:**
- Camera MUST open automatically (NOT file picker)
- If file picker opens, **LOG AS BUG**

### 📍 Step TC6-S4: Submit Progress
| Step | Action | Expected Result |
|------|--------|-----------------|
| 4.1 | Click "Save" or "Submit" | Success message |
| 4.2 | Progress record appears in history | ✓ |

---

## PHASE 3: POST-TEST - Database Verification

### 🔍 Query TC6-POST1: Verify Progress Record Created
```sql
SELECT 
  id,
  member_id,
  record_date,
  weight,
  height,
  chest,
  waist,
  hips,
  notes,
  photo_front_url,
  photo_back_url,
  photo_left_url,
  photo_right_url,
  created_at
FROM gym_member_progress 
WHERE member_id = '[PROGRESS_MEMBER_ID_TC6]'
ORDER BY created_at DESC
LIMIT 1;
```

**📌 RECORD:** `PROGRESS_ID_TC6` = [id]

**✅ EXPECTED:**
| Check | Expected Value |
|-------|----------------|
| New record created | ✓ |
| `record_date` | = today |
| `weight` | = 75 |
| `height` | = 175 |
| `chest` | = 100 |
| `waist` | = 85 |
| `notes` | Contains 'E2E Test Progress Record TC6' |
| At least one photo_url | NOT NULL |

---

### 🔍 Query TC6-POST2: Verify Progress Count Increased
```sql
SELECT COUNT(*) as progress_count 
FROM gym_member_progress 
WHERE member_id = '[PROGRESS_MEMBER_ID_TC6]';
```

**✅ EXPECTED:** `progress_count` = `PROGRESS_COUNT_BEFORE_TC6` + 1

---

### 🔍 Query TC6-POST3: Verify Photo URL Accessible
```sql
SELECT 
  photo_front_url,
  photo_back_url,
  photo_left_url,
  photo_right_url
FROM gym_member_progress 
WHERE id = '[PROGRESS_ID_TC6]';
```

**✅ VERIFICATION:**
For each non-NULL photo URL:
1. URL contains 'images' bucket reference
2. **HTTP GET request returns status 200**

---

### 🔍 Query TC6-POST4: Verify Record Versions
```sql
SELECT 
  table_name,
  operation,
  record_id,
  new_data->>'weight' as weight,
  created_at
FROM record_versions 
WHERE record_id = '[PROGRESS_ID_TC6]'
  AND table_name = 'gym_member_progress';
```

**✅ EXPECTED:**
| Check | Expected Value |
|-------|----------------|
| `operation` | 'INSERT' |
| Record exists | ✓ |

---

## ✅ TEST CASE 6 SUCCESS CRITERIA

| # | Check | Expected | Status |
|---|-------|----------|--------|
| 1 | Progress record created | 1 new record | ⬜ |
| 2 | Measurements stored | Match input values | ⬜ |
| 3 | Photo URL not null | At least 1 photo | ⬜ |
| 4 | Photo accessible | HTTP 200 | ⬜ |
| 5 | Camera auto-opened | Not file picker | ⬜ |
| 6 | record_versions INSERT logged | ✓ | ⬜ |

---

# 📊 FINAL SUMMARY VERIFICATION

## 🔍 Comprehensive State Check Query
Run this after all tests to get complete state:

```sql
SELECT json_build_object(
  'test_run_timestamp', NOW(),
  'gym_members', (SELECT COUNT(*) FROM gym_members WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'),
  'gym_payments', (SELECT COUNT(*) FROM gym_payments WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'),
  'gym_payment_schedule', (SELECT COUNT(*) FROM gym_payment_schedule WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'),
  'gym_payment_schedule_history', (SELECT COUNT(*) FROM gym_payment_schedule_history WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'),
  'gym_member_history', (SELECT COUNT(*) FROM gym_member_history WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'),
  'gym_member_progress', (SELECT COUNT(*) FROM gym_member_progress WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'),
  'gym_receipts', (SELECT COUNT(*) FROM gym_receipts WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'),
  'gym_audit_logs', (SELECT COUNT(*) FROM gym_audit_logs WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'),
  'record_versions_total', (SELECT COUNT(*) FROM record_versions)
) as final_state;
```

---

## 📋 Business Rules Verification Checklist

| # | Rule | How to Verify | Pass/Fail |
|---|------|---------------|-----------|
| 1 | ONE schedule per member | Query: `SELECT member_id, COUNT(*) FROM gym_payment_schedule GROUP BY member_id HAVING COUNT(*) > 1` should return 0 rows | ⬜ |
| 2 | Payment delete reverts state | TC2 & TC4 verify schedule/member dates revert | ⬜ |
| 3 | Schedule history on payment delete | `gym_payment_schedule_history` has records with change_type='payment_deleted' | ⬜ |
| 4 | Cascade delete on member delete | Deleting member removes all related records | ⬜ |
| 5 | Photo auto-capture | Camera opens automatically, not file picker | ⬜ |
| 6 | Complete audit trail | record_versions has INSERT/UPDATE/DELETE for all operations | ⬜ |

---

## 🧹 Test Cleanup Query (Optional)
Run this to clean up test data after testing:

```sql
-- Delete test members created during testing (use with caution)
DELETE FROM gym_members 
WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'
  AND phone LIKE '999901208%';
```

---

## 📝 Notes for AI Agent Execution

### Before Starting Tests
1. Ensure application is running at `http://localhost:5173`
2. Ensure user is logged in to Avengers Gym
3. Ensure Supabase database is accessible
4. Generate unique phone numbers using format: `99990[MMDD][N]`

### During Test Execution
1. **Always capture BEFORE state** before any UI action
2. **Execute SQL queries immediately** after UI actions
3. **Record all IDs** (member_id, payment_id, schedule_id) for later verification
4. **Take screenshots** at critical points for evidence
5. **Log any discrepancies** between expected and actual results

### After Each Test Case
1. Verify all success criteria are met
2. Record pass/fail status
3. Note any unexpected behavior

### Common Issues to Watch For
- Multiple schedule records per member (CRITICAL BUG)
- File picker opening instead of camera
- Missing audit logs
- Incorrect date calculations
- Cascade delete not working

---

# END OF TEST PLAN
