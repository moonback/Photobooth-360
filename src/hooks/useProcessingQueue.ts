import { useState, useRef, useCallback } from 'react';
import { CompositionStage } from './useVideoComposer';
import { ProcessingStatus as SlowMotionStatus, SlowMotionSpeed } from './useSlowMotion';
import type { ExportFormat } from '../lib/exportFormat';

interface ProcessingItem {
  id: string;
  url: string;
  blob: Blob;
  settings: any;
  resolve: (processedUrl: string) => void;
  reject: (error: any) => void;
}

interface ProcessingStatus {
  isComposing: boolean;
  compositionStage: CompositionStage;
  compositionProgress: number;
  isProcessingSlowMotion: boolean;
  slowMotionStatus: SlowMotionStatus;
  slowMotionProgress: number;
}

export const useProcessingQueue = (
  composeWithJingles: (url: string, settings: any, format: ExportFormat, onProgress?: (stage: CompositionStage, progress: number) => void) => Promise<string>,
  processVideo: (url: string, speed: 1 | SlowMotionSpeed, format: ExportFormat, options: any, onProgress?: (status: SlowMotionStatus, progress: number) => void) => Promise<string | null>
) => {
  const [queue, setQueue] = useState<ProcessingItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentItem, setCurrentItem] = useState<ProcessingItem | null>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    isComposing: false,
    compositionStage: 'idle',
    compositionProgress: 0,
    isProcessingSlowMotion: false,
    slowMotionStatus: 'idle',
    slowMotionProgress: 0,
  });
  const isProcessingRef = useRef(false);
  const composeWithJinglesRef = useRef(composeWithJingles);
  const processVideoRef = useRef(processVideo);

  composeWithJinglesRef.current = composeWithJingles;
  processVideoRef.current = processVideo;

  const processItem = useCallback(async (item: ProcessingItem) => {
    try {
      setCurrentItem(item);
      let processedUrl = item.url;

      // Step 1: Compose intro/outro
      if (item.settings.jingleEnabled) {
        setProcessingStatus({
          isComposing: true,
          compositionStage: 'intro',
          compositionProgress: 0,
          isProcessingSlowMotion: false,
          slowMotionStatus: 'idle',
          slowMotionProgress: 0,
        });

        const composedUrl = await composeWithJinglesRef.current(
          processedUrl,
          item.settings,
          '16:9',
          (stage, progress) => {
            setProcessingStatus(prev => ({
              ...prev,
              compositionStage: stage,
              compositionProgress: progress,
            }));
          }
        );
        if (composedUrl !== processedUrl) {
          processedUrl = composedUrl;
        }
      }

      // Step 2: Apply slow motion
      if (item.settings.slowMotionEnabled) {
        setProcessingStatus({
          isComposing: false,
          compositionStage: 'idle',
          compositionProgress: 0,
          isProcessingSlowMotion: true,
          slowMotionStatus: 'loading',
          slowMotionProgress: 0,
        });

        const musicOptions = item.settings.backgroundMusicEnabled
          ? {
              music: item.settings.backgroundMusicDefault,
              musicVolume: item.settings.backgroundMusicVolume,
              mixWithVideoAudio: item.settings.recordAudio,
            }
          : {};

        const slowMoUrl = await processVideoRef.current(
          processedUrl,
          item.settings.slowMotionSpeed,
          '16:9',
          musicOptions,
          (status, progress) => {
            setProcessingStatus(prev => ({
              ...prev,
              slowMotionStatus: status,
              slowMotionProgress: progress,
            }));
          }
        );
        if (slowMoUrl) {
          processedUrl = slowMoUrl;
        }
      }

      item.resolve(processedUrl);
    } catch (error) {
      item.reject(error);
    } finally {
      setIsProcessing(false);
      setCurrentItem(null);
      setProcessingStatus({
        isComposing: false,
        compositionStage: 'idle',
        compositionProgress: 0,
        isProcessingSlowMotion: false,
        slowMotionStatus: 'idle',
        slowMotionProgress: 0,
      });
      // Process next item in queue
      processNext();
    }
  }, []);

  const processNext = useCallback(() => {
    if (isProcessingRef.current) return;
    setQueue((prevQueue) => {
      if (prevQueue.length > 0) {
        isProcessingRef.current = true;
        setIsProcessing(true);
        const [nextItem, ...remainingQueue] = prevQueue;
        processItem(nextItem);
        return remainingQueue;
      }
      return prevQueue;
    });
  }, [processItem]);

  const addToQueue = useCallback(
    (url: string, blob: Blob, settings: any): Promise<string> => {
      return new Promise((resolve, reject) => {
        const item: ProcessingItem = {
          id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          url,
          blob,
          settings,
          resolve,
          reject,
        };

        setQueue((prevQueue) => [...prevQueue, item]);
        // Start processing if queue was empty
        processNext();
      });
    },
    [processNext]
  );

  return {
    queue,
    isProcessing,
    currentItem,
    processingStatus,
    addToQueue,
  };
};
