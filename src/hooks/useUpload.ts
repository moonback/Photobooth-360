import { useState, useCallback } from 'react';
import { uploadVideo, UploadStatus, listVideosFromBucket } from '../lib/uploadVideo';
import { SUPABASE_CONFIGURED } from '../lib/supabase';

export interface UseUploadReturn {
  upload: (blobUrl: string) => Promise<string | null>;
  listVideos: () => Promise<string[]>;
  status: UploadStatus;
  progress: number;
  publicUrl: string;
  storagePath: string;
  isConfigured: boolean;
}

export function useUpload(): UseUploadReturn {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [publicUrl, setPublicUrl] = useState('');
  const [storagePath, setStoragePath] = useState('');

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
      return result.publicUrl;
    } catch (err) {
      console.error('[useUpload]', err);
      setStatus('error');
      return null;
    }
  }, []);

  const listVideos = useCallback(async (): Promise<string[]> => {
    if (!SUPABASE_CONFIGURED) return [];
    return await listVideosFromBucket();
  }, []);

  return { 
    upload, 
    listVideos, 
    status, 
    progress, 
    publicUrl, 
    storagePath, 
    isConfigured: SUPABASE_CONFIGURED 
  };
}
