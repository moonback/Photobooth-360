import { useState, useCallback } from 'react';
import { composeVideo } from '../lib/videoComposer';
import { AppSettings } from '../components/SettingsModal';

export type CompositionStage = 'idle' | 'intro' | 'main' | 'outro' | 'finalizing' | 'done';

export interface UseVideoComposerReturn {
  isComposing: boolean;
  compositionStage: CompositionStage;
  compositionProgress: number;
  composeWithJingles: (videoUrl: string, settings: AppSettings) => Promise<string>;
}

/**
 * Hook to handle video composition with intro/outro jingles
 */
export function useVideoComposer(): UseVideoComposerReturn {
  const [isComposing, setIsComposing] = useState(false);
  const [compositionStage, setCompositionStage] = useState<CompositionStage>('idle');
  const [compositionProgress, setCompositionProgress] = useState(0);

  const composeWithJingles = useCallback(
    async (videoUrl: string, settings: AppSettings): Promise<string> => {
      // If jingles are disabled or not configured, return video as-is
      const introSlide = settings.introMode === "template" ? {
        template: settings.introTemplate,
        title: settings.introTitle,
        subtitle: settings.introSubtitle,
        background: settings.introBackground,
        durationSeconds: settings.introDurationSeconds,
      } : undefined;
      const outroSlide = settings.outroMode === "template" ? {
        template: settings.outroTemplate,
        title: settings.outroTitle,
        subtitle: settings.outroSubtitle,
        background: settings.outroBackground,
        durationSeconds: settings.outroDurationSeconds,
      } : undefined;
      const introUrl = settings.introMode === "upload" ? settings.introUrl : undefined;
      const outroUrl = settings.outroMode === "upload" ? settings.outroUrl : undefined;

      if (!settings.jingleEnabled || (!introUrl && !outroUrl && !introSlide && !outroSlide)) {
        return videoUrl;
      }

      setIsComposing(true);
      setCompositionStage('intro');
      setCompositionProgress(0);

      try {
        // Get video dimensions from settings
        const resolutions = {
          '480p': { width: 854, height: 480 },
          '720p': { width: 1280, height: 720 },
          '1080p': { width: 1920, height: 1080 },
        };
        const { width, height } = resolutions[settings.resolution || '720p'];

        const composedUrl = await composeVideo({
          introUrl,
          outroUrl,
          introSlide,
          outroSlide,
          mainVideoUrl: videoUrl,
          width,
          height,
          recordAudio: settings.recordAudio,
          onProgress: (stage, progress) => {
            setCompositionStage(stage);
            setCompositionProgress(progress);
          },
        });

        setCompositionStage('done');
        setCompositionProgress(100);
        setIsComposing(false);

        return composedUrl;
      } catch (err) {
        console.error('[useVideoComposer] Composition failed:', err);
        setIsComposing(false);
        setCompositionStage('idle');
        // Return original video on error
        return videoUrl;
      }
    },
    []
  );

  return {
    isComposing,
    compositionStage,
    compositionProgress,
    composeWithJingles,
  };
}
