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
-- 5. Table event_analytics (statistiques en temps réel)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS event_analytics (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        TEXT        NOT NULL DEFAULT 'default',
  video_id        TEXT        NOT NULL,
  action_type     TEXT        NOT NULL CHECK (action_type IN ('capture', 'share', 'download', 'view')),
  metadata        JSONB       DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour les requêtes de stats
CREATE INDEX IF NOT EXISTS idx_event_analytics_event_id ON event_analytics(event_id);
CREATE INDEX IF NOT EXISTS idx_event_analytics_created_at ON event_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_analytics_action_type ON event_analytics(action_type);

-- RLS
ALTER TABLE event_analytics ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire les stats
CREATE POLICY "Public read — event_analytics"
  ON event_analytics FOR SELECT
  USING (true);

-- Les utilisateurs anonymes peuvent insérer des événements
CREATE POLICY "Anon insert — event_analytics"
  ON event_analytics FOR INSERT
  TO anon
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 6. Vue pour les statistiques agrégées
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW event_stats AS
SELECT 
  event_id,
  COUNT(*) FILTER (WHERE action_type = 'capture') as total_captures,
  COUNT(*) FILTER (WHERE action_type = 'share') as total_shares,
  COUNT(*) FILTER (WHERE action_type = 'download') as total_downloads,
  COUNT(*) FILTER (WHERE action_type = 'view') as total_views,
  COUNT(DISTINCT video_id) as unique_videos,
  MIN(created_at) as first_activity,
  MAX(created_at) as last_activity,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as activity_last_hour,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as activity_last_24h
FROM event_analytics
GROUP BY event_id;

-- Grant access à la vue
GRANT SELECT ON event_stats TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 7. Fonction pour récupérer les stats en temps réel
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_event_stats(p_event_id TEXT DEFAULT 'default')
RETURNS TABLE (
  total_captures BIGINT,
  total_shares BIGINT,
  total_downloads BIGINT,
  total_views BIGINT,
  unique_videos BIGINT,
  first_activity TIMESTAMPTZ,
  last_activity TIMESTAMPTZ,
  activity_last_hour BIGINT,
  activity_last_24h BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM event_stats WHERE event_id = p_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute à la fonction
GRANT EXECUTE ON FUNCTION get_event_stats(TEXT) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 8. Vérification (exécuter séparément)
-- -----------------------------------------------------------------------------
-- SELECT id, name, public FROM storage.buckets WHERE id IN ('photobooth-videos', 'photobooth-logos');
-- SELECT id, settings, updated_at FROM event_settings;
-- SELECT * FROM event_stats;
