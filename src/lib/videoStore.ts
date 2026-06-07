/**
 * videoStore — IndexedDB wrapper for storing recorded video blobs locally.
 *
 * Videos are stored by a short random ID. The QR Code URL contains this ID,
 * so the share page can retrieve the blob from the same browser/device.
 *
 * The upload queue lives in the same database so captures remain protected when
 * the network drops. A video is never removed automatically after upload: the
 * local copy is the loss-prevention source of truth until an operator exports
 * or clears the gallery intentionally.
 */

const DB_NAME = 'photobooth360';
const VIDEO_STORE = 'videos';
const UPLOAD_QUEUE_STORE = 'uploadQueue';
const DB_VERSION = 2;

export type QueueStatus = 'queued' | 'uploading' | 'synced' | 'error';

export interface StoredVideoRecord {
  blob: Blob;
  createdAt: string;
  mimeType: string;
  size: number;
}

export interface UploadQueueItem {
  id: string;
  videoId: string;
  status: QueueStatus;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  nextRetryAt?: number;
  lastError?: string;
  publicUrl?: string;
  path?: string;
  size: number;
}

export interface UploadQueueStats {
  queued: number;
  uploading: number;
  synced: number;
  error: number;
  total: number;
}

function ensureStores(db: IDBDatabase) {
  if (!db.objectStoreNames.contains(VIDEO_STORE)) {
    db.createObjectStore(VIDEO_STORE);
  }

  if (!db.objectStoreNames.contains(UPLOAD_QUEUE_STORE)) {
    db.createObjectStore(UPLOAD_QUEUE_STORE, { keyPath: 'id' });
  }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => ensureStores(req.result);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function normalizeVideoRecord(value: unknown): StoredVideoRecord | null {
  if (value instanceof Blob) {
    return {
      blob: value,
      createdAt: new Date().toISOString(),
      mimeType: value.type || 'video/webm',
      size: value.size,
    };
  }

  if (
    value &&
    typeof value === 'object' &&
    'blob' in value &&
    (value as { blob?: unknown }).blob instanceof Blob
  ) {
    const record = value as Partial<StoredVideoRecord> & { blob: Blob };
    return {
      blob: record.blob,
      createdAt: record.createdAt || new Date().toISOString(),
      mimeType: record.mimeType || record.blob.type || 'video/webm',
      size: record.size || record.blob.size,
    };
  }

  return null;
}

/** Ask the browser for persistent storage when available to reduce eviction risk. */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;

  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/** Save a blob URL (converted to Blob) and return a short random ID. */
export async function saveVideo(blobUrl: string, preferredId?: string): Promise<string> {
  const id = preferredId || Math.random().toString(36).slice(2, 10); // e.g. "k7x2m9qp"
  const blob = await fetch(blobUrl).then((r) => r.blob());
  const db = await openDB();
  const record: StoredVideoRecord = {
    blob,
    createdAt: new Date().toISOString(),
    mimeType: blob.type || 'video/webm',
    size: blob.size,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(VIDEO_STORE, 'readwrite');
    tx.objectStore(VIDEO_STORE).put(record, id);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

/** Retrieve a stored blob by ID and return an object URL. */
export async function loadVideo(id: string): Promise<string | null> {
  const record = await loadVideoRecord(id);
  return record ? URL.createObjectURL(record.blob) : null;
}

/** Retrieve a stored blob by ID. */
export async function loadVideoBlob(id: string): Promise<Blob | null> {
  const record = await loadVideoRecord(id);
  return record?.blob ?? null;
}

/** Retrieve complete video metadata by ID. */
export async function loadVideoRecord(id: string): Promise<StoredVideoRecord | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VIDEO_STORE, 'readonly');
    const req = tx.objectStore(VIDEO_STORE).get(id);
    req.onsuccess = () => resolve(normalizeVideoRecord(req.result));
    req.onerror = () => reject(req.error);
  });
}

