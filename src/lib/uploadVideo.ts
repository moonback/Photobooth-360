import { supabase, BUCKET, SUPABASE_CONFIGURED } from './supabase';

export type UploadStatus = 'idle' | 'uploading' | 'done' | 'error';

export interface UploadResult {
  /** Public URL of the uploaded video, usable cross-device */
  publicUrl: string;
  /** The storage path, e.g. "videos/abc123.webm" */
  path: string;
}

/**
 * List all videos from Supabase Storage bucket with metadata
 */
export async function listVideosFromBucket(): Promise<Array<{ name: string; url: string; path: string; createdAt: string; size: number }>> {
  if (!SUPABASE_CONFIGURED || !supabase) {
    console.log('[listVideosFromBucket] Supabase not configured');
    return [];
  }

  const client = supabase;

  try {
    console.log('[listVideosFromBucket] Fetching from bucket:', BUCKET);
    const { data, error } = await client.storage
      .from(BUCKET)
      .list('videos', {
        limit: 1000,
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

    // Convert to objects with metadata
    const videos = data
      .filter(file => file.name.endsWith('.webm'))
      .map(file => {
        const path = `videos/${file.name}`;
        const { data: urlData } = client.storage.from(BUCKET).getPublicUrl(path);
        return {
          name: file.name,
          url: urlData.publicUrl,
          path: path,
          createdAt: file.created_at || '',
          size: file.metadata?.size || 0,
        };
      });

    console.log('[listVideosFromBucket] Returning', videos.length, 'videos');
    return videos;
  } catch (err) {
    console.error('[listVideosFromBucket] Error:', err);
    return [];
  }
}

/**
 * Delete multiple videos from Supabase Storage
 */
export async function deleteVideosFromBucket(paths: string[]): Promise<{ success: boolean; errors: string[] }> {
  if (!SUPABASE_CONFIGURED || !supabase) {
    return { success: false, errors: ['Supabase not configured'] };
  }

  try {
    const { data, error } = await supabase.storage.from(BUCKET).remove(paths);
    
    if (error) {
      console.error('[deleteVideosFromBucket] Error:', error);
      return { success: false, errors: [error.message] };
    }

    console.log('[deleteVideosFromBucket] Deleted', data?.length || 0, 'files');
    return { success: true, errors: [] };
  } catch (err) {
    console.error('[deleteVideosFromBucket] Error:', err);
    return { success: false, errors: [err instanceof Error ? err.message : 'Unknown error'] };
  }
}

/**
 * Delete all videos from Supabase Storage bucket
 */
export async function clearAllVideosFromBucket(): Promise<{ success: boolean; count: number; errors: string[] }> {
  const videos = await listVideosFromBucket();
  
  if (videos.length === 0) {
    return { success: true, count: 0, errors: [] };
  }

  const paths = videos.map(v => v.path);
  const result = await deleteVideosFromBucket(paths);
  
  return {
    success: result.success,
    count: videos.length,
    errors: result.errors,
  };
}

/**
 * Upload a video blob URL to Supabase Storage.
 * Reports progress via `onProgress(0–100)`.
 * Returns null if Supabase is not configured (env vars missing).
 */
export async function uploadVideo(
  input: string | Blob,
  onProgress: (pct: number) => void,
): Promise<UploadResult | null> {
  if (!SUPABASE_CONFIGURED || !supabase) return null;

  // Get the blob
  let blob: Blob;
  if (typeof input === 'string') {
    // It's a blob URL
    blob = await fetch(input).then((r) => r.blob());
  } else {
    // It's already a Blob
    blob = input;
  }
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
