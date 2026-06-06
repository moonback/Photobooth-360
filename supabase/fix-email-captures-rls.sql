-- =============================================================================
-- FIX: email_captures RLS — À exécuter dans Supabase SQL Editor
-- Corrige l'erreur: "new row violates row-level security policy"
-- =============================================================================

-- 1. Supprimer les policies existantes (si elles existent)
DROP POLICY IF EXISTS "Public insert — email_captures" ON email_captures;
DROP POLICY IF EXISTS "Admin read — email_captures" ON email_captures;
DROP POLICY IF EXISTS "Anon insert — email_captures" ON email_captures;

-- 2. S'assurer que RLS est activé
ALTER TABLE email_captures ENABLE ROW LEVEL SECURITY;

-- 3. Recréer les policies correctement

-- Permettre l'insertion à tous (anon + authenticated)
CREATE POLICY "Allow public insert"
  ON email_captures
  FOR INSERT
  WITH CHECK (true);

-- Permettre la lecture à tous (pour l'admin dashboard)
-- Note: en production, restreindre avec auth.role() = 'authenticated'
CREATE POLICY "Allow public select"
  ON email_captures
  FOR SELECT
  USING (true);

-- Permettre la mise à jour (pour marquer email_sent = true)
CREATE POLICY "Allow public update"
  ON email_captures
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 4. Grants explicites sur la table
GRANT ALL ON email_captures TO anon;
GRANT ALL ON email_captures TO authenticated;

-- 5. Grant sur la séquence (pour BIGSERIAL / auto-increment)
GRANT USAGE, SELECT ON SEQUENCE email_captures_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE email_captures_id_seq TO authenticated;

-- 6. Vérification
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'email_captures';
