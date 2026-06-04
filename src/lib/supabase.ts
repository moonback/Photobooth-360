import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * supabase — may be null if env vars are not configured.
 * All upload/download functions check for null and fall back gracefully.
 */
export const supabase = url && key ? createClient(url, key) : null;

export const BUCKET = 'photobooth-videos';
export const LOGO_BUCKET = 'photobooth-logos';
export const SUPABASE_CONFIGURED = Boolean(supabase);
