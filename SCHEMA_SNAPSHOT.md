# Schema Snapshot - Dev Environment (GymDev)
Generated on: 2025-12-08

## Tables & Columns
Verify these exist in Production.

| Table Name | Column Name | Type | Nullable | Default |
|------------|-------------|------|----------|---------|
| gym_member_history | id | uuid | NO | uuid_generate_v4() |
| gym_member_history | gym_id | uuid | NO | |
| gym_member_history | member_id | uuid | NO | |
| gym_member_history | change_type | text | NO | |
| gym_member_history | old_value | jsonb | YES | |
| gym_member_history | new_value | jsonb | YES | |
| gym_member_history | changed_by | uuid | YES | |
| gym_member_history | created_at | timestamp with time zone | NO | now() |
| gym_members | id | uuid | NO | uuid_generate_v4() |
| gym_members | gym_id | uuid | NO | |
| gym_members | full_name | text | NO | |
| gym_members | phone | text | NO | |
| gym_members | email | text | YES | |
| gym_members | status | text | YES | 'active'::text |
| gym_members | joining_date | date | NO | CURRENT_DATE |
| gym_members | membership_plan | text | YES | |
| gym_members | plan_amount | numeric | YES | |
| gym_members | membership_end_date | date | YES | |
| gym_members | next_payment_due_date | date | YES | |
| gym_members | photo_url | text | YES | |
| gym_members | gender | text | YES | |
| gym_members | height | numeric | YES | |
| gym_members | weight | numeric | YES | |
| gym_members | deactivated_at | timestamp with time zone | YES | |
| gym_members | total_periods | integer | YES | 1 |
| gym_members | created_at | timestamp with time zone | NO | now() |
| gym_members | updated_at | timestamp with time zone | NO | now() |
| ... | ... | ... | ... | ... |

*(Note: Use `SELECT ... FROM information_schema.columns` to generate full diff)*

## RLS Policies for `gym_member_history`
| Policy Name | Action | Roles | Qual | With Check |
|-------------|--------|-------|------|------------|
| gym_member_history_insert | INSERT | public | - | true |
| gym_member_history_select | SELECT | public | (gym_id = get_current_gym_id()) | - |

## RLS Policies for `gym_payments`
| Policy Name | Action | Roles | Qual | With Check |
|-------------|--------|-------|------|------------|
| gym_payments_insert | INSERT | public | - | true |
| gym_payments_delete | DELETE | public | (gym_id = get_current_gym_id()) | - |
| gym_payments_select | SELECT | public | (gym_id = get_current_gym_id()) | - |
| gym_payments_update | UPDATE | public | (gym_id = get_current_gym_id()) | - |

---
**Instructions for Comparison:**
1.  Run the Schema Query on Production.
2.  Compare the lists.
3.  Ensure `days_late` in `gym_payments` is a GENERATED column in both (or consistent).
