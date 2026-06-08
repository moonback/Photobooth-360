import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoadPromise: Promise<void> | null = null;

export async function getFFmpeg(onProgress?: (p: number) => void): Promise<FFmpeg> {
  if (!ffmpegInstance) {
    ffmpegInstance = new FFmpeg();
  }

  const ff = ffmpegInstance;

  if (onProgress) {
    ff.on('progress', ({ progress }) => {
      onProgress(Math.min(Math.round(progress * 100), 99));
    });
  }

  if (!ffmpegLoadPromise) {
    // Load FFmpeg from official CDN
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    ffmpegLoadPromise = ff.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js', 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    }).then(() => undefined);
  }

  await ffmpegLoadPromise;
  return ff;
}

export function resetFFmpeg(): void {
  ffmpegInstance = null;
  ffmpegLoadPromise = null;
}

export async function cleanupFiles(ff: FFmpeg, names: string[]): Promise<void> {
  for (const name of names) {
    try {
      const files = await ff.listDir('/');
      if (files.some((f) => f.name === name)) {
        await ff.deleteFile(name);
      }
    } catch {
      // ignore
    }
  }
}
