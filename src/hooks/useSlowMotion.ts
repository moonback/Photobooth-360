import { useState, useRef, useCallback } from 'react';
import { fetchFile } from '@ffmpeg/util';
import type { MusicSelection } from '../lib/backgroundMusic';
import { getTrackById } from '../lib/backgroundMusic';
import { cleanupFiles, getFFmpeg, resetFFmpeg } from '../lib/ffmpegCore';

export type SlowMotionSpeed = 0.5 | 0.25;
export type ExportFormat = '16:9' | '9:16' | '1:1';

export type ProcessingStatus = 'idle' | 'loading' | 'processing' | 'done' | 'error';

export interface ProcessVideoOptions {
  music?: MusicSelection;
  musicVolume?: number;
  mixWithVideoAudio?: boolean;
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

const FORMAT_RATIOS: Record<ExportFormat, { num: number; den: number }> = {
  '16:9': { num: 16, den: 9 },
  '9:16': { num: 9, den: 16 },
  '1:1': { num: 1, den: 1 },
};

function buildCropFilter(format: ExportFormat): string {
  const { num, den } = FORMAT_RATIOS[format];
  const ratio = num / den;
  return `crop='if(gte(a,${ratio}),floor(ih*${ratio}/2)*2,iw)':'if(gte(a,${ratio}),ih,floor(iw/${ratio}/2)*2)':(iw-ow)/2:(ih-oh)/2`;
}

function buildAudioFilter(volume: number, mixWithVideoAudio: boolean): string {
  const vol = (volume / 100).toFixed(2);
  if (mixWithVideoAudio) {
    return `[1:a]volume=${vol}[bg];[0:a][bg]amix=inputs=2:duration=first:dropout_transition=2[a]`;
  }
  return `[1:a]volume=${vol}[a]`;
}

function needsProcessing(
  speed: 1 | SlowMotionSpeed,
  format: ExportFormat,
  music?: MusicSelection,
): boolean {
  const hasMusic = music && music !== 'none';
  return speed !== 1 || format !== '16:9' || Boolean(hasMusic);
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
    const { music = 'none', musicVolume = 35, mixWithVideoAudio = false } = options;
    const hasMusic = music !== 'none';

    cancelledRef.current = false;
    setStatus('loading');
    setProgress(0);
    setErrorMessage('');

    if (!needsProcessing(speed, format, music)) {
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

      if (hasMusic) {
        const track = getTrackById(music);
        await ff.writeFile('music.mp3', await fetchFile(track.file));
      }

      if (cancelledRef.current) {
        setStatus('idle');
        return null;
      }

      const videoFilters = [
        ...(format !== '16:9' ? [buildCropFilter(format)] : []),
        ...(speed === 1 ? [] : [`setpts=${(1 / speed).toFixed(1)}*PTS`]),
      ];
      const videoFilter = videoFilters.length > 0 ? videoFilters.join(',') : null;

      let outputArgs: string[];

      if (hasMusic && speed === 1 && format === '16:9') {
        outputArgs = [
          '-i', 'input.webm',
          '-stream_loop', '-1',
          '-i', 'music.mp3',
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
        const audioFilter = mixWithVideoAudio
          ? `[1:a]volume=${vol}[bg];[0:a]${audioTempo}[va];[va][bg]amix=inputs=2:duration=first:dropout_transition=2[a]`
          : `[1:a]volume=${vol},${audioTempo}[a]`;

        outputArgs = [
          '-i', 'input.webm',
          '-stream_loop', '-1',
          '-i', 'music.mp3',
          '-filter:v', `setpts=${(1 / speed).toFixed(1)}*PTS`,
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

        if (mixWithVideoAudio) {
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
          '-i', 'input.webm',
          '-stream_loop', '-1',
          '-i', 'music.mp3',
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
          '-i', 'input.webm',
          '-vf', buildCropFilter(format),
          '-map', '0:v:0',
          '-map', '0:a?',
          '-c:v', 'libvpx',
          '-b:v', '2M',
          '-c:a', 'copy',
          'output.webm',
        ];
      } else if (format !== '16:9') {
        outputArgs = [
          '-i', 'input.webm',
          '-filter_complex',
          `[0:v]${videoFilter}[v];[0:a]${speed === 0.25 ? 'atempo=0.5,atempo=0.5' : `atempo=${speed}`}[a]`,
          '-map', '[v]',
          '-map', '[a]',
          '-c:v', 'libvpx',
          '-b:v', '2M',
          '-c:a', 'libvorbis',
          'output.webm',
        ];
      } else {
        outputArgs = [
          '-i', 'input.webm',
          '-filter:v', `setpts=${(1 / speed).toFixed(1)}*PTS`,
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
