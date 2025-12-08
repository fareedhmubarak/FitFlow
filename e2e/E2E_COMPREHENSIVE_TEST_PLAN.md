# FitFlow Comprehensive End-to-End Test Plan for AI Agents

## Document Purpose
This test plan is designed to be executed by any AI agent. Each test case includes:
- **EXACT database queries** to capture before/after states
- **EXACT UI steps** with element identifiers
- **EXACT expected outcomes** with specific values
- **EXACT verification queries** to validate all affected tables
- **Automatic photo capture verification**
- **Complete audit/history trail verification**

---

## Test Environment Configuration

### Application Details
| Setting | Value |
|---------|-------|
| Application URL | `http://localhost:5173` |
| Test Gym Name | Avengers Gym |
| Gym ID | `a0000000-0000-0000-0000-000000000001` |
| Supabase Project ID | `qvszzwfvkvjxpkkiilyv` |

### Test Phone Numbers (Use Unique for Each Test Run)
```
Format: 99990[MMDD][N] where MMDD is month/day and N is test number
Example for Dec 7: 9999012071, 9999012072, etc.
```

---

## Database Tables Affected by Tests

### Primary Data Tables
| Table | Description | Key Fields |
|-------|-------------|------------|
| `gym_members` | Member master data | id, full_name, phone, status, photo_url, membership_end_date, next_payment_due_date |
| `gym_payments` | Payment transactions | id, member_id, amount, payment_date, receipt_number |
| `gym_payment_schedule` | **SINGLE record per member** - Next payment due | id, member_id, due_date, status, paid_payment_id |
| `gym_member_progress` | Body measurements & progress photos | id, member_id, weight, height, photo_front_url |

### Audit/History Tables
| Table | Description | Triggered By |
|-------|-------------|--------------|
| `record_versions` | All INSERT/UPDATE/DELETE operations | Database triggers on all tables |
| `gym_audit_logs` | Business-level action logs | Application code |
| `gym_member_history` | Member status changes | Application code |
| `gym_payment_schedule_history` | Schedule changes with old/new values | Application code (on payment delete) |
| `gym_receipts` | Receipt records linked to payments | Payment creation |

---

# CRITICAL BUSINESS RULES TO TEST

## Rule 1: One Payment Schedule Record Per Member
- Each member has **EXACTLY 1** record in `gym_payment_schedule`
- This record tracks their **NEXT** payment due date
- When payment is made: due_date is extended forward
- When payment is deleted: due_date is reverted backward

## Rule 2: Three Records Created on New Member
When a new member is added with initial payment:
1. **1 record** in `gym_members`
2. **1 record** in `gym_payments` (initial payment)
3. **1 record** in `gym_payment_schedule` (next due date)

## Rule 3: Cascade Deletion
When member is deleted:
- All `gym_payments` for that member are deleted
- The `gym_payment_schedule` record is deleted
- All `gym_member_progress` records are deleted
- `record_versions` logs the DELETE operations

## Rule 4: Payment Delete Reverts State
When a payment is deleted:
- Member's `membership_end_date` reverts to previous date
- Member's `next_payment_due_date` reverts to previous date
- `gym_payment_schedule.due_date` reverts to previous date
- Member remains ACTIVE if the reverted date >= today

## Rule 5: Photo Auto-Capture
- Camera should automatically open (not file picker)
- Photo URL should be stored in `images` bucket
- URL should be accessible (HTTP 200)

---

# TEST CASE TC-001: Add New Member (Complete Flow)

## Test Objective
Verify that adding a new member creates exactly 3 records (member + payment + schedule), captures photo automatically, and generates all audit logs.

---

## PHASE 1: PRE-TEST DATABASE CAPTURE

### Query TC-001-Q1: Capture Baseline Counts
```sql
-- Run this BEFORE starting the test
-- Save results as BASELINE_TC001
SELECT json_build_object(
  'members_count', (SELECT COUNT(*) FROM gym_members WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'),
  'payments_count', (SELECT COUNT(*) FROM gym_payments WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'),
  'schedules_count', (SELECT COUNT(*) FROM gym_payment_schedule WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'),
  'record_versions_count', (SELECT COUNT(*) FROM record_versions WHERE table_name IN ('gym_members', 'gym_payments', 'gym_payment_schedule')),
  'audit_logs_count', (SELECT COUNT(*) FROM gym_audit_logs WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'),
  'timestamp', NOW()
) as baseline;
```

**STORE RESULT AS:** `BASELINE_TC001`

---

## PHASE 2: UI TEST EXECUTION

### Step TC-001-S1: Navigate to Members Page
| Action | Details |
|--------|---------|
| Click | Bottom navigation → "Members" tab |
| Wait | Members list loads |
| Verify | Page title shows "Members" |

### Step TC-001-S2: Open Add Member Form
| Action | Details |
|--------|---------|
| Click | Floating "+" button (bottom right) |
| Wait | Add Member form/modal opens |
| Verify | Form fields are visible |

### Step TC-001-S3: Fill Member Information
| Field | Value | How to Fill |
|-------|-------|-------------|
| Full Name | `E2E Test Member TC001 [TIMESTAMP]` | Type in text field |
| Phone | `9999012071` (use unique number) | Type in phone field |
| Gender | `Male` | Select from dropdown/radio |
| Membership Plan | Select first available plan | Select from dropdown |
| Payment Method | `Cash` | Select from dropdown |

**RECORD THE FOLLOWING:**
- Plan Name: `[SELECTED_PLAN_NAME]`
- Plan Amount: `[SELECTED_PLAN_AMOUNT]`

