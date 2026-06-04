import { supabase, BUCKET, SUPABASE_CONFIGURED } from './supabase';

export type UploadStatus = 'idle' | 'uploading' | 'done' | 'error';

export interface UploadResult {
  /** Public URL of the uploaded video, usable cross-device */
  publicUrl: string;
  /** The storage path, e.g. "videos/abc123.webm" */
  path: string;
}

/**
 * Upload a video blob URL to Supabase Storage.
 * Reports progress via `onProgress(0–100)`.
 * Returns null if Supabase is not configured (env vars missing).
 */
export async function uploadVideo(
  blobUrl: string,
  onProgress: (pct: number) => void,
): Promise<UploadResult | null> {
  if (!SUPABASE_CONFIGURED || !supabase) return null;

  // Fetch the blob
  const blob = await fetch(blobUrl).then((r) => r.blob());
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webm`;
  const path = `videos/${filename}`;

  // Supabase Storage upload URL
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  void sessionData; // not needed for anon uploads

  if (sessionError) {
    console.warn('[uploadVideo] Auth session error (ignored for anon):', sessionError);
  }

  // Use XHR for real upload progress — the Supabase fetch-based client doesn't expose it
  const storageUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', storageUrl);
    xhr.setRequestHeader('Authorization', `Bearer ${anonKey}`);
    xhr.setRequestHeader('x-upsert', 'true');

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
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));

    const formData = new FormData();
    formData.append('', blob, filename);
    xhr.send(formData);
  });

  // Get the public URL
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return { publicUrl: data.publicUrl, path };
}

/**
 * Delete a video from Supabase Storage (e.g. after session ends).
 */
export async function deleteRemoteVideo(path: string): Promise<void> {
  if (!supabase) return;
  await supabase.storage.from(BUCKET).remove([path]);
}
