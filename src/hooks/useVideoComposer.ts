import { useState, useCallback } from 'react';
import { composeVideo } from '../lib/videoComposer';
import { getExportDimensions, type ExportFormat } from '../lib/exportFormat';
import { AppSettings } from '../components/SettingsModal';

export type CompositionStage = 'idle' | 'intro' | 'main' | 'outro' | 'finalizing' | 'done';

export interface UseVideoComposerReturn {
  isComposing: boolean;
  compositionStage: CompositionStage;
  compositionProgress: number;
  composeWithJingles: (
    videoUrl: string,
    settings: AppSettings,
    format?: ExportFormat,
    onProgress?: (stage: CompositionStage, progress: number) => void
  ) => Promise<string>;
}

/**
 * Hook to handle video composition with intro/outro jingles
 */
export function useVideoComposer(): UseVideoComposerReturn {
  const [isComposing, setIsComposing] = useState(false);
  const [compositionStage, setCompositionStage] = useState<CompositionStage>('idle');
  const [compositionProgress, setCompositionProgress] = useState(0);

  const composeWithJingles = useCallback(
    async (
      videoUrl: string,
      settings: AppSettings,
      format: ExportFormat = '16:9',
      onProgress?: (stage: CompositionStage, progress: number) => void
    ): Promise<string> => {
      // If jingles are disabled or not configured, return video as-is
      const introSlide = settings.introMode === "template" ? {
        template: settings.introTemplate,
        title: settings.introTitle,
        subtitle: settings.introSubtitle,
        imageUrl: settings.introImageUrl,
        background: settings.introBackground,
        durationSeconds: settings.introDurationSeconds,
      } : undefined;
      const outroSlide = settings.outroMode === "template" ? {
        template: settings.outroTemplate,
        title: settings.outroTitle,
        subtitle: settings.outroSubtitle,
        imageUrl: settings.outroImageUrl,
        background: settings.outroBackground,
        durationSeconds: settings.outroDurationSeconds,
      } : undefined;
      const introUrl = settings.introMode === "upload" ? settings.introUrl : undefined;
      const outroUrl = settings.outroMode === "upload" ? settings.outroUrl : undefined;

      if (!settings.jingleEnabled || (!introUrl && !outroUrl && !introSlide && !outroSlide)) {
        return videoUrl;
      }

      const setComposing = (stage: CompositionStage, progress: number) => {
        setIsComposing(true);
        setCompositionStage(stage);
        setCompositionProgress(progress);
        onProgress?.(stage, progress);
      };

      setComposing('intro', 0);

      try {
        const { width, height } = getExportDimensions(settings.resolution || '720p', format);

        const composedUrl = await composeVideo({
          introUrl,
          outroUrl,
          introSlide,
          outroSlide,
          mainVideoUrl: videoUrl,
          width,
          height,
          format,
          recordAudio: settings.recordAudio,
          onProgress: (stage, progress) => setComposing(stage, progress),
        });

        setComposing('done', 100);

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