### Step TC-001-S4: Photo Capture (CRITICAL)
| Action | Details |
|--------|---------|
| Click | Photo/Camera area in the form |
| **VERIFY** | Camera should open **AUTOMATICALLY** (not file picker) |
| Action | Allow camera permission if prompted |
| Action | Capture photo |
| **VERIFY** | Photo preview appears in the form |

**EXPECTED BEHAVIOR:**
- ✅ Camera opens automatically
- ❌ NOT: File picker dialog

### Step TC-001-S5: Submit Form
| Action | Details |
|--------|---------|
| Click | "Add Member" / "Save" button |
| Wait | Form submits |
| **VERIFY** | Success message/animation appears |
| **VERIFY** | Redirected to Members list or Member details |

---

## PHASE 3: POST-TEST DATABASE VERIFICATION

### Query TC-001-Q2: Find Created Member
```sql
-- Find the newly created member
SELECT 
  id,
  full_name,
  phone,
  status,
  photo_url,
  joining_date,
  membership_end_date,
  next_payment_due_date,
  plan_amount,
  membership_plan,
  created_at
FROM gym_members 
WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'
  AND phone = '9999012071'
ORDER BY created_at DESC 
LIMIT 1;
```

**STORE RESULT AS:** `CREATED_MEMBER`
**STORE `id` AS:** `TEST_MEMBER_ID_TC001`

**EXPECTED:**
| Field | Expected Value |
|-------|----------------|
| status | `'active'` |
| photo_url | NOT NULL, contains 'images' bucket URL |
| membership_end_date | Future date (joining_date + plan duration) |
| next_payment_due_date | Same as or close to membership_end_date |

### Query TC-001-Q3: Verify Payment Record Created
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
WHERE member_id = '[TEST_MEMBER_ID_TC001]';
```

**EXPECTED:**
| Check | Expected |
|-------|----------|
| Record count | EXACTLY 1 |
| amount | Equals `[SELECTED_PLAN_AMOUNT]` |
| payment_method | `'cash'` |
| payment_date | Today's date |
| receipt_number | NOT NULL, format like `RCP-YYYY-NNNNN` |

**STORE `id` AS:** `TEST_PAYMENT_ID_TC001`

### Query TC-001-Q4: Verify Payment Schedule Record (CRITICAL - Only 1 Record!)
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
WHERE member_id = '[TEST_MEMBER_ID_TC001]';
```

**EXPECTED:**
| Check | Expected |
|-------|----------|
| **Record count** | **EXACTLY 1** (Critical!) |
| due_date | Future date (next payment due) |
| status | `'pending'` |
| amount_due | Equals plan amount |

**STORE `id` AS:** `TEST_SCHEDULE_ID_TC001`

### Query TC-001-Q5: Verify Photo URL is Accessible
```sql
SELECT photo_url FROM gym_members WHERE id = '[TEST_MEMBER_ID_TC001]';
```

**VERIFICATION:**
1. Get the `photo_url` value
2. Make HTTP GET request to the URL
3. **EXPECTED:** Response status = 200

### Query TC-001-Q6: Verify Record Versions (Audit Trail)
```sql
SELECT 
  table_name,
  record_id,
  operation,
  new_data->>'full_name' as member_name,
  created_at
FROM record_versions 
WHERE record_id = '[TEST_MEMBER_ID_TC001]'
   OR record_id = '[TEST_PAYMENT_ID_TC001]'
   OR record_id = '[TEST_SCHEDULE_ID_TC001]'
ORDER BY created_at DESC;
```

**EXPECTED:**
| table_name | operation |
|------------|-----------|
| gym_members | INSERT |
| gym_payments | INSERT |
| gym_payment_schedule | INSERT |

### Query TC-001-Q7: Verify Audit Logs
```sql
SELECT 
  event_category,
  action,
  resource_type,
  resource_id,
  created_at
FROM gym_audit_logs 
WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'
  AND (resource_id = '[TEST_MEMBER_ID_TC001]' OR resource_id = '[TEST_PAYMENT_ID_TC001]')
ORDER BY created_at DESC;
```

**EXPECTED:** Entries for member_created, payment_created

### Query TC-001-Q8: Verify Final Counts Match
```sql
-- Compare with BASELINE_TC001
SELECT json_build_object(
  'members_count', (SELECT COUNT(*) FROM gym_members WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'),
  'payments_count', (SELECT COUNT(*) FROM gym_payments WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'),
  'schedules_count', (SELECT COUNT(*) FROM gym_payment_schedule WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'),
  'timestamp', NOW()
) as final_counts;
```

**EXPECTED DIFFERENCES FROM BASELINE_TC001:**
| Table | Change |
|-------|--------|
| members_count | +1 |
| payments_count | +1 |
| schedules_count | +1 |

---

## TC-001 SUCCESS CRITERIA CHECKLIST

| # | Check | Expected | Actual | Pass/Fail |
|---|-------|----------|--------|-----------|
| 1 | Member record created | 1 new record | | |
| 2 | Member status | 'active' | | |
| 3 | Member photo_url | NOT NULL | | |
| 4 | Photo URL accessible | HTTP 200 | | |
| 5 | Payment record created | 1 new record | | |
| 6 | Payment amount matches plan | Equal | | |
| 7 | Receipt number generated | NOT NULL | | |
| 8 | Schedule record created | EXACTLY 1 | | |
| 9 | Schedule status | 'pending' | | |
| 10 | record_versions INSERT logged | 3 records | | |
| 11 | Camera opened automatically | Yes | | |

---

# TEST CASE TC-002: Delete Payment Record (Revert Member State)

