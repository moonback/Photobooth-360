/**
 * exportVideos — Export all stored videos as a ZIP file
 */

import { getAllVideosWithBlobs } from './videoStore';
import { listVideosFromBucket } from './uploadVideo';

interface ExportProgress {
  current: number;
  total: number;
  status: 'preparing' | 'downloading' | 'zipping' | 'done' | 'error';
}

/**
 * Export all videos from Supabase bucket as a ZIP file.
 * Downloads videos from Supabase and creates a ZIP archive.
 */
export async function exportAllVideosFromBucket(
  onProgress?: (progress: ExportProgress) => void
): Promise<void> {
  try {
    // Dynamic import of JSZip to reduce main bundle size
    const JSZip = (await import('jszip')).default;

    onProgress?.({ current: 0, total: 0, status: 'preparing' });

    // Get all videos from Supabase bucket
    const videos = await listVideosFromBucket();

    if (videos.length === 0) {
      throw new Error('NO_VIDEOS');
    }

    onProgress?.({ current: 0, total: videos.length, status: 'downloading' });

    // Create ZIP archive
    const zip = new JSZip();
    
    // Download each video and add to ZIP
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      
      try {
        // Download video blob
        const response = await fetch(video.url);
        if (!response.ok) {
          console.error(`Failed to download ${video.name}: ${response.statusText}`);
          continue;
        }
        
        const blob = await response.blob();
        zip.file(video.name, blob);
        
        onProgress?.({ 
          current: i + 1, 
          total: videos.length, 
          status: 'downloading' 
        });
      } catch (error) {
        console.error(`Error downloading ${video.name}:`, error);
        // Continue with other videos
      }
    }

    onProgress?.({ 
      current: videos.length, 
      total: videos.length, 
      status: 'zipping' 
    });

    // Generate ZIP blob
    const zipBlob = await zip.generateAsync({ 
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    // Trigger download
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `photobooth360_export_${new Date().toISOString().split('T')[0]}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    onProgress?.({ 
      current: videos.length, 
      total: videos.length, 
      status: 'done' 
    });

  } catch (error) {
    onProgress?.({ 
      current: 0, 
      total: 0, 
      status: 'error' 
    });
    throw error;
  }
}

/**
 * Export all videos from IndexedDB as a ZIP file.
 * Uses JSZip for creating the archive.
 */
export async function exportAllVideos(
  onProgress?: (progress: ExportProgress) => void
): Promise<void> {
  try {
    // Dynamic import of JSZip to reduce main bundle size
    const JSZip = (await import('jszip')).default;

    onProgress?.({ current: 0, total: 0, status: 'preparing' });

    // Get all videos from IndexedDB
    const videos = await getAllVideosWithBlobs();

    if (videos.length === 0) {
      throw new Error('NO_VIDEOS');
    }

    onProgress?.({ current: 0, total: videos.length, status: 'zipping' });

    // Create ZIP archive
    const zip = new JSZip();
    
    videos.forEach((video, index) => {
      const filename = `video_${video.id}.mp4`;
      zip.file(filename, video.blob);
      onProgress?.({ 
        current: index + 1, 
        total: videos.length, 
        status: 'zipping' 
      });
    });

    onProgress?.({ 
      current: videos.length, 
      total: videos.length, 
      status: 'done' 
    });

    // Generate ZIP blob
    const zipBlob = await zip.generateAsync({ 
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    // Trigger download
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `photobooth360_export_${new Date().toISOString().split('T')[0]}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    onProgress?.({ 
      current: videos.length, 
      total: videos.length, 
      status: 'done' 
    });

  } catch (error) {
    onProgress?.({ 
      current: 0, 
      total: 0, 
      status: 'error' 
    });
    throw error;
  }
}
