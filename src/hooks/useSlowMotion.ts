import { useState, useRef, useCallback } from 'react';
import { fetchFile } from '@ffmpeg/util';
import type { MusicSelection } from '../lib/backgroundMusic';
import { getTrackById } from '../lib/backgroundMusic';
import { cleanupFiles, getFFmpeg, resetFFmpeg } from '../lib/ffmpegCore';
import { computeMusicStartOffset, getMediaDuration } from '../lib/musicSync';
import { buildCropFilter, type ExportFormat } from '../lib/exportFormat';
import {
  buildSmartSlowMotionSetptsFilter,
  getSlowMotionPreset,
  resolveAutoTrimWindow,
  type SlowMotionPreset,
} from '../lib/videoIntelligence';

export type SlowMotionSpeed = 0.5 | 0.25;
export type { ExportFormat, SlowMotionPreset };

export type ProcessingStatus = 'idle' | 'loading' | 'processing' | 'done' | 'error';

export interface ProcessVideoOptions {
  music?: MusicSelection;
  musicVolume?: number;
  mixWithVideoAudio?: boolean;
  /** Trim short operator handles at the beginning/end before export. */
  autoTrim?: boolean;
  /** Classic slows the full clip; other presets slow only the center highlight. */
  slowMotionPreset?: SlowMotionPreset;
}

interface UseSlowMotionReturn {
  processVideo: (
    inputUrl: string,
    speed: 1 | SlowMotionSpeed,
    format?: ExportFormat,
    options?: ProcessVideoOptions,
  ) => Promise<string | null>;
  status: ProcessingStatus;
  progress: number;
  errorMessage: string;
  cancel: () => void;
}

function buildAudioFilter(volume: number, mixWithVideoAudio: boolean): string {
  const vol = (volume / 100).toFixed(2);
  if (mixWithVideoAudio) {
    return `[1:a]volume=${vol}[bg];[0:a][bg]amix=inputs=2:duration=first:dropout_transition=2[a]`;
  }
  return `[1:a]volume=${vol}[a]`;
}

function buildMusicInputArgs(startOffsetSec: number): string[] {
  if (startOffsetSec > 0.05) {
    return ['-ss', startOffsetSec.toFixed(3), '-stream_loop', '-1', '-i', 'music.mp3'];
  }
  return ['-stream_loop', '-1', '-i', 'music.mp3'];
}

async function resolveMusicStartOffset(
  videoUrl: string,
  trackFile: string,
  highlightAt: number,
): Promise<number> {
  try {
    const [videoDuration, musicDuration] = await Promise.all([
      getMediaDuration(videoUrl),
      getMediaDuration(trackFile),
    ]);
    return computeMusicStartOffset(videoDuration, musicDuration, highlightAt);
  } catch (err) {
    console.warn('[useSlowMotion] Impossible de caler la musique, départ à 0s:', err);
    return 0;
  }
}

function needsProcessing(
  speed: 1 | SlowMotionSpeed,
  format: ExportFormat,
  music?: MusicSelection,
  autoTrim = false,
): boolean {
  const hasMusic = music && music !== 'none';
  return speed !== 1 || format !== '16:9' || Boolean(hasMusic) || autoTrim;
}

function buildInputArgs(trimStart: number, trimDuration: number | null): string[] {
  if (trimDuration && trimDuration > 0 && trimStart > 0.01) {
    return ['-ss', trimStart.toFixed(3), '-t', trimDuration.toFixed(3), '-i', 'input.webm'];
  }
  if (trimDuration && trimDuration > 0) {
    return ['-t', trimDuration.toFixed(3), '-i', 'input.webm'];
  }
  return ['-i', 'input.webm'];
}

function buildFullClipSetpts(speed: SlowMotionSpeed): string {
  return `setpts=${(1 / speed).toFixed(1)}*PTS`;
}

