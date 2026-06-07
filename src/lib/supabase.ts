import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * supabase — may be null if env vars are not configured.
 * All upload/download functions check for null and fall back gracefully.
 */
export const supabase: SupabaseClient | null = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  return supabase;
}

export const BUCKET = 'photobooth-videos';
export const LOGO_BUCKET = 'photobooth-logos';
export const SUPABASE_CONFIGURED = Boolean(supabase);


let supabaseUnavailableUntil = 0;

export function isNetworkAvailable(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine;
}

export function isSupabaseReachable(): boolean {
  return SUPABASE_CONFIGURED && isNetworkAvailable() && Date.now() >= supabaseUnavailableUntil;
}

export function markSupabaseUnavailable(cooldownMs = 60_000): void {
  supabaseUnavailableUntil = Math.max(supabaseUnavailableUntil, Date.now() + cooldownMs);
}

export function markSupabaseAvailable(): void {
  supabaseUnavailableUntil = 0;
}

export function isNetworkError(error: unknown): boolean {
  const message = error instanceof Error
    ? error.message
    : typeof error === 'object' && error && 'message' in error
      ? String((error as { message?: unknown }).message)
      : String(error);

  return /failed to fetch|network error|networkerror|name_not_resolved|load failed|fetch/i.test(message);
}
