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

## Objective
Verify that adding a new member creates exactly:
- 1 record in `gym_members`
- 1 record in `gym_payments` (initial payment)
- 1 record in `gym_payment_schedule` (next due date)
- Photo uploaded to `images` bucket
- Audit logs generated

## Pre-Test Database Capture

### Step 1.1: Capture Baseline Counts
Execute SQL query:
```sql
SELECT 
  (SELECT COUNT(*) FROM gym_members WHERE gym_id = 'a0000000-0000-0000-0000-000000000001') as members_count,
  (SELECT COUNT(*) FROM gym_payments WHERE gym_id = 'a0000000-0000-0000-0000-000000000001') as payments_count,
  (SELECT COUNT(*) FROM gym_payment_schedule WHERE gym_id = 'a0000000-0000-0000-0000-000000000001') as schedules_count,
  (SELECT COUNT(*) FROM gym_audit_logs WHERE gym_id = 'a0000000-0000-0000-0000-000000000001') as audit_count,
  (SELECT COUNT(*) FROM record_versions WHERE table_name = 'gym_members') as member_versions_count;
```

**Record these values as BASELINE_BEFORE_ADD**

## UI Test Steps

### Step 1.2: Navigate to Add Member
1. Click on "Members" in bottom navigation
2. Click the "+" (Add) button

### Step 1.3: Fill Member Form
Fill the form with:
| Field | Value |
|-------|-------|
| Full Name | `E2E Test Member [current_timestamp]` |
| Phone | `9999000001` |
| Gender | Select "Male" |
| Plan | Select first available plan (note the plan name and amount) |
| Payment Method | Select "Cash" |

### Step 1.4: Capture Photo
1. Click on the camera/photo area
2. **EXPECTED**: Camera should open automatically
3. If camera opens: Allow camera access and capture photo
4. If file picker opens: Select any image file
5. **VERIFY**: Photo preview should appear in the form

### Step 1.5: Submit Form
1. Click "Add Member" button
2. **EXPECTED**: Success animation should appear
3. **EXPECTED**: Should redirect to Members list or Member details

## Post-Test Database Verification

### Step 1.6: Verify New Records
Execute SQL query:
```sql
-- Find the newly created member
SELECT id, full_name, phone, status, photo_url, joining_date, membership_end_date, plan_amount
FROM gym_members 
WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'
  AND phone = '9999000001'
ORDER BY created_at DESC 
LIMIT 1;
```

**Store the member `id` as TEST_MEMBER_ID**

### Step 1.7: Verify Payment Record
```sql
SELECT id, member_id, amount, payment_method, payment_date
FROM gym_payments 
WHERE member_id = '[TEST_MEMBER_ID]';
```

**EXPECTED**: Exactly 1 record with:
- `amount` = plan amount from form
- `payment_method` = 'cash'
- `payment_date` = today's date

### Step 1.8: Verify Payment Schedule
```sql
SELECT id, member_id, due_date, amount_due, status
FROM gym_payment_schedule 
WHERE member_id = '[TEST_MEMBER_ID]';
```

**EXPECTED**: Exactly 1 record with:
- `status` = 'pending'
- `due_date` = membership_end_date from member record

### Step 1.9: Verify Photo Upload
```sql
SELECT photo_url FROM gym_members WHERE id = '[TEST_MEMBER_ID]';
```

**EXPECTED**: `photo_url` should:
- Not be NULL
- Contain URL pointing to `images` bucket
- URL should be accessible (return 200 status)

### Step 1.10: Verify Audit Logs
```sql
SELECT event_type, action, resource_type, resource_id, created_at
FROM gym_audit_logs 
WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'
  AND resource_id = '[TEST_MEMBER_ID]'
ORDER BY created_at DESC;
```

**EXPECTED**: Should have audit entries for member creation

### Step 1.11: Verify Record Versions
```sql
SELECT table_name, operation, new_data, created_at
FROM record_versions 
WHERE record_id = '[TEST_MEMBER_ID]'
ORDER BY created_at DESC;
```

**EXPECTED**: Should have INSERT record for gym_members

## Test Case 1 Success Criteria
| Check | Expected |
|-------|----------|
| Member record created | 1 new record |
| Payment record created | 1 new record |
| Schedule record created | 1 new record |
| Photo uploaded | Non-null URL, accessible |
| Audit log created | Entry exists |
| Record version logged | INSERT operation logged |

---

# TEST CASE 2: Delete New Member (Cascade Delete)

## Objective
Verify that deleting a member cascades and removes:
- The member record from `gym_members`
- All payment records from `gym_payments`
- All schedule records from `gym_payment_schedule`
- Photo from storage (optional - verify URL becomes invalid)

