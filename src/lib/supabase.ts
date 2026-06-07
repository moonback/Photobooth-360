import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * supabase — may be null if env vars are not configured.
 * All upload/download functions check for null and fall back gracefully.
 */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  return supabase;
}

export const BUCKET = 'photobooth-videos';
export const LOGO_BUCKET = 'photobooth-logos';
export const SUPABASE_CONFIGURED = Boolean(supabase);