/** Delete a stored video (optional cleanup). */
export async function deleteVideo(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([VIDEO_STORE, UPLOAD_QUEUE_STORE], 'readwrite');
    tx.objectStore(VIDEO_STORE).delete(id);
    tx.objectStore(UPLOAD_QUEUE_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Get all stored videos with their IDs. */
export async function getAllVideos(): Promise<Array<{ id: string; url: string }>> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VIDEO_STORE, 'readonly');
    const store = tx.objectStore(VIDEO_STORE);
    const req = store.getAllKeys();
    
    req.onsuccess = () => {
      const keys = req.result as string[];
      const videos: Array<{ id: string; url: string }> = [];
      let pending = keys.length;
      
      if (pending === 0) {
        resolve([]);
        return;
      }
      
      keys.forEach((key) => {
        const getReq = store.get(key);
        getReq.onsuccess = () => {
          const record = normalizeVideoRecord(getReq.result);
          if (record) {
            videos.push({
              id: key as string,
              url: URL.createObjectURL(record.blob),
            });
          }
          pending--;
          if (pending === 0) {
            resolve(videos);
          }
        };
        getReq.onerror = () => {
          pending--;
          if (pending === 0) {
            resolve(videos);
          }
        };
      });
    };
    req.onerror = () => reject(req.error);
  });
}

/** Get all stored videos with their blobs (for export). */
export async function getAllVideosWithBlobs(): Promise<Array<{ id: string; blob: Blob }>> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VIDEO_STORE, 'readonly');
    const store = tx.objectStore(VIDEO_STORE);
    const req = store.getAllKeys();
    
    req.onsuccess = () => {
      const keys = req.result as string[];
      const videos: Array<{ id: string; blob: Blob }> = [];
      let pending = keys.length;
      
      if (pending === 0) {
        resolve([]);
        return;
      }
      
      keys.forEach((key) => {
        const getReq = store.get(key);
        getReq.onsuccess = () => {
          const record = normalizeVideoRecord(getReq.result);
          if (record) {
            videos.push({
              id: key as string,
              blob: record.blob,
            });
          }
          pending--;
          if (pending === 0) {
            resolve(videos);
          }
        };
        getReq.onerror = () => {
          pending--;
          if (pending === 0) {
            resolve(videos);
          }
        };
      });
    };
    req.onerror = () => reject(req.error);
  });
}

/** Get count of stored videos */
export async function getVideoCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VIDEO_STORE, 'readonly');
    const req = tx.objectStore(VIDEO_STORE).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Queue a locally protected video for deferred cloud upload. */
export async function enqueueUpload(videoId: string, size: number): Promise<UploadQueueItem> {
  const now = new Date().toISOString();
  const existing = await getUploadQueueItem(videoId);
  const item: UploadQueueItem = {
    id: videoId,
    videoId,
    status: existing?.status === 'synced' ? 'synced' : 'queued',
    attempts: existing?.attempts ?? 0,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    publicUrl: existing?.publicUrl,
    path: existing?.path,
    lastError: existing?.lastError,
    nextRetryAt: existing?.nextRetryAt,
    size,
  };

  await putUploadQueueItem(item);
  return item;
}

export async function getUploadQueueItem(id: string): Promise<UploadQueueItem | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(UPLOAD_QUEUE_STORE, 'readonly');
    const req = tx.objectStore(UPLOAD_QUEUE_STORE).get(id);
    req.onsuccess = () => resolve((req.result as UploadQueueItem | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function putUploadQueueItem(item: UploadQueueItem): Promise<void> {
  const db = await openDB();
  const updated: UploadQueueItem = { ...item, updatedAt: new Date().toISOString() };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(UPLOAD_QUEUE_STORE, 'readwrite');
    tx.objectStore(UPLOAD_QUEUE_STORE).put(updated);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listUploadQueue(): Promise<UploadQueueItem[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(UPLOAD_QUEUE_STORE, 'readonly');
    const req = tx.objectStore(UPLOAD_QUEUE_STORE).getAll();
    req.onsuccess = () => resolve((req.result as UploadQueueItem[]).sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
    req.onerror = () => reject(req.error);
  });
}

export async function getUploadQueueStats(): Promise<UploadQueueStats> {
  const items = await listUploadQueue();
  return items.reduce<UploadQueueStats>((stats, item) => {
    stats[item.status] += 1;
    stats.total += 1;
    return stats;
  }, { queued: 0, uploading: 0, synced: 0, error: 0, total: 0 });
}

/** Clear all stored videos and upload queue entries from IndexedDB. */
export async function clearAllVideos(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([VIDEO_STORE, UPLOAD_QUEUE_STORE], 'readwrite');
    tx.objectStore(VIDEO_STORE).clear();
    tx.objectStore(UPLOAD_QUEUE_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