## Pre-Test Verification

### Step 2.1: Confirm Test Member Exists
Use the TEST_MEMBER_ID from Test Case 1.
```sql
SELECT 
  (SELECT COUNT(*) FROM gym_members WHERE id = '[TEST_MEMBER_ID]') as member_exists,
  (SELECT COUNT(*) FROM gym_payments WHERE member_id = '[TEST_MEMBER_ID]') as payments_count,
  (SELECT COUNT(*) FROM gym_payment_schedule WHERE member_id = '[TEST_MEMBER_ID]') as schedules_count;
```

**EXPECTED**: member_exists = 1, payments_count = 1, schedules_count = 1

## UI Test Steps

### Step 2.2: Navigate to Member
1. Go to Members list
2. Find and click on the test member (phone: 9999000001)

### Step 2.3: Delete Member
1. In Member Details page, find the "Delete" option (usually in menu or action button)
2. Click Delete
3. **EXPECTED**: Confirmation dialog appears
4. Confirm deletion

### Step 2.4: Verify UI Response
- **EXPECTED**: Success message appears
- **EXPECTED**: Redirected to Members list
- **EXPECTED**: Test member no longer appears in list

## Post-Test Database Verification

### Step 2.5: Verify Member Deleted
```sql
SELECT COUNT(*) as count FROM gym_members WHERE id = '[TEST_MEMBER_ID]';
```
**EXPECTED**: count = 0

### Step 2.6: Verify Payments Cascade Deleted
```sql
SELECT COUNT(*) as count FROM gym_payments WHERE member_id = '[TEST_MEMBER_ID]';
```
**EXPECTED**: count = 0

### Step 2.7: Verify Schedule Cascade Deleted
```sql
SELECT COUNT(*) as count FROM gym_payment_schedule WHERE member_id = '[TEST_MEMBER_ID]';
```
**EXPECTED**: count = 0

### Step 2.8: Verify Record Versions (DELETE logged)
```sql
SELECT table_name, operation, old_data, created_at
FROM record_versions 
WHERE record_id = '[TEST_MEMBER_ID]'
  AND operation = 'DELETE'
ORDER BY created_at DESC;
```
**EXPECTED**: DELETE operation logged with old_data containing member info

## Test Case 2 Success Criteria
| Check | Expected |
|-------|----------|
| Member deleted | 0 records remain |
| Payments cascade deleted | 0 records remain |
| Schedule cascade deleted | 0 records remain |
| Delete operation logged | DELETE in record_versions |

---

# TEST CASE 3: Add Payment to Existing Member

## Objective
Verify that adding a payment to an existing member:
- Creates 1 new record in `gym_payments`
- Updates the existing `gym_payment_schedule` record (marks as paid, updates due_date)
- Creates history record in `gym_payment_schedule_history`
- Updates member's `membership_end_date` and `last_payment_date`

## Pre-Test Setup

### Step 3.1: Select Existing Test Member
Find an existing active member with a pending schedule:
```sql
SELECT m.id, m.full_name, m.phone, m.status, m.membership_end_date,
       s.id as schedule_id, s.due_date, s.status as schedule_status, s.amount_due
FROM gym_members m
JOIN gym_payment_schedule s ON s.member_id = m.id
WHERE m.gym_id = 'a0000000-0000-0000-0000-000000000001'
  AND m.status = 'active'
  AND s.status IN ('pending', 'overdue')
ORDER BY m.full_name
LIMIT 1;
```

**Store as EXISTING_MEMBER_ID, EXISTING_SCHEDULE_ID**

### Step 3.2: Capture Before State
```sql
SELECT 
  m.membership_end_date as member_end_date,
  m.last_payment_date,
  m.total_payments_received,
  s.due_date as schedule_due_date,
  s.status as schedule_status,
  (SELECT COUNT(*) FROM gym_payments WHERE member_id = '[EXISTING_MEMBER_ID]') as payments_count,
  (SELECT COUNT(*) FROM gym_payment_schedule_history WHERE member_id = '[EXISTING_MEMBER_ID]') as history_count
FROM gym_members m
JOIN gym_payment_schedule s ON s.member_id = m.id
WHERE m.id = '[EXISTING_MEMBER_ID]';
```

**Record as BEFORE_PAYMENT_STATE**

## UI Test Steps

### Step 3.3: Navigate to Member
1. Go to Members list
2. Find and click on the selected existing member