export function useSlowMotion(): UseSlowMotionReturn {
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const cancelledRef = useRef(false);

  const processVideo = useCallback(async (
    inputUrl: string,
    speed: 1 | SlowMotionSpeed,
    format: ExportFormat = '16:9',
    options: ProcessVideoOptions = {},
  ): Promise<string | null> => {
    const {
      music = 'none',
      musicVolume = 35,
      mixWithVideoAudio = false,
      autoTrim = false,
      slowMotionPreset = 'classic',
    } = options;
    const hasMusic = music !== 'none';

    cancelledRef.current = false;
    setStatus('loading');
    setProgress(0);
    setErrorMessage('');

    if (!needsProcessing(speed, format, music, autoTrim)) {
      setProgress(100);
      setStatus('done');
      return inputUrl;
    }

    try {
      const ff = await getFFmpeg((p) => {
        if (!cancelledRef.current) setProgress(p);
      });

      if (cancelledRef.current) {
        setStatus('idle');
        return null;
      }

      setStatus('processing');

      await cleanupFiles(ff, ['input.webm', 'output.webm', 'music.mp3']);
      await ff.writeFile('input.webm', await fetchFile(inputUrl));

      let sourceDuration = 0;
      let trimStart = 0;
      let trimDuration: number | null = null;

      if (autoTrim || (speed !== 1 && slowMotionPreset !== 'classic')) {
        sourceDuration = await getMediaDuration(inputUrl);
      }

      if (autoTrim && sourceDuration > 0) {
        const trim = resolveAutoTrimWindow(sourceDuration);
        trimStart = trim.start;
        trimDuration = trim.duration;
      }

      const workingDuration = trimDuration ?? sourceDuration;
      const smartPreset = speed !== 1 && slowMotionPreset !== 'classic'
        ? getSlowMotionPreset(slowMotionPreset)
        : null;
      const speedVideoFilter = speed === 1
        ? null
        : smartPreset && workingDuration > 0
          ? buildSmartSlowMotionSetptsFilter(smartPreset, workingDuration)
          : buildFullClipSetpts(speed);
      const sourceInputArgs = buildInputArgs(trimStart, trimDuration);

      let musicStartOffset = 0;
      if (hasMusic) {
        const track = getTrackById(music);
        await ff.writeFile('music.mp3', await fetchFile(track.file));
        musicStartOffset = await resolveMusicStartOffset(inputUrl, track.file, track.highlightAt);
      }

      if (cancelledRef.current) {
        setStatus('idle');
        return null;
      }

      const musicInputArgs = hasMusic ? buildMusicInputArgs(musicStartOffset) : [];

      const videoFilters = [
        ...(format !== '16:9' ? [buildCropFilter(format)] : []),
        ...(speedVideoFilter ? [speedVideoFilter] : []),
      ];
      const videoFilter = videoFilters.length > 0 ? videoFilters.join(',') : null;

      let outputArgs: string[];

      if (hasMusic && speed === 1 && format === '16:9') {
        outputArgs = [
          ...sourceInputArgs,
          ...musicInputArgs,
          '-filter_complex', buildAudioFilter(musicVolume, mixWithVideoAudio),
          '-map', '0:v:0',
          '-map', '[a]',
          '-c:v', 'copy',
          '-c:a', 'libvorbis',
          '-shortest',
          'output.webm',
        ];
      } else if (hasMusic && speed !== 1 && format === '16:9') {
        const audioTempo = speed === 0.25 ? 'atempo=0.5,atempo=0.5' : `atempo=${speed}`;
        const vol = (musicVolume / 100).toFixed(2);
        const audioFilter = smartPreset
          ? `[1:a]volume=${vol}[a]`
          : mixWithVideoAudio
            ? `[1:a]volume=${vol}[bg];[0:a]${audioTempo}[va];[va][bg]amix=inputs=2:duration=first:dropout_transition=2[a]`
            : `[1:a]volume=${vol},${audioTempo}[a]`;

        outputArgs = [
          ...sourceInputArgs,
          ...musicInputArgs,
          '-filter:v', speedVideoFilter ?? buildFullClipSetpts(speed as SlowMotionSpeed),
          '-filter_complex', audioFilter,
          '-map', '0:v:0',
          '-map', '[a]',
          '-c:v', 'libvpx',
          '-b:v', '2M',
          '-c:a', 'libvorbis',
          '-shortest',
          'output.webm',
        ];
      } else if (hasMusic) {
        const audioTempo = speed === 1 ? null : (speed === 0.25 ? 'atempo=0.5,atempo=0.5' : `atempo=${speed}`);
        const vol = (musicVolume / 100).toFixed(2);
        let audioFilter: string;

        if (smartPreset) {
          audioFilter = `[1:a]volume=${vol}[a]`;
        } else if (mixWithVideoAudio) {
          const va = audioTempo ? `[0:a]${audioTempo}[va]` : '[0:a]anull[va]';
          audioFilter = audioTempo
            ? `${va};[1:a]volume=${vol}[bg];[va][bg]amix=inputs=2:duration=first:dropout_transition=2[a]`
            : `[1:a]volume=${vol}[bg];[0:a][bg]amix=inputs=2:duration=first:dropout_transition=2[a]`;
        } else {
          audioFilter = audioTempo
            ? `[1:a]volume=${vol},${audioTempo}[a]`
            : `[1:a]volume=${vol}[a]`;
        }

        outputArgs = [
          ...sourceInputArgs,
          ...musicInputArgs,
          '-filter_complex',
          `[0:v]${videoFilter}[v];${audioFilter}`,
          '-map', '[v]',
          '-map', '[a]',
          '-c:v', 'libvpx',
          '-b:v', '2M',
          '-c:a', 'libvorbis',
          '-shortest',
          'output.webm',
        ];
      } else if (speed === 1) {
        outputArgs = [
          ...sourceInputArgs,
          '-vf', buildCropFilter(format),
          '-map', '0:v:0',
          '-map', '0:a?',
          '-c:v', 'libvpx',
          '-b:v', '2M',
          '-c:a', 'copy',
          'output.webm',
        ];
      } else if (format !== '16:9') {
        if (smartPreset) {
          outputArgs = [
            ...sourceInputArgs,
            '-filter:v', videoFilter ?? speedVideoFilter ?? buildFullClipSetpts(speed as SlowMotionSpeed),
            '-an',
            '-c:v', 'libvpx',
            '-b:v', '2M',
            'output.webm',
          ];
        } else {
          outputArgs = [
            ...sourceInputArgs,
            '-filter_complex',
            `[0:v]${videoFilter}[v];[0:a]${speed === 0.25 ? 'atempo=0.5,atempo=0.5' : `atempo=${speed}`}[a]`,
            '-map', '[v]',
            '-map', '[a]',
            '-c:v', 'libvpx',
            '-b:v', '2M',
            '-c:a', 'libvorbis',
            'output.webm',
          ];
        }
      } else {
        outputArgs = smartPreset
          ? [
              ...sourceInputArgs,
              '-filter:v', speedVideoFilter ?? buildFullClipSetpts(speed as SlowMotionSpeed),
              '-an',
              '-c:v', 'libvpx',
              '-b:v', '2M',
              'output.webm',
            ]
          : [
              ...sourceInputArgs,
              '-filter:v', speedVideoFilter ?? buildFullClipSetpts(speed as SlowMotionSpeed),
              '-filter:a', speed === 0.25 ? 'atempo=0.5,atempo=0.5' : `atempo=${speed}`,
              '-c:v', 'libvpx',
              '-b:v', '2M',
              '-c:a', 'libvorbis',
              'output.webm',
            ];
      }

      await ff.exec(outputArgs);

      if (cancelledRef.current) {
        setStatus('idle');
        return null;
      }

      const filesAfter = await ff.listDir('/');
      const outputExists = filesAfter.some((f) => f.name === 'output.webm');
      if (!outputExists) {
        throw new Error('FFmpeg did not create output.webm');
      }

      const data = await ff.readFile('output.webm');
      const blob = new Blob([data], { type: 'video/webm' });
      const outputUrl = URL.createObjectURL(blob);

      await cleanupFiles(ff, ['input.webm', 'output.webm', 'music.mp3']);

      setProgress(100);
      setStatus('done');
      return outputUrl;
    } catch (err) {
      if (cancelledRef.current) {
        setStatus('idle');
        return null;
      }
      console.error('[useSlowMotion]', err);
      setErrorMessage('Le traitement a échoué. Réessayez.');
      setStatus('error');
      resetFFmpeg();
      return null;
    }
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    setStatus('idle');
    setProgress(0);
  }, []);

  return { processVideo, status, progress, errorMessage, cancel };
}