## Test Objective
Verify that deleting a payment record:
1. Removes the payment from `gym_payments`
2. Reverts `gym_payment_schedule` due_date to previous value
3. Creates history record in `gym_payment_schedule_history`
4. Reverts `gym_members` membership_end_date
5. Member stays ACTIVE if reverted date >= today

## Prerequisites
- **TEST_MEMBER_ID_TC001** must exist from TC-001
- **TEST_PAYMENT_ID_TC001** must exist from TC-001

---

## PHASE 1: PRE-TEST DATABASE CAPTURE

### Query TC-002-Q1: Capture Before Delete State
```sql
-- Save the complete state before deletion
SELECT json_build_object(
  'member', (
    SELECT json_build_object(
      'id', id,
      'status', status,
      'membership_end_date', membership_end_date,
      'next_payment_due_date', next_payment_due_date,
      'total_payments_received', total_payments_received,
      'last_payment_date', last_payment_date
    )
    FROM gym_members WHERE id = '[TEST_MEMBER_ID_TC001]'
  ),
  'payment', (
    SELECT json_build_object(
      'id', id,
      'amount', amount,
      'payment_date', payment_date
    )
    FROM gym_payments WHERE id = '[TEST_PAYMENT_ID_TC001]'
  ),
  'schedule', (
    SELECT json_build_object(
      'id', id,
      'due_date', due_date,
      'status', status,
      'paid_payment_id', paid_payment_id
    )
    FROM gym_payment_schedule WHERE member_id = '[TEST_MEMBER_ID_TC001]'
  ),
  'payments_count', (SELECT COUNT(*) FROM gym_payments WHERE member_id = '[TEST_MEMBER_ID_TC001]'),
  'schedule_history_count', (SELECT COUNT(*) FROM gym_payment_schedule_history WHERE member_id = '[TEST_MEMBER_ID_TC001]'),
  'timestamp', NOW()
) as before_delete_state;
```

**STORE RESULT AS:** `BEFORE_DELETE_TC002`

---

## PHASE 2: UI TEST EXECUTION

### Step TC-002-S1: Navigate to Payment
| Action | Details |
|--------|---------|
| Option A | Go to Payments page → Find the payment |
| Option B | Go to Member Details → Payments tab → Find payment |
| Identify | Payment with ID `[TEST_PAYMENT_ID_TC001]` or matching amount/date |

### Step TC-002-S2: Delete Payment
| Action | Details |
|--------|---------|
| Click | Delete button/icon (trash icon or menu option) |
| Wait | Confirmation dialog appears |
| **VERIFY** | Dialog shows payment details |
| Click | Confirm delete |
| Wait | Deletion completes |
| **VERIFY** | Success message appears |
| **VERIFY** | Payment no longer in list |

---

## PHASE 3: POST-TEST DATABASE VERIFICATION

### Query TC-002-Q2: Verify Payment Deleted
```sql
SELECT COUNT(*) as payment_exists
FROM gym_payments 
WHERE id = '[TEST_PAYMENT_ID_TC001]';
```

**EXPECTED:** `payment_exists = 0`

### Query TC-002-Q3: Verify Member State Reverted
```sql
SELECT 
  id,
  status,
  membership_end_date,
  next_payment_due_date,
  total_payments_received,
  last_payment_date
FROM gym_members 
WHERE id = '[TEST_MEMBER_ID_TC001]';
```

**EXPECTED:**
| Field | Expected |
|-------|----------|
| status | `'active'` (if joining_date >= today, else 'inactive') |
| membership_end_date | Reverted to joining_date (initial state) |
| next_payment_due_date | Reverted to joining_date |
| total_payments_received | 0 (decreased by payment amount) |

### Query TC-002-Q4: Verify Schedule Record Updated (Still 1 Record!)
```sql
SELECT 
  id,
  due_date,
  status,
  paid_payment_id,
  paid_at,
  updated_at
FROM gym_payment_schedule 
WHERE member_id = '[TEST_MEMBER_ID_TC001]';
```

**EXPECTED:**
| Check | Expected |
|-------|----------|
| **Record count** | **STILL EXACTLY 1** (No new records!) |
| due_date | Reverted to member's joining_date |
| status | `'pending'` or `'overdue'` |
| paid_payment_id | NULL |
| paid_at | NULL |

### Query TC-002-Q5: Verify Schedule History Created (CRITICAL)
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
WHERE member_id = '[TEST_MEMBER_ID_TC001]'
ORDER BY created_at DESC
LIMIT 1;
```

**EXPECTED:**
| Field | Expected Value |
|-------|----------------|
| change_type | `'payment_deleted'` |
| payment_id | `[TEST_PAYMENT_ID_TC001]` |
| old_due_date | The future due date (before deletion) |
| new_due_date | The reverted date (joining_date) |
| new_status | `'pending'` or `'overdue'` |

### Query TC-002-Q6: Verify Record Versions (DELETE Logged)
```sql
SELECT 
  table_name,
  record_id,
  operation,
  old_data->>'amount' as deleted_amount,
  created_at
FROM record_versions 
WHERE record_id = '[TEST_PAYMENT_ID_TC001]'
  AND operation = 'DELETE'
ORDER BY created_at DESC
LIMIT 1;
```

**EXPECTED:**
| Field | Expected |
|-------|----------|
| table_name | `'gym_payments'` |
| operation | `'DELETE'` |
| deleted_amount | The payment amount that was deleted |

### Query TC-002-Q7: Verify UPDATE Logged for Schedule Revert
```sql
SELECT 
  table_name,
  record_id,
  operation,
  old_data->>'due_date' as old_due_date,
  new_data->>'due_date' as new_due_date,
  changed_fields,
  created_at