### Step 3.4: Record Payment
1. Click "Record Payment" or "Add Payment" button
2. **EXPECTED**: Payment dialog/form opens
3. Fill payment details:
   - Amount: Use the schedule amount_due or plan amount
   - Payment Method: Select "Cash" or "UPI"
   - Date: Today's date
4. Click Submit/Save

### Step 3.5: Verify UI Response
- **EXPECTED**: Success message
- **EXPECTED**: Member's payment info updated in UI

## Post-Test Database Verification

### Step 3.6: Verify New Payment Record
```sql
SELECT id, amount, payment_method, payment_date, created_at
FROM gym_payments 
WHERE member_id = '[EXISTING_MEMBER_ID]'
ORDER BY created_at DESC
LIMIT 1;
```

**Store new payment ID as NEW_PAYMENT_ID**
**EXPECTED**: New payment record with today's date

### Step 3.7: Verify Schedule Updated
```sql
SELECT id, due_date, status, paid_payment_id, paid_at
FROM gym_payment_schedule 
WHERE member_id = '[EXISTING_MEMBER_ID]';
```

**EXPECTED**:
- `due_date` should be NEW date (extended by plan duration)
- `status` should still be 'pending' (for next payment)
- OR if schedule was marked paid, `paid_payment_id` = NEW_PAYMENT_ID

### Step 3.8: Verify Schedule History Created
```sql
SELECT id, old_due_date, new_due_date, old_status, new_status, change_type, payment_id, created_at
FROM gym_payment_schedule_history 
WHERE member_id = '[EXISTING_MEMBER_ID]'
ORDER BY created_at DESC
LIMIT 1;
```

**EXPECTED**: 
- New history record created
- `change_type` = 'payment_received' or similar
- `payment_id` = NEW_PAYMENT_ID
- Shows old and new due dates

### Step 3.9: Verify Member Updated
```sql
SELECT membership_end_date, last_payment_date, last_payment_amount, total_payments_received
FROM gym_members 
WHERE id = '[EXISTING_MEMBER_ID]';
```

**EXPECTED**:
- `membership_end_date` extended
- `last_payment_date` = today
- `last_payment_amount` = payment amount
- `total_payments_received` increased

### Step 3.10: Verify Audit Trail
```sql
SELECT action, resource_type, resource_id, new_values, created_at
FROM gym_audit_logs 
WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'
  AND resource_type = 'payment'
ORDER BY created_at DESC
LIMIT 1;
```

## Test Case 3 Success Criteria
| Check | Expected |
|-------|----------|
| New payment created | 1 new record |
| Schedule updated | Due date extended |
| Schedule history created | 1 new history record |
| Member dates updated | membership_end_date, last_payment_date updated |
| Audit logged | Payment action logged |

---

# TEST CASE 4: Delete Payment (Revert Member State)

## Objective
Verify that deleting a payment:
- Removes the payment record
- Reverts the schedule to previous state (history record helps)
- Creates revert history record in `gym_payment_schedule_history`
- Member stays ACTIVE if they have pending/overdue schedules
- Member's dates reverted appropriately

## Pre-Test Setup

### Step 4.1: Identify Payment to Delete
Use the NEW_PAYMENT_ID from Test Case 3, or find a recent payment:
```sql
SELECT p.id, p.member_id, p.amount, p.payment_date,
       m.full_name, m.status as member_status,
       s.status as schedule_status
FROM gym_payments p
JOIN gym_members m ON m.id = p.member_id
JOIN gym_payment_schedule s ON s.member_id = p.member_id
WHERE p.gym_id = 'a0000000-0000-0000-0000-000000000001'
ORDER BY p.created_at DESC
LIMIT 1;
```

**Store as DELETE_PAYMENT_ID, DELETE_MEMBER_ID**

### Step 4.2: Capture Before Delete State
```sql
SELECT 
  m.status as member_status,
  m.membership_end_date,
  m.last_payment_date,
  s.due_date,
  s.status as schedule_status,
  (SELECT COUNT(*) FROM gym_payments WHERE member_id = '[DELETE_MEMBER_ID]') as total_payments,
  (SELECT COUNT(*) FROM gym_payment_schedule_history WHERE member_id = '[DELETE_MEMBER_ID]') as history_count
FROM gym_members m
JOIN gym_payment_schedule s ON s.member_id = m.id
WHERE m.id = '[DELETE_MEMBER_ID]';
```

**Record as BEFORE_DELETE_STATE**

## UI Test Steps

### Step 4.3: Navigate to Payment
1. Go to Payments page OR Member Details > Payments tab
2. Find the payment to delete

### Step 4.4: Delete Payment
1. Click on payment record
2. Find Delete option (trash icon or menu)
3. Click Delete
4. **EXPECTED**: Confirmation dialog
5. Confirm deletion

