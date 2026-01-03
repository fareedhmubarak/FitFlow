# Solved Critical Issues & Architectural Decisions

This document serves as a permanent context for AI agents working on the **FitFlow** project. It details critical bugs that have been resolved and the architectural decisions made to prevent regression. **READ THIS BEFORE MODIFYING MEMBERSHIP LOGIC.**

---

## 1. Membership Due Date "Double Counting" & Anchor Date Drift (Fixed: Jan 3, 2026)

### The Problem
When adding a new member or recording a payment, the `next_payment_due_date` was being calculated incorrectly, often resulting in:
1.  **Double Counting:** A 1-month plan resulted in a 2-month due date (e.g., Joined Jan 3 -> Due Mar 3 instead of Feb 3).
2.  **Anchor Drift:** Paying late caused the due day to shift (e.g., Joined 3rd, Paid on 5th -> New Due Date 5th).

### The Root Cause
1.  **Conflicting Sources of Truth:** Both the **Frontend** (`AddMember.tsx`, `membershipService.ts`) and the **Database Triggers** were calculating and updating the dates.
2.  **Race Conditions:** For new members, an unknown mechanism (legacy trigger or separate process) was setting the initial date to "Feb 3". The Database Trigger then ran, saw "Feb 3", treated it as an existing date, and added another month -> "Mar 3".
3.  **Legacy Logic:** `rejoinMember` used hardcoded plan durations (ignoring DB plan config) and explicitly overwrote trigger calculations.

### The Solution (Architectural Rule)
**ALL Membership Date Calculations are now CENTRALIZED in the Database Trigger.**
**The Frontend MUST NOT calculate or send `next_payment_due_date` or `membership_end_date`.**

#### 1. Database Trigger (`calculate_next_due_date_on_payment`)
*   **Trigger Event:** `AFTER INSERT ON gym_payments`.
*   **Logic:**
    *   **Anchor Date:** Always maintains the day of `joining_date` (e.g., if joined on 3rd, due date is always 3rd).
    *   **New Member Safety Check:** Detects if it is a **First Payment** for a **New Member** (Created < 15 mins ago).
        *   If TRUE: It **FORCES** calculation from `joining_date`, ignoring any pre-existing values in `next_payment_due_date`. This kills the "Double Counting" bug dead.
    *   **Subsequent Payments:** Adds 1 Plan Duration (Base + Bonus) to the *existing* `next_payment_due_date`.

#### 2. Frontend Changes (Verified Disabled)
*   **`AddMember.tsx`**: `nextPaymentDueDate` and `membershipEndDate` are sent as `null`.
*   **`membershipService.ts`**:
    *   `recordPayment`: Date update fields are commented out.
    *   `rejoinMember`: Date update/overwrite fields are commented out.

### Comparison: Old vs New Behavior

| Scenario | Old Behavior (Bugged) | New Behavior (Fixed) |
| :--- | :--- | :--- |
| **New Member (Monthly)** | Frontend sends Feb 3 OR Null. Trigger adds 1 mo. Result: **Mar 3** (Wrong) | Trigger sees New Member. Forces calculation from Joining Date. Result: **Feb 3** (Correct) |
| **Rejoin (Quarterly)** | Frontend hardcodes 3mo. Overwrites Trigger (4mo). Result: **3 Months** (Bonus Lost) | Frontend sends nothing. Trigger calculates Base+Bonus. Result: **4 Months** (Correct) |
| **Late Payment** | Calculated from Payment Date. Result: **Day Shifted** | Calculated from Previous Due Date. Result: **Anchor Day Preserved** |

### ⚠️ IMPORTANT INSTRUCTIONS FOR FUTURE AGENTS
1.  **NEVER** uncomment the date calculation logic in `AddMember.tsx` or `membershipService.ts`.
2.  **NEVER** create a new trigger that updates `gym_members` dates without understanding `calculate_next_due_date_on_payment`.
3.  **ALWAYS** rely on `migrations/20260103_sync_dev_fix.sql` as the reference implementation for the date logic.
4.  If a user reports date issues, **CHECK THE DATABASE TRIGGER FIRST**, do not try to patch it in React.

---
