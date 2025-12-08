-- =====================================================
-- BACKFILL: Add member_created history for existing members
-- Project: FitFlow Production
-- Date: 2025-12-08
-- =====================================================

-- This inserts a "member_created" history record for all members
-- who don't already have one. Uses their joining_date as the event date.

INSERT INTO gym_member_history (
    gym_id, 
    member_id, 
    change_type, 
    old_value,
    new_value,
    description, 
    created_at
)
SELECT 
    m.gym_id,
    m.id,
    'member_created',
    NULL,
    jsonb_build_object(
        'status', 'active',
        'membership_plan', m.membership_plan,
        'plan_amount', m.plan_amount
    ),
    'Initial membership joined (Backfill)',
    -- Use joining_date at 9:00 AM, fallback to created_at
    (COALESCE(m.joining_date, m.created_at::date) + time '09:00:00')::timestamptz
FROM gym_members m
WHERE NOT EXISTS (
    SELECT 1 
    FROM gym_member_history h 
    WHERE h.member_id = m.id 
    AND h.change_type IN ('member_created', 'member_joined')
);

-- =====================================================
-- VERIFICATION: Count how many records were created
-- =====================================================
-- Run this after to see how many members were backfilled:
-- SELECT COUNT(*) as backfilled_count 
-- FROM gym_member_history 
-- WHERE description = 'Initial membership joined (Backfill)';
