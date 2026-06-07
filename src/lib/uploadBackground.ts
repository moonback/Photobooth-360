import { supabase, LOGO_BUCKET, SUPABASE_CONFIGURED } from './supabase';

export type BackgroundUploadStatus = 'idle' | 'uploading' | 'done' | 'error';

export interface BackgroundUploadResult {
  /** Public URL of the uploaded background */
  publicUrl: string;
  /** Storage path, e.g. "backgrounds/abc123.png" */
  path: string;
}

/**
 * Upload a background image file to the `photobooth-logos` Supabase bucket.
 * Reports progress via `onProgress(0–100)`.
 * Returns null if Supabase is not configured.
 */
export async function uploadBackground(
  file: File,
  onProgress: (pct: number) => void,
): Promise<BackgroundUploadResult | null> {
  if (!SUPABASE_CONFIGURED || !supabase) return null;

  const ext = file.name.split('.').pop() ?? 'png';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `backgrounds/${filename}`;

  const storageUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/${LOGO_BUCKET}/${path}`;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', storageUrl);
    xhr.setRequestHeader('Authorization', `Bearer ${anonKey}`);
    xhr.setRequestHeader('x-upsert', 'true');
    // Do NOT set Content-Type manually — let the browser set it with the correct multipart boundary

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(new Error(`Background upload failed: ${xhr.status} ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during background upload'));

    // Use FormData exactly like uploadVideo.ts does
    const formData = new FormData();
    formData.append('', file, filename);
    xhr.send(formData);
  });

  const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path);
  return { publicUrl: data.publicUrl, path };
}