FROM record_versions 
WHERE table_name = 'gym_payment_schedule'
  AND record_id = '[TEST_SCHEDULE_ID_TC001]'
ORDER BY created_at DESC
LIMIT 1;
```

**EXPECTED:**
| Field | Expected |
|-------|----------|
| operation | `'UPDATE'` |
| Shows | due_date changed from future to reverted date |

---

## TC-002 SUCCESS CRITERIA CHECKLIST

| # | Check | Expected | Actual | Pass/Fail |
|---|-------|----------|--------|-----------|
| 1 | Payment record deleted | 0 records | | |
| 2 | Member status unchanged | 'active' | | |
| 3 | Member dates reverted | To joining_date | | |
| 4 | Schedule record count | Still 1 | | |
| 5 | Schedule due_date reverted | To joining_date | | |
| 6 | Schedule history created | 1 new record | | |
| 7 | History change_type | 'payment_deleted' | | |
| 8 | record_versions DELETE | Logged | | |
| 9 | record_versions UPDATE | Logged for schedule | | |

---

# TEST CASE TC-003: Delete Member (Cascade Delete All Records)

## Test Objective
Verify that deleting a member cascades and removes ALL related records:
1. Member record from `gym_members`
2. All payment records from `gym_payments`
3. Payment schedule record from `gym_payment_schedule`
4. All DELETE operations logged in `record_versions`

## Prerequisites
- **TEST_MEMBER_ID_TC001** must exist (recreate member if needed)

---

## PHASE 1: PRE-TEST DATABASE CAPTURE

### Query TC-003-Q1: Capture Before Delete State
```sql
SELECT json_build_object(
  'member_exists', (SELECT COUNT(*) FROM gym_members WHERE id = '[TEST_MEMBER_ID_TC001]'),
  'payments_count', (SELECT COUNT(*) FROM gym_payments WHERE member_id = '[TEST_MEMBER_ID_TC001]'),
  'schedules_count', (SELECT COUNT(*) FROM gym_payment_schedule WHERE member_id = '[TEST_MEMBER_ID_TC001]'),
  'progress_count', (SELECT COUNT(*) FROM gym_member_progress WHERE member_id = '[TEST_MEMBER_ID_TC001]'),
  'record_versions_before', (SELECT COUNT(*) FROM record_versions WHERE record_id = '[TEST_MEMBER_ID_TC001]'),
  'timestamp', NOW()
) as before_member_delete;
```

**STORE RESULT AS:** `BEFORE_DELETE_TC003`
**EXPECTED:** member_exists = 1

---

## PHASE 2: UI TEST EXECUTION

### Step TC-003-S1: Navigate to Member
| Action | Details |
|--------|---------|
| Go to | Members page |
| Find | Member with phone `9999012071` |
| Click | On member row to open details |

### Step TC-003-S2: Delete Member
| Action | Details |
|--------|---------|
| Click | Delete option (trash icon, menu, or button) |
| Wait | Confirmation dialog appears |
| **VERIFY** | Dialog warns about permanent deletion |
| Click | Confirm delete |
| Wait | Deletion completes |
| **VERIFY** | Success message appears |
| **VERIFY** | Redirected to Members list |
| **VERIFY** | Member no longer appears in list |

---

## PHASE 3: POST-TEST DATABASE VERIFICATION

### Query TC-003-Q2: Verify Member Deleted
```sql
SELECT COUNT(*) as member_count
FROM gym_members 
WHERE id = '[TEST_MEMBER_ID_TC001]';
```

**EXPECTED:** `member_count = 0`

### Query TC-003-Q3: Verify Payments Cascade Deleted
```sql
SELECT COUNT(*) as payments_count
FROM gym_payments 
WHERE member_id = '[TEST_MEMBER_ID_TC001]';
```

**EXPECTED:** `payments_count = 0`

### Query TC-003-Q4: Verify Schedule Cascade Deleted
```sql
SELECT COUNT(*) as schedules_count
FROM gym_payment_schedule 
WHERE member_id = '[TEST_MEMBER_ID_TC001]';
```

**EXPECTED:** `schedules_count = 0`

### Query TC-003-Q5: Verify Record Versions (DELETE Operations Logged)
```sql
SELECT 
  table_name,
  record_id,
  operation,
  old_data->>'full_name' as deleted_name,
  created_at
FROM record_versions 
WHERE record_id = '[TEST_MEMBER_ID_TC001]'
  AND operation = 'DELETE'
ORDER BY created_at DESC;
```

**EXPECTED:**
- At least 1 DELETE record for `gym_members`

### Query TC-003-Q6: Comprehensive Cascade Verification
```sql
-- Verify no orphan records exist
SELECT 
  'gym_payments' as table_name, 
  COUNT(*) as orphan_count 
