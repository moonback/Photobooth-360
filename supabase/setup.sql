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

-- Logos bucket
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

CREATE POLICY "Public read — videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'photobooth-videos');

CREATE POLICY "Anon upload — videos"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'photobooth-videos');

CREATE POLICY "Anon delete — videos"
  ON storage.objects FOR DELETE
  TO anon
  USING (bucket_id = 'photobooth-videos');

-- -----------------------------------------------------------------------------
-- 3. RLS Policies — photobooth-logos
-- -----------------------------------------------------------------------------

CREATE POLICY "Public read — logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'photobooth-logos');

CREATE POLICY "Anon upload — logos"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'photobooth-logos');

CREATE POLICY "Anon delete — logos"
  ON storage.objects FOR DELETE
  TO anon
  USING (bucket_id = 'photobooth-logos');

-- -----------------------------------------------------------------------------
-- 4. Table event_settings  (stockage des réglages de l'événement)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS event_settings (
  id         TEXT        PRIMARY KEY DEFAULT 'default',
  settings   JSONB       NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ligne par défaut (garantit qu'un upsert fonctionne toujours)
INSERT INTO event_settings (id, settings)
VALUES ('default', '{}')
ON CONFLICT (id) DO NOTHING;

-- Trigger : met à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS event_settings_updated_at ON event_settings;
CREATE TRIGGER event_settings_updated_at
  BEFORE UPDATE ON event_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE event_settings ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire (nécessaire pour le splash screen sans authentification)
CREATE POLICY "Public read — event_settings"
  ON event_settings FOR SELECT
  USING (true);

-- Les utilisateurs anonymes peuvent insérer (nécessaire pour l'upsert initial)
CREATE POLICY "Anon insert — event_settings"
  ON event_settings FOR INSERT
  TO anon
  WITH CHECK (true);

-- Les utilisateurs anonymes peuvent mettre à jour (config mono-ligne)
CREATE POLICY "Anon update — event_settings"
  ON event_settings FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 5. Vérification (exécuter séparément)
-- -----------------------------------------------------------------------------
-- SELECT id, name, public FROM storage.buckets WHERE id IN ('photobooth-videos', 'photobooth-logos');
-- SELECT id, settings, updated_at FROM event_settings;
