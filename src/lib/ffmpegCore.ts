import { FFmpeg } from '@ffmpeg/ffmpeg';

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
    // Use CDN for ffmpeg-core files since they're not available locally
    const baseCDN = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    ffmpegLoadPromise = ff.load({
      coreURL: `${baseCDN}/ffmpeg-core.js`,
      wasmURL: `${baseCDN}/ffmpeg-core.wasm`,
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
      for (const file of files) {
        if (file.name && names.includes(file.name)) {
          await ff.deleteFile(file.name);
        }
      }
    } catch {
      // ignore
    }
  }
}