FROM gym_payments 
WHERE member_id = '[TEST_MEMBER_ID_TC001]'
UNION ALL
SELECT 'gym_payment_schedule', COUNT(*) 
FROM gym_payment_schedule 
WHERE member_id = '[TEST_MEMBER_ID_TC001]'
UNION ALL
SELECT 'gym_member_progress', COUNT(*) 
FROM gym_member_progress 
WHERE member_id = '[TEST_MEMBER_ID_TC001]'
UNION ALL
SELECT 'gym_receipts', COUNT(*) 
FROM gym_receipts 
WHERE member_id = '[TEST_MEMBER_ID_TC001]';
```

**EXPECTED:** All orphan_count = 0

---

## TC-003 SUCCESS CRITERIA CHECKLIST

| # | Check | Expected | Actual | Pass/Fail |
|---|-------|----------|--------|-----------|
| 1 | Member deleted | 0 records | | |
| 2 | Payments cascade deleted | 0 records | | |
| 3 | Schedule cascade deleted | 0 records | | |
| 4 | Progress cascade deleted | 0 records | | |
| 5 | Receipts cascade deleted | 0 records | | |
| 6 | DELETE logged in record_versions | Yes | | |

---

# TEST CASE TC-004: Add Payment to Existing Member

## Test Objective
Verify that adding a payment to an existing member:
1. Creates 1 new record in `gym_payments`
2. Updates (NOT creates new) the `gym_payment_schedule` record
3. Extends `membership_end_date` and `next_payment_due_date`
4. Updates member's payment tracking fields
5. Schedule count remains at 1

## Prerequisites
- Need an existing active member with pending schedule
- If no test member exists, first run TC-001 (Add New Member)

---

## PHASE 1: PRE-TEST SETUP & DATABASE CAPTURE

### Query TC-004-Q1: Find Existing Member for Test
```sql
-- Find an active member with pending schedule
SELECT 
  m.id as member_id,
  m.full_name,
  m.phone,
  m.status,
  m.membership_end_date,
  m.next_payment_due_date,
  m.plan_amount,
  m.membership_plan,
  s.id as schedule_id,
  s.due_date as schedule_due_date,
  s.status as schedule_status,
  s.amount_due
FROM gym_members m
JOIN gym_payment_schedule s ON s.member_id = m.id
WHERE m.gym_id = 'a0000000-0000-0000-0000-000000000001'
  AND m.status = 'active'
ORDER BY m.created_at DESC
LIMIT 1;
```

**STORE:**
- `EXISTING_MEMBER_ID_TC004`
- `EXISTING_SCHEDULE_ID_TC004`
- `PLAN_AMOUNT_TC004`

### Query TC-004-Q2: Capture Complete Before State
```sql
SELECT json_build_object(
  'member', (
    SELECT json_build_object(
      'id', id,
      'full_name', full_name,
      'status', status,
      'membership_end_date', membership_end_date,
      'next_payment_due_date', next_payment_due_date,
      'last_payment_date', last_payment_date,
      'last_payment_amount', last_payment_amount,
      'total_payments_received', total_payments_received,
      'plan_amount', plan_amount
    )
    FROM gym_members WHERE id = '[EXISTING_MEMBER_ID_TC004]'
  ),
  'schedule', (
    SELECT json_build_object(
      'id', id,
      'due_date', due_date,
      'status', status,
      'amount_due', amount_due,
      'paid_payment_id', paid_payment_id
    )
    FROM gym_payment_schedule WHERE member_id = '[EXISTING_MEMBER_ID_TC004]'
  ),
  'payments_count', (SELECT COUNT(*) FROM gym_payments WHERE member_id = '[EXISTING_MEMBER_ID_TC004]'),
  'schedules_count', (SELECT COUNT(*) FROM gym_payment_schedule WHERE member_id = '[EXISTING_MEMBER_ID_TC004]'),
  'schedule_history_count', (SELECT COUNT(*) FROM gym_payment_schedule_history WHERE member_id = '[EXISTING_MEMBER_ID_TC004]'),
  'timestamp', NOW()
) as before_payment_state;
```

**STORE RESULT AS:** `BEFORE_PAYMENT_TC004`
**CRITICAL:** Note `schedules_count` - should be 1

---

## PHASE 2: UI TEST EXECUTION

### Step TC-004-S1: Navigate to Member
| Action | Details |
|--------|---------|
| Go to | Members page |
| Find | Member `[EXISTING_MEMBER_ID_TC004]` |
| Click | On member to open details |

### Step TC-004-S2: Open Payment Form
| Action | Details |
|--------|---------|
| Click | "Record Payment" or "Add Payment" button |
| Wait | Payment dialog/form opens |
| **VERIFY** | Form shows member name |
| **VERIFY** | Amount field pre-filled or editable |

### Step TC-004-S3: Fill Payment Details
| Field | Value |
|-------|-------|
| Amount | `[PLAN_AMOUNT_TC004]` (use plan amount) |
| Payment Method | `UPI` |
| Payment Date | Today's date |

### Step TC-004-S4: Submit Payment
| Action | Details |
|--------|---------|
| Click | Submit/Save button |
| Wait | Form submits |
| **VERIFY** | Success message appears |
| **VERIFY** | Payment appears in member's payment history |

---

## PHASE 3: POST-TEST DATABASE VERIFICATION

### Query TC-004-Q3: Find New Payment Record
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
WHERE member_id = '[EXISTING_MEMBER_ID_TC004]'
ORDER BY created_at DESC
LIMIT 1;
```

**STORE `id` AS:** `NEW_PAYMENT_ID_TC004`

**EXPECTED:**
| Field | Expected |
|-------|----------|
| amount | `[PLAN_AMOUNT_TC004]` |
| payment_method | `'upi'` |
| payment_date | Today's date |
| receipt_number | NOT NULL |

### Query TC-004-Q4: Verify Schedule Count (CRITICAL - Still 1!)
```sql
SELECT COUNT(*) as schedule_count
FROM gym_payment_schedule 
WHERE member_id = '[EXISTING_MEMBER_ID_TC004]';
```

**EXPECTED:** `schedule_count = 1` (NOT 2 or more!)

### Query TC-004-Q5: Verify Schedule Updated
```sql
SELECT 
  id,
  due_date,
  status,
  amount_due,
  paid_payment_id,
  paid_at,
  updated_at
FROM gym_payment_schedule 
WHERE member_id = '[EXISTING_MEMBER_ID_TC004]';
```

