-- =====================================================
-- Setup Storage Policies for Jingles (Intro/Outro)
-- =====================================================
-- This script creates the necessary policies to allow
-- anonymous uploads and public reads for jingles stored
-- in the 'jingles/' folder of the photobooth360 bucket

-- Note: Make sure the bucket 'photobooth360' exists before running this script

-- =====================================================
-- Drop existing policies if they exist
-- =====================================================
DROP POLICY IF EXISTS "Allow anonymous uploads to jingles" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to jingles" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to jingles" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from jingles" ON storage.objects;

-- =====================================================
-- 1. Allow anonymous uploads to jingles/ folder
-- =====================================================
CREATE POLICY "Allow anonymous uploads to jingles"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'photobooth360' 
  AND (storage.foldername(name))[1] = 'jingles'
);

-- =====================================================
-- 2. Allow public read access to jingles/ folder
-- =====================================================
CREATE POLICY "Public read access to jingles"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'photobooth360' 
  AND (storage.foldername(name))[1] = 'jingles'
);

-- =====================================================
-- 3. Allow authenticated users to update their jingles
-- =====================================================
CREATE POLICY "Allow authenticated updates to jingles"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'photobooth360' 
  AND (storage.foldername(name))[1] = 'jingles'
)
WITH CHECK (
  bucket_id = 'photobooth360' 
  AND (storage.foldername(name))[1] = 'jingles'
);

-- =====================================================
-- 4. Allow authenticated users to delete their jingles
-- =====================================================
CREATE POLICY "Allow authenticated deletes from jingles"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'photobooth360' 
  AND (storage.foldername(name))[1] = 'jingles'
);

-- =====================================================
-- Verification queries
-- =====================================================
-- Check if policies were created successfully
SELECT 
  policyname, 
  roles, 
  cmd, 
  qual, 
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%jingles%'
ORDER BY policyname;

-- =====================================================
-- Usage examples
-- =====================================================
-- Upload a jingle from the app:
-- POST /storage/v1/object/photobooth360/jingles/intro-1234567890.mp4
-- Authorization: Bearer <SUPABASE_ANON_KEY>

-- Get a jingle public URL:
-- GET /storage/v1/object/public/photobooth360/jingles/intro-1234567890.mp4
