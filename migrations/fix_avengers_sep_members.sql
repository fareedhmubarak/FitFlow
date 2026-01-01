-- Remapping Plan for Avengers Gym Sep 3-Month Members
-- Goal: Shift Joining Date from Nov -> Sep (Back 2 months)
-- Target: 3-month members who joined in Sep but were migrated as Nov.

BEGIN;

-- 1. Create a temporary mapping table for the fix
CREATE TEMP TABLE usage_fix_map (
    phone_number text,
    correct_join_date date
);

-- 2. Insert the target members and their CORRECT Sep joining dates (MM/DD/YYYY from CSV)
INSERT INTO usage_fix_map (phone_number, correct_join_date) VALUES
('8309577946', '2025-09-20'), -- Pream
('9951000023', '2025-09-29'), -- Sujith
('7093631951', '2025-09-09'), -- Ajay bro
('9392160802', '2025-09-15'), -- Sakib
('9100115764', '2025-09-03'), -- Dinesh
('9676269036', '2025-09-03'), -- N. Babu
('9652658065', '2025-09-05'), -- Muniraj
('9600769757', '2025-09-05'), -- So Mohan kumar
('9676343710', '2025-09-06'), -- Janaki ram
('9100828815', '2025-09-01'), -- Devaraj
('9347471124', '2025-09-15'), -- S palani
('7842760116', '2025-09-15'), -- M Dinesh
('9177259338', '2025-09-15'), -- Subu
('8105396384', '2025-09-17'), -- Hemanth
('9655593412', '2025-09-15'), -- Prakash
('8722043110', '2025-09-18'), -- Ramanjinya
('7993637021', '2025-09-10'), -- Jaswanth
('8374052552', '2025-09-10'), -- Vinod
('8639091348', '2025-09-19'), -- Yugandhar
('9000909283', '2025-09-15'), -- Sheshadri
('7624883323', '2025-09-22'), -- Rajesh
('9182793938', '2025-09-10'), -- Madhan
('8150864627', '2025-09-29'), -- Bala subramnyam
('9550000648', '2025-09-30'), -- Dilly raj
('9573512931', '2025-09-01'), -- Br pavan
('9703999966', '2025-09-01'), -- Panidra
('9100795822', '2025-09-09'), -- Sherli
('8500255904', '2025-09-02'), -- Varun tej
('9035555651', '2025-09-11'), -- Suresh
('7799044383', '2025-09-15'), -- Mohan
('6300228181', '2025-09-15'); -- Vijay

-- 3. Update gym_payments (Shift the INITIAL payment date)
-- Only updates the payment matching the member's CURRENT join date (to be safe)
UPDATE gym_payments p
SET 
    payment_date = m_map.correct_join_date,
    due_date = m_map.correct_join_date
FROM gym_members m
JOIN usage_fix_map m_map ON m.phone = m_map.phone_number
WHERE p.member_id = m.id
AND p.payment_date = m.joining_date;

-- 4. Update gym_members (Shift Joining Date & End Date)
UPDATE gym_members m
SET 
    joining_date = m_map.correct_join_date,
    first_joining_date = m_map.correct_join_date,
    membership_start_date = m_map.correct_join_date,
    membership_end_date = m_map.correct_join_date + INTERVAL '3 months',
    next_payment_due_date = m_map.correct_join_date + INTERVAL '3 months'
FROM usage_fix_map m_map
WHERE m.phone = m_map.phone_number;

-- 5. Update gym_payment_schedule (Shift Future Due Date)
UPDATE gym_payment_schedule s
SET due_date = m_map.correct_join_date + INTERVAL '3 months'
FROM gym_members m
JOIN usage_fix_map m_map ON m.phone = m_map.phone_number
WHERE s.member_id = m.id
AND s.due_date > '2026-01-01';

-- 6. Update gym_membership_periods (CRITICAL for App UI)
UPDATE gym_membership_periods mp
SET 
    start_date = m_map.correct_join_date,
    end_date = m_map.correct_join_date + INTERVAL '3 months'
FROM gym_members m
JOIN usage_fix_map m_map ON m.phone = m_map.phone_number
WHERE mp.member_id = m.id
AND mp.start_date >= '2025-11-01';

-- 7. Insert Audit Log (gym_member_history)
INSERT INTO gym_member_history (
    id, gym_id, member_id, change_type, old_value, new_value, changed_by
)
SELECT 
    gen_random_uuid(),
    m.gym_id,
    m.id,
    'correction_migration_date',
    '{"joining_date": "2025-11-15"}',
    jsonb_build_object('joining_date', m_map.correct_join_date, 'reason', 'Correcting migration misalignment'),
    (SELECT id FROM gym_users LIMIT 1)
FROM gym_members m
JOIN usage_fix_map m_map ON m.phone = m_map.phone_number;

-- Clean up
DROP TABLE usage_fix_map;

COMMIT;
