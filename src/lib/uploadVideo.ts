import { supabase, BUCKET, SUPABASE_CONFIGURED } from './supabase';

export type UploadStatus = 'idle' | 'uploading' | 'done' | 'error';

export interface UploadResult {
  /** Public URL of the uploaded video, usable cross-device */
  publicUrl: string;
  /** The storage path, e.g. "videos/abc123.webm" */
  path: string;
}

/**
 * List all videos from Supabase Storage bucket
 */
export async function listVideosFromBucket(): Promise<string[]> {
  if (!SUPABASE_CONFIGURED || !supabase) {
    console.log('[listVideosFromBucket] Supabase not configured');
    return [];
  }

  try {
    console.log('[listVideosFromBucket] Fetching from bucket:', BUCKET);
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list('videos', {
        limit: 1000, // Increase limit to get more videos
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      console.error('[listVideosFromBucket] Error:', error);
      return [];
    }

    if (!data) {
      console.log('[listVideosFromBucket] No data returned');
      return [];
    }

    console.log('[listVideosFromBucket] Found', data.length, 'files');

    // Convert to public URLs
    const publicUrls = data
      .filter(file => {
        const isWebm = file.name.endsWith('.webm');
        if (!isWebm) {
          console.log('[listVideosFromBucket] Skipping non-webm file:', file.name);
        }
        return isWebm;
      })
      .map(file => {
        const { data: urlData } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(`videos/${file.name}`);
        console.log('[listVideosFromBucket] Public URL for', file.name, ':', urlData.publicUrl);
        return urlData.publicUrl;
      });

    console.log('[listVideosFromBucket] Returning', publicUrls.length, 'video URLs');
    return publicUrls;
  } catch (err) {
    console.error('[listVideosFromBucket] Error:', err);
    return [];
  }
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