**EXPECTED:**
| Field | Expected |
|-------|----------|
| due_date | Extended forward by plan duration |
| status | `'pending'` (for NEXT payment) |

**COMPARE:** `due_date` should be greater than `BEFORE_PAYMENT_TC004.schedule.due_date`

### Query TC-004-Q6: Verify Member Updated
```sql
SELECT 
  status,
  membership_end_date,
  next_payment_due_date,
  last_payment_date,
  last_payment_amount,
  total_payments_received
FROM gym_members 
WHERE id = '[EXISTING_MEMBER_ID_TC004]';
```

**EXPECTED:**
| Field | Expected |
|-------|----------|
| status | `'active'` |
| membership_end_date | Extended forward |
| next_payment_due_date | Extended forward |
| last_payment_date | Today's date |
| last_payment_amount | `[PLAN_AMOUNT_TC004]` |
| total_payments_received | BEFORE value + payment amount |

### Query TC-004-Q7: Verify Record Versions
```sql
SELECT 
  table_name,
  record_id,
  operation,
  changed_fields,
  created_at
FROM record_versions 
WHERE (record_id = '[NEW_PAYMENT_ID_TC004]' OR record_id = '[EXISTING_MEMBER_ID_TC004]')
  AND created_at > '[BEFORE_PAYMENT_TC004.timestamp]'
ORDER BY created_at DESC;
```

**EXPECTED:**
| table_name | operation |
|------------|-----------|
| gym_payments | INSERT |
| gym_members | UPDATE |
| gym_payment_schedule | UPDATE (or INSERT if first payment) |

### Query TC-004-Q8: Verify Audit Logs
```sql
SELECT 
  action,
  resource_type,
  resource_id,
  new_values,
  created_at
FROM gym_audit_logs 
WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'
  AND action = 'payment_created'
ORDER BY created_at DESC
LIMIT 1;
```

**EXPECTED:** payment_created action logged

---

## TC-004 SUCCESS CRITERIA CHECKLIST

| # | Check | Expected | Actual | Pass/Fail |
|---|-------|----------|--------|-----------|
| 1 | New payment created | 1 new record | | |
| 2 | Payment amount correct | Matches plan | | |
| 3 | Receipt generated | NOT NULL | | |
| 4 | **Schedule count unchanged** | **Still 1** | | |
| 5 | Schedule due_date extended | Greater than before | | |
| 6 | Member status | 'active' | | |
| 7 | Member dates extended | Greater than before | | |
| 8 | record_versions logged | INSERT + UPDATE | | |
| 9 | Audit log created | payment_created | | |

---

# TEST CASE TC-005: Edit Member - Status Change (Active ↔ Inactive)

## Test Objective
Verify that changing member status:
1. Updates `gym_members.status` correctly
2. Creates history record in `gym_member_history`
3. Logs UPDATE in `record_versions`
4. UI reflects the change immediately

---

## PHASE 1: PRE-TEST DATABASE CAPTURE

### Query TC-005-Q1: Find Active Member to Edit
```sql
SELECT 
  id,
  full_name,
  phone,
  status
FROM gym_members 
WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'
  AND status = 'active'
LIMIT 1;
```

**STORE `id` AS:** `EDIT_MEMBER_ID_TC005`

### Query TC-005-Q2: Capture Before State
```sql
SELECT json_build_object(
  'member_status', (SELECT status FROM gym_members WHERE id = '[EDIT_MEMBER_ID_TC005]'),
  'member_history_count', (SELECT COUNT(*) FROM gym_member_history WHERE member_id = '[EDIT_MEMBER_ID_TC005]'),
  'record_versions_count', (SELECT COUNT(*) FROM record_versions WHERE record_id = '[EDIT_MEMBER_ID_TC005]'),
  'timestamp', NOW()
) as before_edit_state;
```

**STORE RESULT AS:** `BEFORE_EDIT_TC005`

---

## PHASE 2: UI TEST EXECUTION - Part A (Active → Inactive)

### Step TC-005-S1: Navigate to Edit Member
| Action | Details |
|--------|---------|
| Go to | Members page |
| Find | Member `[EDIT_MEMBER_ID_TC005]` |
| Click | On member to open details |
| Click | "Edit" button |
| Wait | Edit form opens |

### Step TC-005-S2: Change Status to Inactive
| Action | Details |
|--------|---------|
| Find | Status field/toggle |
| Change | From "Active" to "Inactive" |
| Click | Save/Update button |
| Wait | Form submits |
| **VERIFY** | Success message appears |
| **VERIFY** | Status badge shows "Inactive" |

---

## PHASE 3: POST-TEST VERIFICATION (After Active → Inactive)

### Query TC-005-Q3: Verify Status Changed to Inactive
```sql
SELECT status FROM gym_members WHERE id = '[EDIT_MEMBER_ID_TC005]';
```

**EXPECTED:** `status = 'inactive'`

### Query TC-005-Q4: Verify Member History Created
```sql
SELECT 
  id,
  change_type,
  old_value,
  new_value,
  description,
  created_at
FROM gym_member_history 
WHERE member_id = '[EDIT_MEMBER_ID_TC005]'
ORDER BY created_at DESC
LIMIT 1;
```

**EXPECTED:**
| Field | Expected |
|-------|----------|
| change_type | Contains 'status' |
| old_value | Contains 'active' |
| new_value | Contains 'inactive' |

### Query TC-005-Q5: Verify Record Versions
```sql
SELECT 
  operation,
  old_data->>'status' as old_status,
  new_data->>'status' as new_status,
  changed_fields,
  created_at
FROM record_versions 
WHERE record_id = '[EDIT_MEMBER_ID_TC005]'
  AND table_name = 'gym_members'
ORDER BY created_at DESC
LIMIT 1;
```

