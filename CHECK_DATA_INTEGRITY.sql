-- DATA INTEGRITY CHECK SCRIPT
-- Run this script anytime to verify that next_payment_due_dates are correct
-- and align with the member's joining day anchor.

-- 1. Check for ANCHOR DAY mismatches
-- This finds active members whose Due Date day does not match their Joining Day
-- (Excluding 31st/end-of-month edge cases which are normal)
SELECT 
    id,
    full_name,
    joining_date,
    EXTRACT(DAY FROM joining_date) as base_day,
    next_payment_due_date,
    EXTRACT(DAY FROM next_payment_due_date) as due_day,
    status
FROM gym_members
WHERE 
    status = 'active'
    AND plan_id IS NOT NULL
    AND next_payment_due_date IS NOT NULL
    -- Check if days mismatch (allow for 28/29/30/31 adjustments)
    AND EXTRACT(DAY FROM joining_date) != EXTRACT(DAY FROM next_payment_due_date)
    -- Ignore valid month-end shifts (e.g. joined 31st, active in Feb)
    AND NOT (
        EXTRACT(DAY FROM joining_date) > 28 
        AND EXTRACT(DAY FROM next_payment_due_date) >= 28
    )
ORDER BY full_name;

-- 2. Check for PLAN DURATION mismatches
-- This finds active members where the time between Joining and Next Due
-- is not a multiple of their Plan Duration (Plan + Bonus)
-- (Indicating missed calculations)
WITH MemberPlanInfo AS (
    SELECT 
        m.id,
        m.full_name,
        m.joining_date,
        m.next_payment_due_date,
        COALESCE(p.base_duration_months, p.duration_months, 1) + COALESCE(p.bonus_duration_months, 0) as total_plan_months,
        (EXTRACT(YEAR FROM age(m.next_payment_due_date, m.joining_date)) * 12 + EXTRACT(MONTH FROM age(m.next_payment_due_date, m.joining_date))) as months_diff
    FROM gym_members m
    LEFT JOIN gym_membership_plans p ON m.plan_id = p.id
    WHERE 
        m.status = 'active' 
        AND m.plan_id IS NOT NULL 
        AND m.next_payment_due_date IS NOT NULL
)
SELECT 
    full_name,
    joining_date,
    next_payment_due_date,
    total_plan_months,
    months_diff,
    (months_diff % total_plan_months) as remainder
FROM MemberPlanInfo
WHERE 
    -- If total_plan_months is 0 or null (shouldn't happen), skip
    total_plan_months > 0
    -- If the months difference is not divisible by plan duration, something is off
    AND (months_diff % total_plan_months) != 0
    -- Ignore very new members (joined < 1 month ago) potentially
ORDER BY full_name;

-- 3. Check for Payment History Alignment
-- Does the number of payments * plan duration match the timeline?
SELECT
    m.full_name,
    m.joining_date,
    m.next_payment_due_date,
    p.name as plan_name,
    (COALESCE(p.base_duration_months, p.duration_months, 1) + COALESCE(p.bonus_duration_months, 0)) as plan_months,
    (SELECT COUNT(*) FROM gym_payments WHERE member_id = m.id) as payments_count
FROM gym_members m
LEFT JOIN gym_membership_plans p ON m.plan_id = p.id
WHERE 
    m.status = 'active'
    AND m.plan_id IS NOT NULL
    AND m.next_payment_due_date != (m.joining_date + ((COALESCE(p.base_duration_months, p.duration_months, 1) + COALESCE(p.bonus_duration_months, 0)) * (SELECT COUNT(*) FROM gym_payments WHERE member_id = m.id) || ' months')::INTERVAL)::DATE
ORDER BY m.full_name;
