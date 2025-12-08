# TEST CASE: ADD MEMBER MODULE (End-to-End)

**ID:** TC-ADD-MEMBER
**Module:** Member Management
**Type:** End-to-End (UI + Database)
**Last Verified:** 2025-12-08

---

## 1. Objective
Verify the complete "Add Member" flow, ensuring that creating a new member correctly captures all personal details, processes the initial payment, sets up the future payment schedule, and records the transaction history. Critically, verify that system integrity is maintained (no "Deactivate" option immediately after creation).

## 2. Pre-requisites
*   **Environment:** Localhost (`http://localhost:5173`)
*   **Database:** Supabase Project `GymDev` (`qvszzwfvkvjxpkkiilyv`)
*   **User Role:** Admin / Owner
*   **Test Credentials:**
    *   Email: `fareedh@gmail.com`
    *   Password: `Admin@123`

---

## 3. UI Test Steps (Browser)

### Step 1: Login & Navigation
1.  Open Browser to `http://localhost:5173`.
2.  Login with the credentials above.
3.  Navigate to the **Members** page via the sidebar/navigation.

### Step 2: Add Member Wizard (The "Happy Path")
1.  Click the **"Add Member"** button.
2.  **Wizard Step 1 (Basic Info):**
    *   Enter **Full Name**: `Visual Test Member` (or unique name).
    *   Enter **Phone**: `99887766XX` (Unique 10-digits).
    *   **Camera Capture:** Click "Camera". (Note: In automated tests, this is mocked to a colored square). Click "Capture". Verify photo appears.
    *   Click "Next".
3.  **Wizard Step 2 (Physical):**
    *   Select **Gender**: `Male`.
    *   Enter **Height**: `180`.
    *   Enter **Weight**: `85`.
    *   Click "Next".
4.  **Wizard Step 3 (Plan & Payment):**
    *   Select **Membership Plan**: `1 Month` (Default).
    *   **Verify Dates:** Ensure "Joining Date" is Today and "Next Payment Due" is exactly 1 month from Today.
    *   Click **"Add Member"**.

### Step 3: Verify Creation & UI Constraints
1.  **List Verification:** Verify the new member appears in the Members List.
2.  **Detail Verification:** Click the Member's row to open the **Member Details Modal**.
3.  **Edit Strictness:** Click the **"Edit"** button.
    *   🔴 **Constraint Check 1:** Verify there is **NO** "Deactivate" button.
    *   🔴 **Constraint Check 2:** Verify the "Membership Plan" cannot be changed (input disabled or text-only).
4.  Close the modal.

---

## 4. Database Validation (SQL)

After the UI test passes, run the following SQL query in the Supabase SQL Editor (or via MCP) to verify the **4 Critical Tables** were updated correctly.

**SQL Query:**
```sql
WITH new_member AS (
    SELECT id, full_name, created_at, status 
    FROM gym_members 
    ORDER BY created_at DESC 
    LIMIT 1
)
SELECT 
    '1. MEMB' as check_type, m.full_name, m.status 
FROM new_member m
UNION ALL
SELECT 
    '2. PAYM' as check_type, cast(p.amount as text), p.payment_method 
FROM gym_payments p 
JOIN new_member m ON p.member_id = m.id
UNION ALL
SELECT 
    '3. SCHD' as check_type, cast(s.amount_due as text), cast(s.due_date as text) 
FROM gym_payment_schedule s 
JOIN new_member m ON s.member_id = m.id
UNION ALL
SELECT 
    '4. HIST' as check_type, h.change_type, h.description 
FROM gym_member_history h 
JOIN new_member m ON h.member_id = m.id
WHERE h.change_type = 'member_created';
```

### Expected Database Results

| Check Type | Column 2 (Expected) | Column 3 (Expected) | Explanation |
| :--- | :--- | :--- | :--- |
| **1. MEMB** | `Visual Test Member` | `active` | Member created and active. |
| **2. PAYM** | `1000.00` | `cash` | Initial payment recorded immediately. |
| **3. SCHD** | `1000.00` | `YYYY-MM-DD` | Schedule created for NEXT MONTH (Today + 1 Month). |
| **4. HIST** | `member_created` | `New member...` | Audit log entry created. |

---

## 5. Automation Reference
This test case is automated in Playwright.
*   **File:** `e2e/tests/09-add-member-module.spec.ts`
*   **Test ID:** `TC-M1-02.1`
*   **Command:** `npx playwright test e2e/tests/09-add-member-module.spec.ts -g "TC-M1-02.1"`
