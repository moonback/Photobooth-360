/**
 * videoStore — IndexedDB wrapper for storing recorded video blobs locally.
 *
 * Videos are stored by a short random ID. The QR Code URL contains this ID,
 * so the share page can retrieve the blob from the same browser/device.
 *
 * NOTE: This is a same-device solution. The borne (kiosk) and the guest's phone
 * must be on the same local network with the app served over HTTPS / local hostname
 * for the QR code to work. For cross-device sharing a backend upload is required
 * (Phase 3 of the roadmap).
 */

const DB_NAME = 'photobooth360';
const STORE_NAME = 'videos';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Save a blob URL (converted to Blob) and return a short random ID. */
export async function saveVideo(blobUrl: string): Promise<string> {
  const id = Math.random().toString(36).slice(2, 10); // e.g. "k7x2m9qp"
  const blob = await fetch(blobUrl).then((r) => r.blob());
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(blob, id);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

/** Retrieve a stored blob by ID and return an object URL. */
export async function loadVideo(id: string): Promise<string | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => {
      if (req.result instanceof Blob) {
        resolve(URL.createObjectURL(req.result));
      } else {
        resolve(null);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

/** Delete a stored video (optional cleanup). */
export async function deleteVideo(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