### Step 4.5: Verify UI Response
- **EXPECTED**: Success message
- **EXPECTED**: Payment removed from list
- **EXPECTED**: Member should still show as ACTIVE (if schedule pending)

## Post-Test Database Verification

### Step 4.6: Verify Payment Deleted
```sql
SELECT COUNT(*) as count FROM gym_payments WHERE id = '[DELETE_PAYMENT_ID]';
```
**EXPECTED**: count = 0

### Step 4.7: Verify Member Status
```sql
SELECT id, status, membership_end_date, last_payment_date
FROM gym_members 
WHERE id = '[DELETE_MEMBER_ID]';
```

**EXPECTED**: 
- `status` = 'active' (if member has pending/overdue schedule)
- `membership_end_date` reverted to previous value

### Step 4.8: Verify Schedule Reverted
```sql
SELECT id, due_date, status, paid_payment_id
FROM gym_payment_schedule 
WHERE member_id = '[DELETE_MEMBER_ID]';
```

**EXPECTED**:
- `due_date` reverted to previous date
- `status` = 'pending' or 'overdue'
- `paid_payment_id` = NULL (if was linked to deleted payment)

### Step 4.9: Verify Revert History Created
```sql
SELECT id, old_due_date, new_due_date, old_status, new_status, change_type, created_at
FROM gym_payment_schedule_history 
WHERE member_id = '[DELETE_MEMBER_ID]'
ORDER BY created_at DESC
LIMIT 1;
```

**EXPECTED**:
- New history record with `change_type` = 'payment_deleted' or 'reverted'
- Shows the reversion of dates

### Step 4.10: Verify Record Versions
```sql
SELECT table_name, operation, old_data, created_at
FROM record_versions 
WHERE record_id = '[DELETE_PAYMENT_ID]'
  AND operation = 'DELETE';
```
**EXPECTED**: DELETE operation logged for gym_payments

## Test Case 4 Success Criteria
| Check | Expected |
|-------|----------|
| Payment deleted | 0 records with that ID |
| Member stays active | status = 'active' (if pending schedule exists) |
| Schedule reverted | Previous due_date restored |
| Revert history created | New history record |
| Delete logged | record_versions has DELETE |

---

# TEST CASE 5: Edit Member - Change Status (Active/Inactive)

## Objective
Verify that changing member status:
- Updates `gym_members.status` correctly
- Creates history record in `gym_member_history`
- Updates `record_versions` audit

## Pre-Test Setup

### Step 5.1: Find Active Member
```sql
SELECT id, full_name, phone, status
FROM gym_members 
WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'
  AND status = 'active'
LIMIT 1;
```

**Store as EDIT_MEMBER_ID**

### Step 5.2: Capture Before State
```sql
SELECT 
  status,
  (SELECT COUNT(*) FROM gym_member_history WHERE member_id = '[EDIT_MEMBER_ID]') as history_count
FROM gym_members 
WHERE id = '[EDIT_MEMBER_ID]';
```

## UI Test Steps

### Step 5.3: Navigate to Edit Member
1. Go to Members list
2. Click on the member
3. Click "Edit" button

### Step 5.4: Change Status to Inactive
1. Find Status field/toggle
2. Change from "Active" to "Inactive"
3. Save changes

### Step 5.5: Verify UI
- **EXPECTED**: Success message
- **EXPECTED**: Member status shows as "Inactive"

## Post-Test Verification

### Step 5.6: Verify Status Change
```sql
SELECT status FROM gym_members WHERE id = '[EDIT_MEMBER_ID]';
```
**EXPECTED**: status = 'inactive'

### Step 5.7: Verify History Record
```sql
SELECT id, change_type, old_value, new_value, description, created_at
FROM gym_member_history 
WHERE member_id = '[EDIT_MEMBER_ID]'
ORDER BY created_at DESC
LIMIT 1;
```

**EXPECTED**: History record showing status change from 'active' to 'inactive'

### Step 5.8: Verify Record Versions
```sql
SELECT operation, old_data->>'status' as old_status, new_data->>'status' as new_status
FROM record_versions 
WHERE record_id = '[EDIT_MEMBER_ID]'
  AND table_name = 'gym_members'
ORDER BY created_at DESC
LIMIT 1;
```
**EXPECTED**: UPDATE operation with status change

## Step 5.9: Revert - Change Back to Active
Repeat steps 5.3-5.8 but change status back to "Active"

## Test Case 5 Success Criteria
| Check | Expected |
|-------|----------|
| Status changed | Value updated in database |
| History created | New record in gym_member_history |
| Audit logged | UPDATE in record_versions |
| UI reflects change | Status badge updated |

