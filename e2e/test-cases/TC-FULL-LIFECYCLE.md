# Member Lifecycle & Critical Scenarios Test Protocol

**Objective:** Validate the core data integrity and business rules of the Gym Management System, encompassing member creation, editing restrictions, cascade deletions, full lifecycle tracking (Inactive/Rejoin), and payment rollback.

**Audience:** QA, AI Agents, Developers.
**Prerequisites:** Access to Gym App (Admin) and Supabase Database (SQL).

---

## 🟢 TC-L1: Add Member & Edit Restrictions
**Goal:** Verify a new member is added correctly and critical fields (Plan, Join Date) are locked in Edit mode.

### Steps:
1.  **UI:** Go to `Members` -> `Add Member`.
2.  **Action:** Add Member:
    *   Name: `LifeCycle Test 01`
    *   Phone: `9000000001`
    *   Plan: `Monthly` (₹1000)
    *   Start Date: Today
3.  **UI:** Search for `LifeCycle Test 01` and Open Details.
4.  **Action:** Click `Edit` button.
5.  **UI Validation:**
    *   Verify `Phone`, `Height`, `Weight` are **Editable**.
    *   Verify `Membership Plan` is **Disabled/Read-only**.
    *   Verify `Joining Date` is **Disabled/Read-only**.
    *   Verify `Deactivate` option is **NOT Visible** (or button is disabled if present).

### 🛡️ Database Verification (SQL):
Run this query to confirm explicit record creation.
```sql
SELECT id, full_name, membership_plan, joining_date, status 
FROM gym_members 
WHERE phone = '9000000001';
-- EXPECT: 1 Row, status = 'active'.
```

---

## 🔴 TC-L2: New Member Mistake Handling (Cascade Delete)
**Goal:** Verify that deleting the *First and Only* payment of a new member wipes the member record entirely (Cascade Delete).

### Steps:
1.  **UI:** Go to `Members` -> `Add Member`.
2.  **Action:** Add Member:
    *   Name: `Mistake Member 02`
    *   Phone: `9000000002`
    *   Plan: `Monthly`
3.  **UI:** Open `Mistake Member 02` details.
4.  **Action:** Click `Payments` / `History`.
5.  **Action:** Find the initial ₹1000 payment and click **Delete (Trash Icon)**.
6.  **UI:** Confirm Deletion.
7.  **UI Validation:** You should be redirected to Members list. Search for `Mistake Member 02` -> **Should yield NO results**.

### 🛡️ Database Verification (SQL):
Run this query to confirm COMPLETE CLEANUP.
```sql
SELECT 
    (SELECT count(*) FROM gym_members WHERE phone = '9000000002') as member_count,
    (SELECT count(*) FROM gym_payments WHERE member_id IN (SELECT id FROM gym_members WHERE phone = '9000000002')) as payment_count,
    (SELECT count(*) FROM gym_member_history WHERE member_id IN (SELECT id FROM gym_members WHERE phone = '9000000002')) as history_count;
-- EXPECT: member_count = 0, payment_count = 0, history_count = 0.
```

---

## 🔄 TC-L3: Full Lifecycle (Join -> Inactive -> Rejoin)
**Goal:** Verify complete tracking of a member's journey. Ensure History logs 3 distinct events and Schedule table remains clean (no duplicates).

### Steps:
1.  **UI:** Go to `Members` -> `Add Member`.
2.  **Action:** Add Member:
    *   Name: `Lifecycle Hero 03`
    *   Phone: `9000000003`
    *   Plan: `Monthly`
3.  **Event 1 (Joined):**
    *   **UI:** Open Details -> Click `View membership history`.
    *   **Verify:** 1 Entry ("Joined Gym").
4.  **Event 2 (Inactive):**
    *   **SQL (Setup):** Manually expire membership to allow deactivation (Simulating time pass).
        ```sql
        UPDATE gym_members SET membership_end_date = CURRENT_DATE - 1 WHERE phone = '9000000003';
        ```
    *   **UI:** Refresh Page -> Open `Lifecycle Hero 03`.
    *   **Action:** Click `Mark Inactive`. Provide Reason: "Travel". Confirm.
    *   **Verify:** Member Status is `Inactive`.
    *   **UI:** Click `View membership history` -> **Verify:** 2 Entries (Joined -> Inactive).
5.  **Event 3 (Rejoin):**
    *   **UI:** Open `Lifecycle Hero 03` (Inactive).
    *   **Action:** Click `Reactivate`.
    *   **Action:** Select Plan `Quarterly` (₹2500). Payment: `Cash`. Start: `Today`. Confirm.
    *   **Verify:** Member Status is `Active`.
    *   **UI:** Click `View membership history` -> **Verify:** 3 Entries (Joined -> Inactive -> Rejoined).

### 🛡️ Database Verification (SQL):
Run this query to confirm Integrity.
```sql
-- 1. Check History Timeline (Should be 3 rows)
SELECT change_type, description, created_at 
FROM gym_member_history 
WHERE member_id = (SELECT id FROM gym_members WHERE phone = '9000000003')
ORDER BY created_at ASC;

-- 2. Check Schedule Clarity (Should be SINGLE pending record)
SELECT count(*) as schedule_count, status, due_date
FROM gym_payment_schedule 
WHERE member_id = (SELECT id FROM gym_members WHERE phone = '9000000003')
GROUP BY status, due_date;
-- EXPECT: schedule_count = 1, status = 'pending'.
```

---

## ↩️ TC-L4: Payment Correction (State Revert)
**Goal:** Verify that deleting a *subsequent* payment (not the first one) only reverts the dates and does NOT delete the member.

### Steps:
1.  **Pre-requisite:** Use `Lifecycle Hero 03` from TC-L3 (Already has Initial + Rejoin payments).
2.  **Action:** Go to `Payments` -> `Record Payment`.
3.  **Action:** Select `Lifecycle Hero 03`. Record a `Monthly` payment (Future).
4.  **State Check:** Note the `Valid Until` date (e.g., pushed forward by 1 month).
5.  **Action:** Go to `Member Details` -> `Payments`.
6.  **Action:** Delete the payment you just made (The latest one).
7.  **UI Validation:** 
    *   Member should **STILL EXIST**.
    *   `Valid Until` date should **REVERT** to the previous date (before the payment).

### 🛡️ Database Verification (SQL):
```sql
-- 1. Confirm Member Exists
SELECT full_name, membership_end_date, status 
FROM gym_members 
WHERE phone = '9000000003';
-- EXPECT: 1 Row, status 'active', date reverted.

-- 2. Confirm Payment Deleted
SELECT count(*) 
FROM gym_payments 
WHERE member_id = (SELECT id FROM gym_members WHERE phone = '9000000003');
-- EXPECT: Count should preserve history (e.g. 2 records) but exclude the deleted one.
```
