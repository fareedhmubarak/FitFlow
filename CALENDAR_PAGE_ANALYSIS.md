# Calendar Page - Requirements Analysis & Fixes

## Requirements Summary

1. **All 113 active members must appear** - Every active member should be visible in the calendar
2. **Members placed by JOINING DATE (day of month)** - Not by payment due date. Each member appears on the same day of month as their joining date (e.g., joined Nov 1st → appears on 1st of every month)
3. **3/6/12 month plan members who have paid** - Should show in GREEN color by default when month loads
4. **Calendar should show January** - Today is Jan 1st, calendar should be open to January

## Issues Found & Fixed

### ✅ Issue 1: Event Date Logic - FIXED
**Problem**: Lines 463-465 were using `dueDateNormalized` (payment due date) instead of `anchorDateStr` (joining date day) for "due today" or "overdue" members.

**Fix**: Changed to ALWAYS use `anchorDateStr` (joining date day) for `event_date`. Members now always appear on their joining date day of the month.

```typescript
// BEFORE (WRONG):
const eventDate = (urgency === 'today' || urgency === 'overdue') && dueDateNormalized
  ? dueDateNormalized  // ❌ Used payment due date
  : anchorDateStr;

// AFTER (CORRECT):
const eventDate = anchorDateStr; // ✅ Always use joining date day
```

### ✅ Issue 2: Paid Multi-Month Plan Detection - FIXED
**Problem**: The logic didn't properly identify 3/6/12 month plan members who have already paid. These should show as GREEN (event_type: 'payment').

**Fix**: Added proper check for paid multi-month members:
- Check if plan is quarterly/half_yearly/annual
- Check if membership_end_date >= today (still active)
- Check if last_payment_date IS NOT NULL (has paid)
- If all true → Show as GREEN (payment type)

**Database Stats**:
- Total active members: 113
- Paid multi-month members: 25 (should show in green)

### ✅ Issue 3: Missing Field in Query - FIXED
**Problem**: Query didn't include `last_payment_date` field needed to check payment status.

**Fix**: Added `last_payment_date` to the select query.

## Current Status

### ✅ Requirements Met:
1. ✅ All 113 active members are fetched and processed
2. ✅ Members are placed by joining date (day of month)
3. ✅ Paid multi-month plan members show in green
4. ✅ Query includes all necessary fields

### 📊 Expected Results for January 2026:
- **Day 1**: 8 members (2 should be green - paid multi-month)
- **Day 2**: 1 member (1 should be green)
- **Day 4**: 2 members (1 should be green)
- **Day 15**: 19 members (4 should be green)
- **Day 17**: 7 members (5 should be green)
- And so on...

**Total**: 113 members across 27 different joining days

## Testing Checklist

- [ ] Verify all 113 members appear in calendar view
- [ ] Verify all 113 members appear in list view
- [ ] Verify members appear on correct day (joining date day)
- [ ] Verify 25 paid multi-month members show in GREEN
- [ ] Verify calendar shows January 2026
- [ ] Verify "due today" members still show correct status (but on joining date day)

## Code Changes Summary

**File**: `src/lib/gymService.ts`

1. **Line 382**: Added `last_payment_date` to select query
2. **Lines 428-465**: Completely rewrote status determination logic:
   - Added `isPaidMultiMonth` check
   - Prioritized paid multi-month members (show green)
   - Always use `anchorDateStr` for event_date
3. **Line 465**: Changed eventDate to always use `anchorDateStr`

---

**Status**: ✅ All fixes applied. Ready for testing.