---

# TEST CASE 6: Add Progress Record (With Photo)

## Objective
Verify that adding a progress record:
- Creates 1 record in `gym_member_progress`
- Uploads progress photo(s) to `images` bucket
- Photo URLs stored correctly

## Pre-Test Setup

### Step 6.1: Find Test Member
```sql
SELECT id, full_name, phone
FROM gym_members 
WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'
  AND status = 'active'
LIMIT 1;
```

**Store as PROGRESS_MEMBER_ID**

### Step 6.2: Capture Before State
```sql
SELECT COUNT(*) as progress_count
FROM gym_member_progress 
WHERE member_id = '[PROGRESS_MEMBER_ID]';
```

## UI Test Steps

### Step 6.3: Navigate to Progress
1. Go to Member Details
2. Find "Progress" tab or section
3. Click "Add Progress" or "Track Progress"

### Step 6.4: Fill Progress Form
Enter measurements:
| Field | Value |
|-------|-------|
| Weight | 75 |
| Height | 175 |
| Chest | 100 |
| Waist | 85 |
| Notes | "E2E Test Progress Record" |

### Step 6.5: Capture Progress Photo
1. Click on photo capture area
2. **EXPECTED**: Camera opens automatically
3. Capture or select photo
4. **VERIFY**: Photo preview appears

### Step 6.6: Submit
1. Click Save/Submit
2. **EXPECTED**: Success message
3. **EXPECTED**: Progress record appears in history

## Post-Test Verification

### Step 6.7: Verify Progress Record
```sql
SELECT id, record_date, weight, height, chest, waist, notes,
       photo_front_url, photo_back_url, photo_left_url, photo_right_url
FROM gym_member_progress 
WHERE member_id = '[PROGRESS_MEMBER_ID]'
ORDER BY created_at DESC
LIMIT 1;
```

**EXPECTED**:
- New record with today's date
- Measurements match input
- At least one photo URL is not NULL

### Step 6.8: Verify Photo Accessible
If `photo_front_url` is not NULL, verify URL returns 200 status.

### Step 6.9: Verify Record Versions
```sql
SELECT operation, new_data, created_at
FROM record_versions 
WHERE table_name = 'gym_member_progress'
ORDER BY created_at DESC
LIMIT 1;
```
**EXPECTED**: INSERT operation logged

## Test Case 6 Success Criteria
| Check | Expected |
|-------|----------|
| Progress record created | 1 new record |
| Measurements stored | Values match input |
| Photo uploaded | URL not null, accessible |
| Audit logged | INSERT in record_versions |

---

# Summary Verification Query

After all tests, run this comprehensive check:

```sql
SELECT 
  'gym_members' as table_name, COUNT(*) as count FROM gym_members WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'gym_payments', COUNT(*) FROM gym_payments WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'gym_payment_schedule', COUNT(*) FROM gym_payment_schedule WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'gym_payment_schedule_history', COUNT(*) FROM gym_payment_schedule_history WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'gym_member_history', COUNT(*) FROM gym_member_history WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'gym_member_progress', COUNT(*) FROM gym_member_progress WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'gym_audit_logs', COUNT(*) FROM gym_audit_logs WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'record_versions', COUNT(*) FROM record_versions;
```

---

# Business Rules Reference

## Rule 1: One Schedule Per Member
Each member should have exactly 1 record in `gym_payment_schedule`. This record tracks their next payment due date.

## Rule 2: Payment Creates History
When a payment is made, the schedule's due_date is extended and a history record is created.

## Rule 3: Payment Delete Reverts State
When a payment is deleted:
- Schedule reverts to previous due_date
- Member stays ACTIVE if they still have pending schedules
- History record created for the reversion

## Rule 4: Cascade Delete on Member Delete
Deleting a member cascades:
- All payments deleted
- Schedule deleted
- Progress records deleted (if FK constraint exists)

## Rule 5: Photo Auto-Capture
Photo capture should automatically open camera (not file picker) on supported devices.

---

# Notes for AI Agent Execution

1. **Always capture BEFORE state** before any action
2. **Verify database changes** after each UI action
3. **Record all IDs** created during tests for cleanup
4. **Take screenshots** at key steps for evidence
5. **Log any discrepancies** between expected and actual results
6. **Cleanup test data** after test completion if needed

## Cleanup Query (Optional - Run after testing)
```sql
-- Delete test members created during testing
DELETE FROM gym_members 
WHERE gym_id = 'a0000000-0000-0000-0000-000000000001'
  AND phone = '9999000001';
```
