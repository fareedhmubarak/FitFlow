-- Create member progress tracking table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS gym_member_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gym_gyms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
  
  -- Date of progress record
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Photos (up to 4 URLs)
  photo_front TEXT,
  photo_back TEXT,
  photo_left TEXT,
  photo_right TEXT,
  
  -- Body measurements
  weight DECIMAL(5,2), -- in kg
  height DECIMAL(5,2), -- in cm
  bmi DECIMAL(4,2), -- auto-calculated
  body_fat_percentage DECIMAL(4,2),
  
  -- Body part measurements (in cm)
  chest DECIMAL(5,2),
  waist DECIMAL(5,2),
  hips DECIMAL(5,2),
  biceps_left DECIMAL(5,2),
  biceps_right DECIMAL(5,2),
  thighs_left DECIMAL(5,2),
  thighs_right DECIMAL(5,2),
  calves_left DECIMAL(5,2),
  calves_right DECIMAL(5,2),
  
  -- Additional info
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_member_progress_member_id ON gym_member_progress(member_id);
CREATE INDEX IF NOT EXISTS idx_member_progress_gym_id ON gym_member_progress(gym_id);
CREATE INDEX IF NOT EXISTS idx_member_progress_date ON gym_member_progress(record_date DESC);

-- Enable RLS
ALTER TABLE gym_member_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies (using get_current_gym_id function like other tables)
DROP POLICY IF EXISTS "Users can view own gym member progress" ON gym_member_progress;
CREATE POLICY "Users can view own gym member progress"
  ON gym_member_progress FOR SELECT
  USING (gym_id = get_current_gym_id());

DROP POLICY IF EXISTS "Users can insert member progress" ON gym_member_progress;
CREATE POLICY "Users can insert member progress"
  ON gym_member_progress FOR INSERT
  WITH CHECK (gym_id = get_current_gym_id());

DROP POLICY IF EXISTS "Users can update own gym member progress" ON gym_member_progress;
CREATE POLICY "Users can update own gym member progress"
  ON gym_member_progress FOR UPDATE
  USING (gym_id = get_current_gym_id());

DROP POLICY IF EXISTS "Users can delete own gym member progress" ON gym_member_progress;
CREATE POLICY "Users can delete own gym member progress"
  ON gym_member_progress FOR DELETE
  USING (gym_id = get_current_gym_id());

-- Function to auto-calculate BMI on insert/update
CREATE OR REPLACE FUNCTION calculate_bmi()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.weight IS NOT NULL AND NEW.height IS NOT NULL AND NEW.height > 0 THEN
    NEW.bmi := ROUND((NEW.weight / ((NEW.height / 100) * (NEW.height / 100)))::numeric, 2);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate BMI
DROP TRIGGER IF EXISTS trigger_calculate_bmi ON gym_member_progress;
CREATE TRIGGER trigger_calculate_bmi
  BEFORE INSERT OR UPDATE ON gym_member_progress
  FOR EACH ROW
  EXECUTE FUNCTION calculate_bmi();

-- Update timestamp trigger (uses existing function)
DROP TRIGGER IF EXISTS update_member_progress_timestamp ON gym_member_progress;
CREATE TRIGGER update_member_progress_timestamp
  BEFORE UPDATE ON gym_member_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
