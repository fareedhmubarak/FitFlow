-- =====================================================
-- COMPLETE PRODUCTION MIGRATION SCRIPT
-- Apply this to sync Production with Development
-- Project: FitFlow (dbtdarmxvgbxeinwcxka)
-- Date: 2025-12-08
-- Generated from: full_schema_compare.cjs
-- =====================================================

-- ===========================================
-- 1. ADD deactivated_at COLUMN to gym_members
-- ===========================================
-- This column stores when a member was marked inactive

ALTER TABLE public.gym_members 
ADD COLUMN IF NOT EXISTS deactivated_at timestamptz NULL;

-- ===========================================
-- 2. CREATE gym_payment_schedule_history TABLE
-- ===========================================
-- This table tracks payment schedule changes (for audit trail when deleting payments)

CREATE TABLE IF NOT EXISTS public.gym_payment_schedule_history (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    gym_id uuid NOT NULL,
    member_id uuid NOT NULL,
    schedule_id uuid NOT NULL,
    old_due_date date NULL,
    new_due_date date NULL,
    old_status varchar NULL,
    new_status varchar NULL,
    change_type varchar NOT NULL,
    payment_id uuid NULL,
    created_by uuid NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT gym_payment_schedule_history_pkey PRIMARY KEY (id)
);

-- Foreign key constraints (drop first if exists, then add)
DO $$ 
BEGIN
    -- Drop existing constraints if they exist
    ALTER TABLE public.gym_payment_schedule_history 
    DROP CONSTRAINT IF EXISTS gym_payment_schedule_history_gym_fkey;
    
    ALTER TABLE public.gym_payment_schedule_history 
    DROP CONSTRAINT IF EXISTS gym_payment_schedule_history_member_fkey;
    
    -- Add constraints
    ALTER TABLE public.gym_payment_schedule_history 
    ADD CONSTRAINT gym_payment_schedule_history_gym_fkey 
    FOREIGN KEY (gym_id) REFERENCES public.gym_gyms(id) ON DELETE CASCADE;
    
    ALTER TABLE public.gym_payment_schedule_history 
    ADD CONSTRAINT gym_payment_schedule_history_member_fkey 
    FOREIGN KEY (member_id) REFERENCES public.gym_members(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_schedule_history_member 
ON public.gym_payment_schedule_history(member_id);

CREATE INDEX IF NOT EXISTS idx_payment_schedule_history_gym 
ON public.gym_payment_schedule_history(gym_id);

-- Enable RLS
ALTER TABLE public.gym_payment_schedule_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gym_payment_schedule_history
DROP POLICY IF EXISTS "gym_payment_schedule_history_insert" ON public.gym_payment_schedule_history;
CREATE POLICY "gym_payment_schedule_history_insert" ON public.gym_payment_schedule_history 
AS PERMISSIVE FOR INSERT TO public 
WITH CHECK (true);

DROP POLICY IF EXISTS "gym_payment_schedule_history_select" ON public.gym_payment_schedule_history;
CREATE POLICY "gym_payment_schedule_history_select" ON public.gym_payment_schedule_history 
AS PERMISSIVE FOR SELECT TO public 
USING (gym_id = get_current_gym_id());

-- ===========================================
-- 3. ADD MISSING RLS POLICIES for record_versions
-- ===========================================

DROP POLICY IF EXISTS "Allow read access to version history" ON public.record_versions;
CREATE POLICY "Allow read access to version history" ON public.record_versions 
AS PERMISSIVE FOR SELECT TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow system inserts to version history" ON public.record_versions;
CREATE POLICY "Allow system inserts to version history" ON public.record_versions 
AS PERMISSIVE FOR INSERT TO public 
WITH CHECK (true);

-- ===========================================
-- VERIFICATION QUERIES (Run after migration)
-- ===========================================

-- Check deactivated_at column exists:
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'gym_members' AND column_name = 'deactivated_at';

-- Check gym_payment_schedule_history table exists:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_name = 'gym_payment_schedule_history';

-- Check policies exist:
-- SELECT policyname FROM pg_policies 
-- WHERE tablename = 'record_versions';

-- ===========================================
-- DONE! Production schema is now in sync.
-- ===========================================
