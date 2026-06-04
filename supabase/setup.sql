-- =============================================================================
-- Photobooth-360 — Supabase Storage Setup
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Buckets
-- -----------------------------------------------------------------------------

-- Videos bucket (already exists if you used the app before — safe to re-run)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photobooth-videos',
  'photobooth-videos',
  true,
  524288000,          -- 500 MB max per video
  ARRAY['video/webm', 'video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- Logos bucket (new)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photobooth-logos',
  'photobooth-logos',
  true,
  5242880,            -- 5 MB max per logo
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. RLS Policies — photobooth-videos
-- -----------------------------------------------------------------------------

-- Allow anyone to read videos (public bucket, but explicit policy is good practice)
CREATE POLICY "Public read — videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'photobooth-videos');

-- Allow anonymous users to upload videos
CREATE POLICY "Anon upload — videos"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'photobooth-videos');

-- Allow anonymous users to delete their own uploads (optional)
CREATE POLICY "Anon delete — videos"
  ON storage.objects FOR DELETE
  TO anon
  USING (bucket_id = 'photobooth-videos');

-- -----------------------------------------------------------------------------
-- 3. RLS Policies — photobooth-logos
-- -----------------------------------------------------------------------------

-- Allow anyone to read logos
CREATE POLICY "Public read — logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'photobooth-logos');

-- Allow anonymous users to upload logos
CREATE POLICY "Anon upload — logos"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'photobooth-logos');

-- Allow anonymous users to replace / delete logos
CREATE POLICY "Anon delete — logos"
  ON storage.objects FOR DELETE
  TO anon
  USING (bucket_id = 'photobooth-logos');

-- -----------------------------------------------------------------------------
-- 4. Verify (optional — run separately to check)
-- -----------------------------------------------------------------------------
-- SELECT id, name, public FROM storage.buckets WHERE id IN ('photobooth-videos', 'photobooth-logos');
-- SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'objects' ORDER BY policyname;