**EXPECTED:**
| Field | Expected |
|-------|----------|
| operation | `'UPDATE'` |
| old_status | `'active'` |
| new_status | `'inactive'` |
| changed_fields | Contains 'status' |

---

## PHASE 4: UI TEST EXECUTION - Part B (Inactive → Active)

### Step TC-005-S3: Change Status Back to Active
| Action | Details |
|--------|---------|
| Click | Edit button (if not already in edit mode) |
| Find | Status field/toggle |
| Change | From "Inactive" to "Active" |
| Click | Save/Update button |
| **VERIFY** | Success message appears |
| **VERIFY** | Status badge shows "Active" |

### Query TC-005-Q6: Verify Status Reverted to Active
```sql
SELECT status FROM gym_members WHERE id = '[EDIT_MEMBER_ID_TC005]';
```

**EXPECTED:** `status = 'active'`

### Query TC-005-Q7: Verify Second History Record
```sql
SELECT COUNT(*) as history_count
FROM gym_member_history 
WHERE member_id = '[EDIT_MEMBER_ID_TC005]'
  AND created_at > '[BEFORE_EDIT_TC005.timestamp]';
```

**EXPECTED:** `history_count = 2` (one for each status change)

---

## TC-005 SUCCESS CRITERIA CHECKLIST

| # | Check | Expected | Actual | Pass/Fail |
|---|-------|----------|--------|-----------|
| 1 | Status changed to inactive | 'inactive' | | |
| 2 | History record created (A→I) | Yes | | |
| 3 | record_versions UPDATE logged | Yes | | |
| 4 | Status changed back to active | 'active' | | |
| 5 | History record created (I→A) | Yes | | |
| 6 | Total history records | 2 new | | |

---

# TEST CASE TC-006: Add Progress Record (With Photo Capture)

## Test Objective
Verify that adding a progress record:
1. Creates 1 record in `gym_member_progress`
2. **Camera opens automatically** for photo capture
3. Photo uploaded to `images` bucket
4. Photo URL stored and accessible
5. INSERT logged in `record_versions`

---

## PHASE 1: PRE-TEST DATABASE CAPTURE

### Query TC-006-Q1: Find Active Member for Progress
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

**STORE `id` AS:** `PROGRESS_MEMBER_ID_TC006`

### Query TC-006-Q2: Capture Before State
```sql
SELECT json_build_object(
  'progress_count', (SELECT COUNT(*) FROM gym_member_progress WHERE member_id = '[PROGRESS_MEMBER_ID_TC006]'),
  'record_versions_progress', (SELECT COUNT(*) FROM record_versions WHERE table_name = 'gym_member_progress'),
  'timestamp', NOW()
) as before_progress_state;
```

**STORE RESULT AS:** `BEFORE_PROGRESS_TC006`

---

## PHASE 2: UI TEST EXECUTION

### Step TC-006-S1: Navigate to Progress Section
| Action | Details |
|--------|---------|
| Go to | Member details page for `[PROGRESS_MEMBER_ID_TC006]` |
| Find | "Progress" tab or section |
| Click | On Progress tab |
| **VERIFY** | Progress section/page loads |

### Step TC-006-S2: Open Add Progress Form
| Action | Details |
|--------|---------|
| Click | "Add Progress" or "Track Progress" button |
| Wait | Progress form opens |
| **VERIFY** | Form shows measurement fields |

### Step TC-006-S3: Fill Measurements
| Field | Value |
|-------|-------|
| Weight | `75` |
| Height | `175` |
| Chest | `100` |
| Waist | `85` |
| Hips | `95` |
| Biceps | `35` |
| Thighs | `55` |
| Notes | `E2E Test Progress Record TC006 [TIMESTAMP]` |

### Step TC-006-S4: Photo Capture (CRITICAL)
| Action | Details |
|--------|---------|
| Click | Photo capture area (Front view) |
| **VERIFY** | **Camera opens AUTOMATICALLY** |
| Action | Allow camera permission if prompted |
| Action | Capture photo |
| **VERIFY** | Photo preview appears |

**EXPECTED BEHAVIOR:**
- ✅ Camera opens automatically
- ❌ NOT: File picker dialog

### Step TC-006-S5: Submit Progress
| Action | Details |
|--------|---------|
| Click | Save/Submit button |
| Wait | Form submits |
| **VERIFY** | Success message appears |
| **VERIFY** | Progress record appears in history |

---

## PHASE 3: POST-TEST DATABASE VERIFICATION

### Query TC-006-Q3: Find New Progress Record
```sql
SELECT 
  id,
  member_id,
  record_date,
  weight,
  height,
  bmi,
  chest,
  waist,
  hips,
  biceps,
  thighs,
  photo_front_url,
  photo_back_url,
  photo_left_url,
  photo_right_url,
  notes,
  created_at
FROM gym_member_progress 
WHERE member_id = '[PROGRESS_MEMBER_ID_TC006]'
ORDER BY created_at DESC
LIMIT 1;
```

**STORE `id` AS:** `NEW_PROGRESS_ID_TC006`

**EXPECTED:**
| Field | Expected |
|-------|----------|
| record_date | Today's date |
| weight | `75` |
| height | `175` |
| chest | `100` |
| waist | `85` |
| photo_front_url | NOT NULL (contains image URL) |
| notes | Contains `'E2E Test Progress Record TC006'` |

### Query TC-006-Q4: Verify Progress Count Increased
```sql
SELECT COUNT(*) as progress_count
FROM gym_member_progress 
WHERE member_id = '[PROGRESS_MEMBER_ID_TC006]';
```

