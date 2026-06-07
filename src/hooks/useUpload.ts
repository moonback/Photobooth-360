import { useCallback, useEffect, useState } from 'react';
import { uploadVideo, UploadStatus, listVideosFromBucket } from '../lib/uploadVideo';
import { SUPABASE_CONFIGURED } from '../lib/supabase';
import { syncUploadQueue } from '../lib/offlineSync';
import {
  enqueueUpload,
  getUploadQueueStats,
  requestPersistentStorage,
  type UploadQueueStats,
} from '../lib/videoStore';

export interface UseUploadReturn {
  upload: (blobUrl: string) => Promise<string | null>;
  enqueueLocalUpload: (videoId: string, size: number) => Promise<void>;
  syncNow: () => Promise<string | null>;
  listVideos: () => Promise<string[]>;
  status: UploadStatus;
  progress: number;
  publicUrl: string;
  storagePath: string;
  isConfigured: boolean;
  isOnline: boolean;
  isPersistent: boolean;
  queueStats: UploadQueueStats;
  activeSyncId: string;
  lastSyncError: string;
}

const EMPTY_STATS: UploadQueueStats = { queued: 0, uploading: 0, synced: 0, error: 0, total: 0 };

export function useUpload(): UseUploadReturn {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [publicUrl, setPublicUrl] = useState('');
  const [storagePath, setStoragePath] = useState('');
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [isPersistent, setIsPersistent] = useState(false);
  const [queueStats, setQueueStats] = useState<UploadQueueStats>(EMPTY_STATS);
  const [activeSyncId, setActiveSyncId] = useState('');
  const [lastSyncError, setLastSyncError] = useState('');

  const refreshStats = useCallback(async () => {
    setQueueStats(await getUploadQueueStats());
  }, []);

  const syncNow = useCallback(async (): Promise<string | null> => {
    if (!SUPABASE_CONFIGURED) return null;

    const result = await syncUploadQueue((event) => {
      if (event.type === 'start') {
        setStatus('uploading');
        setProgress(0);
        setActiveSyncId(event.item.videoId);
        setLastSyncError('');
      }

      if (event.type === 'progress') {
        setProgress(event.progress);
      }

      if (event.type === 'success') {
        setPublicUrl(event.result.publicUrl);
        setStoragePath(event.result.path);
        setStatus('done');
        setProgress(100);
        setActiveSyncId('');
      }

      if (event.type === 'error') {
        setStatus('error');
        setLastSyncError(event.error.message);
        setActiveSyncId('');
      }

      if (event.type === 'stats') {
        setQueueStats(event.stats);
      }
    });

    return result?.publicUrl ?? null;
  }, []);

  useEffect(() => {
    refreshStats().catch(console.error);

    requestPersistentStorage()
      .then(setIsPersistent)
      .catch(() => setIsPersistent(false));
  }, [refreshStats]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncNow().catch(console.error);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (isOnline) {
      syncNow().catch(console.error);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOnline, syncNow]);

  const upload = useCallback(async (blobUrl: string): Promise<string | null> => {
    if (!SUPABASE_CONFIGURED) return null;

    setStatus('uploading');
    setProgress(0);
    setPublicUrl('');
    setStoragePath('');

    try {
      const result = await uploadVideo(blobUrl, (pct) => setProgress(pct));
      if (!result) {
        setStatus('error');
        return null;
      }
      setPublicUrl(result.publicUrl);
      setStoragePath(result.path);
      setStatus('done');
      await refreshStats();
      return result.publicUrl;
    } catch (err) {
      console.error('[useUpload]', err);
      setLastSyncError(err instanceof Error ? err.message : 'Unknown upload error');
      setStatus('error');
      return null;
    }
  }, [refreshStats]);

  const enqueueLocalUpload = useCallback(async (videoId: string, size: number): Promise<void> => {
    if (!SUPABASE_CONFIGURED) return;

    await enqueueUpload(videoId, size);
    setStatus(isOnline ? 'idle' : 'queued');
    await refreshStats();

    if (isOnline) {
      syncNow().catch(console.error);
    }
  }, [isOnline, refreshStats, syncNow]);

  const listVideos = useCallback(async (): Promise<string[]> => {
    if (!SUPABASE_CONFIGURED) return [];
    const videos = await listVideosFromBucket();
    return videos.map((video) => video.url);
  }, []);

  return {
    upload,
    enqueueLocalUpload,
    syncNow,
    listVideos,
    status,
    progress,
    publicUrl,
    storagePath,
    isConfigured: SUPABASE_CONFIGURED,
    isOnline,
    isPersistent,
    queueStats,
    activeSyncId,
    lastSyncError,
  };
}
