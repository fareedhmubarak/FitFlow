-- Migration to add missing columns and storage bucket
-- Run this in Supabase SQL Editor

-- 1. Add missing columns to gym_members table (if they don't exist)
DO $$ 
BEGIN
  -- Add membership_start_date if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gym_members' AND column_name = 'membership_start_date') THEN
    ALTER TABLE gym_members ADD COLUMN membership_start_date DATE;
  END IF;
  
  -- Add membership_end_date if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gym_members' AND column_name = 'membership_end_date') THEN
    ALTER TABLE gym_members ADD COLUMN membership_end_date DATE;
  END IF;
  
  -- Add next_payment_due_date if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gym_members' AND column_name = 'next_payment_due_date') THEN
    ALTER TABLE gym_members ADD COLUMN next_payment_due_date DATE;
  END IF;
  
  -- Add total_payments_received if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gym_members' AND column_name = 'total_payments_received') THEN
    ALTER TABLE gym_members ADD COLUMN total_payments_received DECIMAL(10,2) DEFAULT 0;
  END IF;
  
  -- Add last_payment_date if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gym_members' AND column_name = 'last_payment_date') THEN
    ALTER TABLE gym_members ADD COLUMN last_payment_date DATE;
  END IF;
  
  -- Add last_payment_amount if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gym_members' AND column_name = 'last_payment_amount') THEN
    ALTER TABLE gym_members ADD COLUMN last_payment_amount DECIMAL(10,2) DEFAULT 0;
  END IF;
END $$;

-- 2. Update existing members with calculated dates
UPDATE gym_members SET
  membership_start_date = COALESCE(membership_start_date, joining_date),
  membership_end_date = COALESCE(
    membership_end_date,
    joining_date + CASE membership_plan
      WHEN 'monthly' THEN INTERVAL '1 month'
      WHEN 'quarterly' THEN INTERVAL '3 months'
      WHEN 'half_yearly' THEN INTERVAL '6 months'
      WHEN 'annual' THEN INTERVAL '12 months'
      ELSE INTERVAL '1 month'
    END
  ),
  next_payment_due_date = COALESCE(
    next_payment_due_date,
    joining_date + CASE membership_plan
      WHEN 'monthly' THEN INTERVAL '1 month'
      WHEN 'quarterly' THEN INTERVAL '3 months'
      WHEN 'half_yearly' THEN INTERVAL '6 months'
      WHEN 'annual' THEN INTERVAL '12 months'
      ELSE INTERVAL '1 month'
    END
  )
WHERE membership_start_date IS NULL OR membership_end_date IS NULL;

-- 3. Create 'images' storage bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Create RLS policies for the images bucket
DO $$
BEGIN
  -- Allow authenticated users to upload
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated uploads to images'
  ) THEN
    CREATE POLICY "Allow authenticated uploads to images"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'images' AND auth.role() = 'authenticated');
  END IF;

  -- Allow public read access
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read access to images'
  ) THEN
    CREATE POLICY "Allow public read access to images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'images');
  END IF;

  -- Allow authenticated users to delete their uploads
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated deletes to images'
  ) THEN
    CREATE POLICY "Allow authenticated deletes to images"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'images' AND auth.role() = 'authenticated');
  END IF;
END $$;

-- Done!
SELECT 'Migration completed successfully!' as result;
