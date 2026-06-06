import { supabase, BUCKET, SUPABASE_CONFIGURED } from './supabase';

export interface UploadResult {
  publicUrl: string;
  path: string;
}

/**
 * Upload an intro or outro jingle (video or image) to Supabase Storage
 */
export async function uploadJingle(
  file: File,
  type: 'intro' | 'outro',
  onProgress: (pct: number) => void,
): Promise<UploadResult | null> {
  if (!SUPABASE_CONFIGURED || !supabase) {
    console.warn('[uploadJingle] Supabase not configured');
    return null;
  }

  const ext = file.name.split('.').pop() || 'bin';
  const filename = `${type}-${Date.now()}.${ext}`;
  const path = `jingles/${filename}`;

  // Use XHR for real upload progress
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
    formData.append('', file, filename);
    xhr.send(formData);
  });

  // Get the public URL
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return { publicUrl: data.publicUrl, path };
}

/**
 * Delete a jingle from Supabase Storage
 */
export async function deleteJingle(path: string): Promise<void> {
  if (!supabase) return;
  await supabase.storage.from(BUCKET).remove([path]);
}
