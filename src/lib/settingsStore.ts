import { supabase, SUPABASE_CONFIGURED } from './supabase';
import { AppSettings, DEFAULT_SETTINGS } from '../components/SettingsModal';

const TABLE = 'event_settings';
const ROW_ID = 'default';
const LS_KEY = 'photobooth360_settings';

// ─── LocalStorage fallback ────────────────────────────────────────────────────

function loadFromLocalStorage(): AppSettings {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveToLocalStorage(settings: AppSettings): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(settings));
  } catch {
    // ignore quota errors
  }
}

// ─── Supabase read/write ──────────────────────────────────────────────────────

/**
 * Load settings from Supabase (or localStorage if not configured).
 * Always resolves — returns DEFAULT_SETTINGS on any error.
 */
export async function loadSettings(): Promise<AppSettings> {
  if (!SUPABASE_CONFIGURED || !supabase) {
    return loadFromLocalStorage();
  }

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('settings')
      .eq('id', ROW_ID)
      .single();

    if (error || !data?.settings) {
      console.warn('[settingsStore] load failed, using defaults:', error?.message);
      return DEFAULT_SETTINGS;
    }

    // Merge with defaults so new fields added later are never undefined
    return { ...DEFAULT_SETTINGS, ...(data.settings as Partial<AppSettings>) };
  } catch (err) {
    console.error('[settingsStore] load error:', err);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Persist settings to Supabase (upsert) AND localStorage.
 * localStorage acts as a cache/fallback for offline use.
 */
export async function saveSettings(settings: AppSettings): Promise<void> {
  // Always save locally first (instant, no network needed)
  saveToLocalStorage(settings);

  if (!SUPABASE_CONFIGURED || !supabase) return;

  try {
    const { error } = await supabase
      .from(TABLE)
      .upsert({ id: ROW_ID, settings }, { onConflict: 'id' });

    if (error) {
      console.error('[settingsStore] save error:', error.message);
    }
  } catch (err) {
    console.error('[settingsStore] save exception:', err);
  }
}
