import { useState, useEffect, useCallback } from 'react';
import { AppSettings, DEFAULT_SETTINGS } from '../components/SettingsModal';
import { loadSettings, saveSettings } from '../lib/settingsStore';

export type SettingsLoadState = 'loading' | 'ready' | 'error';

export interface UseSettingsReturn {
  settings: AppSettings;
  loadState: SettingsLoadState;
  /** Persist new settings and update local state */
  handleSave: (next: AppSettings) => Promise<void>;
}

/**
 * Manages app settings with Supabase persistence.
 * - Loads from Supabase on mount (falls back to localStorage / defaults)
 * - Upserts to Supabase + localStorage on every save
 */
export function useSettings(): UseSettingsReturn {
  const [settings, setSettings]   = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loadState, setLoadState] = useState<SettingsLoadState>('loading');

  // Load on mount
  useEffect(() => {
    let cancelled = false;
    loadSettings()
      .then((loaded) => {
        if (!cancelled) {
          setSettings(loaded);
          setLoadState('ready');
        }
      })
      .catch(() => {
        if (!cancelled) setLoadState('error');
      });
    return () => { cancelled = true; };
  }, []);

  const handleSave = useCallback(async (next: AppSettings) => {
    setSettings(next);
    await saveSettings(next);
  }, []);

  return { settings, loadState, handleSave };
}
