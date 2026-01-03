# Pandira's Complete Fix - Quick Reference

## Problem
- Pandira made 2 payments but database shows only 1
- Current next_payment_due_date is wrong (Jan 31, 2026)
- Should be: Sep 1, 2026

## Payment History (What SHOULD Be)
1. **Sep 1, 2025**: ₹2,500 (3 months) → Due: Dec 1, 2025
2. **Jan 2, 2026**: ₹4,500 (6+3 months) → Due: Sep 1, 2026

## Correct Calculation
```
Joining: Sep 1, 2025 (Anchor Day = 1st)

Payment #1: Sep 1 + 3 months = Dec 1, 2025
Payment #2: Dec 1 + 9 months = Sep 1, 2026 ✅
Valid Until: Aug 31, 2026 (1 day before due)
```

## Steps to Fix (In Order)

### 1. Run Diagnostic Queries
```sql
-- See current state
SELECT * FROM gym_members WHERE full_name ILIKE '%pandira%';

-- See payments
SELECT * FROM gym_payments 
WHERE member_id = (SELECT id FROM gym_members WHERE full_name ILIKE '%pandira%');
```

### 2. Add Missing Payment
- Check which payment is missing (Sep 1 OR Jan 2)
- Use INSERT query from `20260103_complete_fix_pandira.sql` STEP 4
- Uncomment the correct INSERT block

### 3. Update Member Dates
- Use UPDATE query from `20260103_complete_fix_pandira.sql` STEP 5
- Sets:
  - `joining_date` = Sep 1, 2025
  - `next_payment_due_date` = Sep 1, 2026
  - `membership_end_date` = Aug 31, 2026

### 4. Verify
```sql
-- Should show:
-- joining_date: 2025-09-01
-- next_payment_due_date: 2026-09-01
-- payment_count: 2
```

## Expected Final State
```
Pandira
├─ Joining Date: Sep 1, 2025
├─ Plan: 6Months+3Months (₹4,500)
├─ Next Due: Sep 1, 2026
├─ Valid Until: Aug 31, 2026
└─ Payments: 2 (₹2,500 + ₹4,500 = ₹7,000)
```

## Files
- `migrations/20260103_complete_fix_pandira.sql` - Complete fix with all steps
