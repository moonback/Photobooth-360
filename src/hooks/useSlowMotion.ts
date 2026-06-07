import { useState, useRef, useCallback } from 'react';
import { fetchFile } from '@ffmpeg/util';
import type { MusicSelection } from '../lib/backgroundMusic';
import { getTrackById } from '../lib/backgroundMusic';
import { cleanupFiles, getFFmpeg, resetFFmpeg } from '../lib/ffmpegCore';
import { computeMusicStartOffset, getMediaDuration } from '../lib/musicSync';
import { buildCropFilter, getExportDimensions, type ExportFormat } from '../lib/exportFormat';

export type SlowMotionSpeed = 0.5 | 0.25;
export type { ExportFormat };

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

function getSlowMotionVideoFilter(speed: 1 | SlowMotionSpeed): string | null {
  return speed === 1 ? null : `setpts=${(1 / speed).toFixed(1)}*PTS`;
}

function getSlowMotionAudioFilter(speed: SlowMotionSpeed): string {
  return speed === 0.25 ? 'atempo=0.5,atempo=0.5' : `atempo=${speed}`;
}

function buildBackgroundMusicFilter(volume: number): string {
  return `[1:a]volume=${(volume / 100).toFixed(2)}[a]`;
}

function buildAudioFilter(volume: number, mixWithVideoAudio: boolean): string {
  const vol = (volume / 100).toFixed(2);
  if (mixWithVideoAudio) {
    return `[1:a]volume=${vol}[bg];[0:a][bg]amix=inputs=2:duration=first:dropout_transition=2[a]`;
  }
  return buildBackgroundMusicFilter(volume);
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
  speed: 1 | SlowMotionSpeed,
): Promise<number> {
  try {
    const [videoDuration, musicDuration] = await Promise.all([
      getMediaDuration(videoUrl),
      getMediaDuration(trackFile),
    ]);
    const processedVideoDuration = speed === 1 ? videoDuration : videoDuration / speed;
    return computeMusicStartOffset(processedVideoDuration, musicDuration, highlightAt);
  } catch (err) {
    console.warn('[useSlowMotion] Impossible de caler la musique, départ à 0s:', err);
    return 0;
  }
}

function needsProcessing(
  speed: 1 | SlowMotionSpeed,
  format: ExportFormat,
  music?: MusicSelection,
): boolean {
  const hasMusic = music && music !== 'none';
  return speed !== 1 || format !== '16:9' || Boolean(hasMusic);
}
interface BrowserEncodeOptions {
  inputUrl: string;
  speed: 1 | SlowMotionSpeed;
  format: ExportFormat;
  music?: MusicSelection;
  musicVolume: number;
  mixWithVideoAudio: boolean;
  musicStartOffset: number;
  onProgress: (progress: number) => void;
}

