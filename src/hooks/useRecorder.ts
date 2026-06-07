import { useState, useRef, useCallback, useEffect } from 'react';
import { logger } from '../shared/utils/logger';

interface UseRecorderProps {
  onRecordingComplete: (url: string, blob: Blob) => void;
  onRecordingStart?: () => void;
  /**
   * Optional async gate called right before MediaRecorder.start().
   * Awaited to completion — use this to synchronise an external device
   * (e.g. motor) so it is up to speed before the first frame is captured.
   * If it throws, recording is cancelled.
   */
  onBeforeRecord?: () => Promise<void>;
}

export function useRecorder({ onRecordingComplete, onRecordingStart, onBeforeRecord }: UseRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }
  }, []);

  const beginRecording = useCallback(async (stream: MediaStream, durationMs: number) => {
    if (onBeforeRecord) {
      setIsSyncing(true);
      try {
        await onBeforeRecord();
      } catch (err) {
        logger.error('[Recorder] onBeforeRecord failed; recording cancelled', err);
        setIsSyncing(false);
        return;
      }
      setIsSyncing(false);
    }

    const startMediaRecorder = (rec: MediaRecorder) => {
      chunksRef.current = [];

      rec.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        mediaRecorderRef.current = null;
        setIsRecording(false);
        onRecordingComplete(url, blob);
      };

      rec.start();
      mediaRecorderRef.current = rec;
      setIsRecording(true);
      onRecordingStart?.();

      maxDurationTimerRef.current = setTimeout(() => {
        stopRecording();
      }, durationMs);
    };

    try {
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus',
      });
      startMediaRecorder(recorder);
    } catch {
      const recorder = new MediaRecorder(stream);
      startMediaRecorder(recorder);
    }
  }, [onBeforeRecord, onRecordingComplete, onRecordingStart, stopRecording]);

  const startRecording = useCallback(
    (stream: MediaStream, durationMs = 15000, countdownSec = 3) => {
      clearTimers();

      if (countdownSec <= 0) {
        void beginRecording(stream, durationMs);
        return;
      }

      setCountdown(countdownSec);
      let counter = countdownSec;

      timerRef.current = setInterval(() => {
        counter -= 1;
        if (counter > 0) {
          setCountdown(counter);
        } else {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          setCountdown(null);
          void beginRecording(stream, durationMs);
        }
      }, 1000);
    },
    [beginRecording, clearTimers]
  );

  const cancelCountdown = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      setCountdown(null);
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimers();
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [clearTimers]);

  return {
    isRecording,
    isSyncing,
    countdown,
    startRecording,
    stopRecording,
    cancelCountdown,
  };
}
