import { SUPABASE_CONFIGURED } from './supabase';
import { uploadVideoBlob, type UploadResult } from './uploadVideo';
import {
  listUploadQueue,
  loadVideoBlob,
  putUploadQueueItem,
  type UploadQueueItem,
  type UploadQueueStats,
  getUploadQueueStats,
} from './videoStore';

type SyncEvent =
  | { type: 'start'; item: UploadQueueItem }
  | { type: 'progress'; item: UploadQueueItem; progress: number }
  | { type: 'success'; item: UploadQueueItem; result: UploadResult }
  | { type: 'error'; item: UploadQueueItem; error: Error }
  | { type: 'stats'; stats: UploadQueueStats };

export type SyncListener = (event: SyncEvent) => void;

let syncInFlight: Promise<UploadResult | null> | null = null;

function retryDelayMs(attempts: number) {
  const capped = Math.min(attempts, 6);
  return Math.min(60_000, 2_000 * 2 ** capped);
}

function canSync() {
  return SUPABASE_CONFIGURED && (typeof navigator === 'undefined' || navigator.onLine);
}

async function emitStats(listener?: SyncListener) {
  listener?.({ type: 'stats', stats: await getUploadQueueStats() });
}

export async function syncUploadQueue(listener?: SyncListener): Promise<UploadResult | null> {
  if (syncInFlight) return syncInFlight;

  syncInFlight = (async () => {
    if (!canSync()) {
      await emitStats(listener);
      return null;
    }

    const now = Date.now();
    const items = (await listUploadQueue()).filter((item) => {
      if (item.status === 'synced') return false;
      if (item.status === 'uploading') return true;
      return !item.nextRetryAt || item.nextRetryAt <= now;
    });

    let lastResult: UploadResult | null = null;

    for (const item of items) {
      if (!canSync()) break;

      const blob = await loadVideoBlob(item.videoId);
      if (!blob) {
        const nextItem: UploadQueueItem = {
          ...item,
          status: 'error',
          attempts: item.attempts + 1,
          lastError: 'Local media missing from IndexedDB',
          nextRetryAt: Date.now() + retryDelayMs(item.attempts + 1),
        };
        await putUploadQueueItem(nextItem);
        listener?.({ type: 'error', item: nextItem, error: new Error(nextItem.lastError) });
        await emitStats(listener);
        continue;
      }

      const uploadingItem: UploadQueueItem = { ...item, status: 'uploading', lastError: undefined };
      await putUploadQueueItem(uploadingItem);
      listener?.({ type: 'start', item: uploadingItem });
      await emitStats(listener);

      try {
        const result = await uploadVideoBlob(blob, (progress) => {
          listener?.({ type: 'progress', item: uploadingItem, progress });
        }, item.videoId);

        if (!result) throw new Error('Supabase is not configured');

        const syncedItem: UploadQueueItem = {
          ...uploadingItem,
          status: 'synced',
          publicUrl: result.publicUrl,
          path: result.path,
          nextRetryAt: undefined,
          lastError: undefined,
        };
        await putUploadQueueItem(syncedItem);
        listener?.({ type: 'success', item: syncedItem, result });
        await emitStats(listener);
        lastResult = result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown upload error');
        const attempts = item.attempts + 1;
        const errorItem: UploadQueueItem = {
          ...item,
          status: 'error',
          attempts,
          lastError: err.message,
          nextRetryAt: Date.now() + retryDelayMs(attempts),
        };
        await putUploadQueueItem(errorItem);
        listener?.({ type: 'error', item: errorItem, error: err });
        await emitStats(listener);
      }
    }

    await emitStats(listener);
    return lastResult;
  })().finally(() => {
    syncInFlight = null;
  });

  return syncInFlight;
}