function getRecorderMimeType(): string | undefined {
  const candidates = [
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9,opus',
    'video/webm',
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

function createMediaElement<T extends HTMLMediaElement>(tag: 'audio' | 'video', url: string): T {
  const element = document.createElement(tag) as T;
  element.crossOrigin = 'anonymous';
  element.preload = 'auto';
  element.src = url;
  return element;
}

function waitForMetadata(element: HTMLMediaElement): Promise<void> {
  if (Number.isFinite(element.duration) && element.duration > 0) return Promise.resolve();

  return new Promise((resolve, reject) => {
    element.onloadedmetadata = () => resolve();
    element.onerror = () => reject(new Error('Échec chargement métadonnées média'));
  });
}

function drawVideoCover(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number,
): void {
  const scale = Math.max(width / video.videoWidth, height / video.videoHeight);
  const scaledWidth = video.videoWidth * scale;
  const scaledHeight = video.videoHeight * scale;
  const x = (width - scaledWidth) / 2;
  const y = (height - scaledHeight) / 2;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(video, x, y, scaledWidth, scaledHeight);
}

async function encodeWithBrowser({
  inputUrl,
  speed,
  format,
  music = 'none',
  musicVolume,
  mixWithVideoAudio,
  musicStartOffset,
  onProgress,
}: BrowserEncodeOptions): Promise<string> {
  if (!('MediaRecorder' in window)) {
    throw new Error('MediaRecorder indisponible');
  }

  const video = createMediaElement<HTMLVideoElement>('video', inputUrl);
  video.muted = music !== 'none' || !mixWithVideoAudio;
  video.playsInline = true;
  video.playbackRate = speed;
  await waitForMetadata(video);

  const dimensions = format === '16:9'
    ? { width: video.videoWidth || 1280, height: video.videoHeight || 720 }
    : getExportDimensions('720p', format);
  const canvas = document.createElement('canvas');
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas indisponible');

  const stream = canvas.captureStream(30);
  const audioContext = typeof AudioContext !== 'undefined' ? new AudioContext() : undefined;
  const audioDestination = audioContext?.createMediaStreamDestination();
  let musicElement: HTMLAudioElement | null = null;

  if (audioContext && audioDestination) {
    if (music !== 'none') {
      const track = getTrackById(music);
      musicElement = createMediaElement<HTMLAudioElement>('audio', track.file);
      musicElement.loop = true;
      await waitForMetadata(musicElement);
      musicElement.currentTime = Math.min(musicStartOffset, Math.max(0, musicElement.duration - 0.1));

      const musicSource = audioContext.createMediaElementSource(musicElement);
      const gain = audioContext.createGain();
      gain.gain.value = musicVolume / 100;
      musicSource.connect(gain).connect(audioDestination);
    }

    if (mixWithVideoAudio) {
      try {
        const videoAudioSource = audioContext.createMediaElementSource(video);
        videoAudioSource.connect(audioDestination);
      } catch (err) {
        console.warn('[useSlowMotion] Impossible de mixer l’audio caméra dans l’export navigateur:', err);
      }
    }

    audioDestination.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
  }

  const chunks: Blob[] = [];
  const recorderOptions = getRecorderMimeType();
  const recorder = recorderOptions
    ? new MediaRecorder(stream, { mimeType: recorderOptions })
    : new MediaRecorder(stream);

  const recordingPromise = new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || 'video/webm' }));
    recorder.onerror = () => reject(new Error('Échec enregistrement navigateur'));
  });

  recorder.start();
  await audioContext?.resume();
  await Promise.all([
    video.play(),
    musicElement?.play() ?? Promise.resolve(),
  ]);

  await new Promise<void>((resolve) => {
    const drawFrame = () => {
      drawVideoCover(ctx, video, canvas.width, canvas.height);
      if (video.duration > 0) {
        onProgress(Math.min(99, Math.round((video.currentTime / video.duration) * 100)));
      }

      if (video.ended) {
        resolve();
        return;
      }

      requestAnimationFrame(drawFrame);
    };
    drawFrame();
  });

  recorder.stop();
  musicElement?.pause();
  video.pause();
  audioContext?.close().catch(() => undefined);

  const blob = await recordingPromise;
  return URL.createObjectURL(blob);
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
      let musicStartOffset = 0;
      if (hasMusic) {
        const track = getTrackById(music);
        musicStartOffset = await resolveMusicStartOffset(inputUrl, track.file, track.highlightAt, speed);
      }

      try {
        setStatus('processing');
        const browserUrl = await encodeWithBrowser({
          inputUrl,
          speed,
          format,
          music,
          musicVolume,
          mixWithVideoAudio,
          musicStartOffset,
          onProgress: (p) => {
            if (!cancelledRef.current) setProgress(p);
          },
        });

        if (cancelledRef.current) {
          setStatus('idle');
          return null;
        }

        setProgress(100);
        setStatus('done');
        return browserUrl;
      } catch (browserError) {
        console.warn('[useSlowMotion] Encodage navigateur indisponible, fallback FFmpeg:', browserError);
      }

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

      const musicInputArgs = hasMusic ? buildMusicInputArgs(musicStartOffset) : [];

      const videoFilters = [
        ...(format !== '16:9' ? [buildCropFilter(format)] : []),
        ...(getSlowMotionVideoFilter(speed) ? [getSlowMotionVideoFilter(speed) as string] : []),
      ];
      const videoFilter = videoFilters.length > 0 ? videoFilters.join(',') : null;

      let outputArgs: string[];

      if (hasMusic && speed === 1 && format === '16:9') {
        outputArgs = [
          '-i', 'input.webm',
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
        const audioTempo = getSlowMotionAudioFilter(speed);
        const vol = (musicVolume / 100).toFixed(2);
        const audioFilter = mixWithVideoAudio
          ? `[1:a]volume=${vol}[bg];[0:a]${audioTempo}[va];[va][bg]amix=inputs=2:duration=first:dropout_transition=2[a]`
          : buildBackgroundMusicFilter(musicVolume);

        outputArgs = [
          '-i', 'input.webm',
          ...musicInputArgs,
          '-filter:v', getSlowMotionVideoFilter(speed) as string,
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
        const audioTempo = speed === 1 ? null : getSlowMotionAudioFilter(speed);
        const vol = (musicVolume / 100).toFixed(2);
        let audioFilter: string;

        if (mixWithVideoAudio) {
          const va = audioTempo ? `[0:a]${audioTempo}[va]` : '[0:a]anull[va]';
          audioFilter = audioTempo
            ? `${va};[1:a]volume=${vol}[bg];[va][bg]amix=inputs=2:duration=first:dropout_transition=2[a]`
            : `[1:a]volume=${vol}[bg];[0:a][bg]amix=inputs=2:duration=first:dropout_transition=2[a]`;
        } else {
          audioFilter = buildBackgroundMusicFilter(musicVolume);
        }

        outputArgs = [
          '-i', 'input.webm',
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
          `[0:v]${videoFilter}[v];[0:a]${getSlowMotionAudioFilter(speed)}[a]`,
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
          '-filter:v', getSlowMotionVideoFilter(speed) as string,
          '-filter:a', getSlowMotionAudioFilter(speed),
          '-c:v', 'libvpx',
          '-b:v', '2M',
          '-c:a', 'libvorbis',
          'output.webm',
        ];
      }

      const buildVideoOnlySlowMotionArgs = (): string[] => [
        '-i', 'input.webm',
        '-vf', videoFilter ?? (getSlowMotionVideoFilter(speed) as string),
        '-an',
        '-c:v', 'libvpx',
        '-b:v', '2M',
        'output.webm',
      ];

      const buildMusicOnlyArgs = (): string[] => {
        const musicFilter = buildBackgroundMusicFilter(musicVolume);

        if (!videoFilter) {
          return [
            '-i', 'input.webm',
            ...musicInputArgs,
            '-filter_complex', musicFilter,
            '-map', '0:v:0',
            '-map', '[a]',
            '-c:v', 'copy',
            '-c:a', 'libvorbis',
            '-shortest',
            'output.webm',
          ];
        }

        return [
          '-i', 'input.webm',
          ...musicInputArgs,
          '-filter_complex', `[0:v]${videoFilter}[v];${musicFilter}`,
          '-map', '[v]',
          '-map', '[a]',
          '-c:v', 'libvpx',
          '-b:v', '2M',
          '-c:a', 'libvorbis',
          '-shortest',
          'output.webm',
        ];
      };

      try {
        await ff.exec(outputArgs);
      } catch (execError) {
        if (cancelledRef.current) {
          setStatus('idle');
          return null;
        }

        const canRetryWithoutSourceAudio = (hasMusic && mixWithVideoAudio) || (!hasMusic && speed !== 1);
        if (!canRetryWithoutSourceAudio) throw execError;

        console.warn('[useSlowMotion] Piste audio source indisponible, nouvel essai sans audio caméra:', execError);
        await cleanupFiles(ff, ['output.webm']);
        await ff.exec(hasMusic ? buildMusicOnlyArgs() : buildVideoOnlySlowMotionArgs());
      }

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