**EXPECTED:** `progress_count = BEFORE_PROGRESS_TC006.progress_count + 1`

### Query TC-006-Q5: Verify Photo URL is Accessible
```sql
SELECT photo_front_url 
FROM gym_member_progress 
WHERE id = '[NEW_PROGRESS_ID_TC006]';
```

**VERIFICATION:**
1. Get the `photo_front_url` value
2. Make HTTP GET request to the URL
3. **EXPECTED:** Response status = 200

### Query TC-006-Q6: Verify Record Versions
```sql
SELECT 
  table_name,
  record_id,
  operation,
  new_data->>'weight' as recorded_weight,
  created_at
FROM record_versions 
WHERE record_id = '[NEW_PROGRESS_ID_TC006]'
  AND table_name = 'gym_member_progress'
ORDER BY created_at DESC
LIMIT 1;
```

**EXPECTED:**
| Field | Expected |
|-------|----------|
| operation | `'INSERT'` |
| recorded_weight | `'75'` |

---

## TC-006 SUCCESS CRITERIA CHECKLIST

| # | Check | Expected | Actual | Pass/Fail |
|---|-------|----------|--------|-----------|
| 1 | Progress record created | 1 new record | | |
| 2 | Record date correct | Today | | |
| 3 | Measurements stored | All values match | | |
| 4 | Camera opened automatically | Yes | | |
| 5 | Photo URL not null | NOT NULL | | |
| 6 | Photo URL accessible | HTTP 200 | | |
| 7 | Notes stored correctly | Contains test text | | |
| 8 | record_versions INSERT | Logged | | |

---

# COMPREHENSIVE FINAL VERIFICATION

## After All Tests Complete

### Query FINAL-Q1: Complete Database State Summary
```sql
SELECT json_build_object(
  'total_members', (SELECT COUNT(*) FROM gym_members WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'),
  'active_members', (SELECT COUNT(*) FROM gym_members WHERE gym_id = 'a0000000-0000-0000-0000-000000000001' AND status = 'active'),
  'total_payments', (SELECT COUNT(*) FROM gym_payments WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'),
  'total_schedules', (SELECT COUNT(*) FROM gym_payment_schedule WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'),
  'total_progress', (SELECT COUNT(*) FROM gym_member_progress WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'),
  'schedule_history', (SELECT COUNT(*) FROM gym_payment_schedule_history WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'),
  'member_history', (SELECT COUNT(*) FROM gym_member_history WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'),
  'audit_logs', (SELECT COUNT(*) FROM gym_audit_logs WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'),
  'record_versions', (SELECT COUNT(*) FROM record_versions)
) as final_state;
```

### Query FINAL-Q2: Verify One Schedule Per Member Rule
```sql
-- This should return ZERO rows - no member should have multiple schedules
SELECT 
  member_id, 
  COUNT(*) as schedule_count,
  m.full_name
FROM gym_payment_schedule s
JOIN gym_members m ON m.id = s.member_id
WHERE s.gym_id = 'a0000000-0000-0000-0000-000000000001'
GROUP BY member_id, m.full_name
HAVING COUNT(*) > 1;
```

**EXPECTED:** 0 rows returned

### Query FINAL-Q3: Verify No Orphan Records
```sql
-- Check for payments without valid members
SELECT COUNT(*) as orphan_payments
FROM gym_payments p
LEFT JOIN gym_members m ON p.member_id = m.id
WHERE m.id IS NULL AND p.gym_id = 'a0000000-0000-0000-0000-000000000001';
```

**EXPECTED:** `orphan_payments = 0`

---

# CLEANUP QUERIES (Run After Testing)

## Remove Test Data
```sql
-- Delete test members (by test phone number pattern)
DELETE FROM gym_members 
WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'
  AND phone LIKE '999901%';

-- The CASCADE will automatically delete:
-- - Related gym_payments
-- - Related gym_payment_schedule
-- - Related gym_member_progress
-- - Related gym_receipts
```

---

# EXECUTION CHECKLIST FOR AI AGENT

## Before Starting Tests
- [ ] Confirm application is running at http://localhost:5173
- [ ] Confirm database connection to Supabase project
- [ ] Note current timestamp for filtering queries

## During Tests
- [ ] Execute PRE-TEST queries and store results
- [ ] Execute UI steps in exact order
- [ ] Capture screenshots at key steps
- [ ] Execute POST-TEST verification queries
- [ ] Compare actual vs expected results

## After Each Test
- [ ] Fill in SUCCESS CRITERIA CHECKLIST
- [ ] Note any discrepancies
- [ ] Store created IDs for subsequent tests

## After All Tests
- [ ] Run FINAL verification queries
- [ ] Run cleanup queries if needed
- [ ] Generate test report

---

# TROUBLESHOOTING GUIDE

## Common Issues

### Issue: Camera doesn't open automatically
- **Expected:** Camera should open when clicking photo area
- **Check:** Browser permissions for camera
- **Check:** HTTPS required for camera access in some browsers

### Issue: Multiple schedule records created
- **Expected:** Only 1 schedule per member
- **Check:** Verify triggers are not creating extra records
- **Query:** Use FINAL-Q2 to identify duplicates

### Issue: Payment delete doesn't revert dates
- **Check:** `gym_payment_schedule_history` for change records
- **Check:** `clear_payment_schedule_reference` trigger exists

### Issue: Audit logs not appearing
- **Note:** Audit logging may be disabled in development mode
- **Check:** `auditLogger.ts` - look for `DEV` environment check

---

## Document Version
- **Version:** 1.0
- **Created:** December 7, 2025
- **Purpose:** AI Agent Automated Testing
