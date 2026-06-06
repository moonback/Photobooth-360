import { supabase, SUPABASE_CONFIGURED } from './supabase';
import { AppSettings, DEFAULT_SETTINGS } from '../components/SettingsModal';

const TABLE = 'event_settings';
const ROW_ID = 'default';
const LS_KEY = 'photobooth360_settings';

function withStartupDefaults(settings: Partial<AppSettings> = {}): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    // Kiosk mode is intentionally restored on every app restart, even if an
    // operator disabled it during the previous session to access maintenance.
    kioskEnabled: true,
  };
}

// ─── LocalStorage fallback ────────────────────────────────────────────────────

function loadFromLocalStorage(): AppSettings {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return withStartupDefaults();
    return withStartupDefaults(JSON.parse(raw) as Partial<AppSettings>);
  } catch {
    return withStartupDefaults();
  }
}

function saveToLocalStorage(settings: AppSettings): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(withStartupDefaults(settings)));
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
      return withStartupDefaults();
    }

    // Merge with defaults so new fields added later are never undefined.
    // Kiosk mode is restored by default on every app restart.
    return withStartupDefaults(data.settings as Partial<AppSettings>);
  } catch (err) {
    console.error('[settingsStore] load error:', err);
    return withStartupDefaults();
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
      .upsert({ id: ROW_ID, settings: withStartupDefaults(settings) }, { onConflict: 'id' });

    if (error) {
      console.error('[settingsStore] save error:', error.message);
    }
  } catch (err) {
    console.error('[settingsStore] save exception:', err);
  }
}
