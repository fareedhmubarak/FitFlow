-- =====================================================
-- FITFLOW PRODUCTION MIGRATION - STORAGE SETUP
-- Date: December 6, 2025
-- Purpose: Create storage buckets and policies
-- =====================================================

-- =====================================================
-- CREATE STORAGE BUCKET
-- =====================================================
-- Note: This must be run in Supabase Dashboard > Storage
-- OR via SQL if you have permissions

INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STORAGE POLICIES
-- =====================================================

-- Allow public read access to images
CREATE POLICY "Allow public read access to images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'images');

-- Allow authenticated uploads to images
CREATE POLICY "Allow authenticated uploads to images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'images' AND auth.role() = 'authenticated');

-- Allow service uploads to images (for system operations)
CREATE POLICY "Allow service uploads to images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'images');

-- Allow authenticated deletes to images
CREATE POLICY "Allow authenticated deletes to images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'images' AND auth.role() = 'authenticated');
