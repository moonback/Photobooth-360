import { useState, useRef, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export type SlowMotionSpeed = 0.5 | 0.25;
export type ExportSpeed = 1 | SlowMotionSpeed;
export type ExportFormat = '16:9' | '9:16' | '1:1';
export type MusicTrackId = 'none' | 'neon-pulse' | 'soft-glow' | 'party-pop';

export type ProcessingStatus = 'idle' | 'loading' | 'processing' | 'done' | 'error';

export interface ExportOptions {
  speed?: ExportSpeed;
  format?: ExportFormat;
  musicTrack?: MusicTrackId;
}

interface UseSlowMotionReturn {
  processVideo: (inputUrl: string, speed: SlowMotionSpeed) => Promise<string | null>;
  exportVideo: (inputUrl: string, options?: ExportOptions) => Promise<string | null>;
  status: ProcessingStatus;
  progress: number; // 0–100
  errorMessage: string;
  cancel: () => void;
}

const FORMAT_DIMENSIONS: Record<ExportFormat, { width: number; height: number }> = {
  '16:9': { width: 1280, height: 720 },
  '9:16': { width: 720, height: 1280 },
  '1:1': { width: 1080, height: 1080 },
};

const MUSIC_SOURCES: Record<Exclude<MusicTrackId, 'none'>, string> = {
  'neon-pulse': 'sine=frequency=110:sample_rate=44100',
  'soft-glow': 'sine=frequency=261.63:sample_rate=44100',
  'party-pop': 'sine=frequency=329.63:sample_rate=44100',
};

// Singleton FFmpeg instance — reused across calls to avoid reloading WASM each time
let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoadPromise: Promise<void> | null = null;

async function getFFmpeg(onProgress: (p: number) => void): Promise<FFmpeg> {
  if (!ffmpegInstance) {
    ffmpegInstance = new FFmpeg();
  }

  const ff = ffmpegInstance;

  // Wire up progress reporting
  ff.on('progress', ({ progress }) => {
    onProgress(Math.min(Math.round(progress * 100), 99));
  });

  if (!ffmpegLoadPromise) {
    // Load the WASM core from the official CDN (supports SharedArrayBuffer via COOP/COEP headers)
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    ffmpegLoadPromise = ff.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    }).then(() => undefined);
  }

  await ffmpegLoadPromise;
  return ff;
}

function getVideoFilter(format: ExportFormat, speed: ExportSpeed): string {
  const { width, height } = FORMAT_DIMENSIONS[format];
  const filters = [
    `scale=${width}:${height}:force_original_aspect_ratio=increase`,
    `crop=${width}:${height}`,
    'setsar=1',
  ];

  if (speed !== 1) {
    filters.push(`setpts=${(1 / speed).toFixed(1)}*PTS`);
  }

  return filters.join(',');
}

function getAtempoFilter(speed: ExportSpeed): string {
  if (speed === 1) return 'anull';
  return speed === 0.25 ? 'atempo=0.5,atempo=0.5' : `atempo=${speed}`;
}

function buildExportCommand(options: Required<ExportOptions>, withInputAudio: boolean): string[] {
  const { format, speed, musicTrack } = options;
  const hasMusic = musicTrack !== 'none';
  const videoFilter = getVideoFilter(format, speed);

  const command = ['-i', 'input.webm'];

  if (hasMusic) {
    command.push('-f', 'lavfi', '-i', MUSIC_SOURCES[musicTrack]);
  }

  if (hasMusic && withInputAudio) {
    command.push(
      '-filter_complex',
      `[0:v]${videoFilter}[v];[0:a]${getAtempoFilter(speed)},volume=0.65[a0];[1:a]volume=0.18,afade=t=in:st=0:d=0.35[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=0[a]`,
      '-map', '[v]',
      '-map', '[a]',
      '-shortest',
    );
  } else if (hasMusic) {
    command.push(
      '-filter_complex',
      `[0:v]${videoFilter}[v];[1:a]volume=0.18,afade=t=in:st=0:d=0.35[a]`,
      '-map', '[v]',
      '-map', '[a]',
      '-shortest',
    );
  } else if (withInputAudio && speed !== 1) {
    command.push(
      '-filter_complex',
      `[0:v]${videoFilter}[v];[0:a]${getAtempoFilter(speed)}[a]`,
      '-map', '[v]',
      '-map', '[a]',
    );
  } else {
    command.push(
      '-filter:v', videoFilter,
      '-map', '0:v',
      '-map', '0:a?',
    );
  }

  command.push(
    '-c:v', 'libvpx',
    '-b:v', '2M',
    '-c:a', 'libvorbis',
    '-deadline', 'realtime',
    'output.webm',
  );

  return command;
}

async function safeDelete(ff: FFmpeg, path: string) {
  try {
    await ff.deleteFile(path);
  } catch {
    // File may not exist after a failed encode; ignore cleanup errors.
  }
}

export function useSlowMotion(): UseSlowMotionReturn {
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const cancelledRef = useRef(false);

  const exportVideo = useCallback(async (inputUrl: string, options: ExportOptions = {}): Promise<string | null> => {
    const resolvedOptions: Required<ExportOptions> = {
      speed: options.speed ?? 1,
      format: options.format ?? '16:9',
      musicTrack: options.musicTrack ?? 'none',
    };

    cancelledRef.current = false;
    setStatus('loading');
    setProgress(0);
    setErrorMessage('');

    try {
      const ff = await getFFmpeg((p) => {
        if (!cancelledRef.current) setProgress(p);
      });

      if (cancelledRef.current) {
        setStatus('idle');
        return null;
      }

      setStatus('processing');

      // Write the input video into FFmpeg's virtual filesystem
      await ff.writeFile('input.webm', await fetchFile(inputUrl));

      if (cancelledRef.current) {
        setStatus('idle');
        await safeDelete(ff, 'input.webm');
        return null;
      }

      await safeDelete(ff, 'output.webm');

      try {
        await ff.exec(buildExportCommand(resolvedOptions, true));
      } catch (err) {
        console.warn('[useSlowMotion] Retrying export without original audio track:', err);
        await safeDelete(ff, 'output.webm');
        await ff.exec(buildExportCommand(resolvedOptions, false));
      }

      if (cancelledRef.current) {
        setStatus('idle');
        await safeDelete(ff, 'input.webm');
        await safeDelete(ff, 'output.webm');
        return null;
      }

      const data = await ff.readFile('output.webm');
      const blob = new Blob([data], { type: 'video/webm' });
      const outputUrl = URL.createObjectURL(blob);

      // Cleanup virtual FS
      await safeDelete(ff, 'input.webm');
      await safeDelete(ff, 'output.webm');

      setProgress(100);
      setStatus('done');
      return outputUrl;

    } catch (err) {
      if (cancelledRef.current) {
        setStatus('idle');
        return null;
      }
      console.error('[useSlowMotion] FFmpeg error:', err);
      setErrorMessage('Le traitement a échoué. Réessayez.');
      setStatus('error');
      // Reset singleton so next call retries loading
      ffmpegInstance = null;
      ffmpegLoadPromise = null;
      return null;
    }
  }, []);

  const processVideo = useCallback((inputUrl: string, speed: SlowMotionSpeed): Promise<string | null> => {
    return exportVideo(inputUrl, { speed, format: '16:9', musicTrack: 'none' });
  }, [exportVideo]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    setStatus('idle');
    setProgress(0);
  }, []);

  return { processVideo, exportVideo, status, progress, errorMessage, cancel };
}
