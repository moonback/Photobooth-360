import { useState, useRef, useCallback } from 'react';

interface UseRecorderProps {
  onRecordingComplete: (url: string) => void;
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
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const maxDurationTimerRef = useRef<NodeJS.Timeout | null>(null);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (maxDurationTimerRef.current) clearTimeout(maxDurationTimerRef.current);
  }, []);

  const beginRecording = useCallback(async (stream: MediaStream, durationMs: number) => {
    // ── Sync gate ──────────────────────────────────────────────────────────
    // Await onBeforeRecord if provided. This is where the motor reaches
    // speed before we commit the first video frame.
    if (onBeforeRecord) {
      setIsSyncing(true);
      try {
        await onBeforeRecord();
      } catch (err) {
        console.error('[Recorder] onBeforeRecord threw, aborting recording:', err);
        setIsSyncing(false);
        return;
      }
      setIsSyncing(false);
    }

    // ── MediaRecorder start ───────────────────────────────────────────────
    const startMediaRecorder = (rec: MediaRecorder) => {
      chunksRef.current = [];

      rec.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        onRecordingComplete(url);
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
      // Fallback: browser doesn't support that codec combo
      const recorder = new MediaRecorder(stream);
      startMediaRecorder(recorder);
    }
  }, [onBeforeRecord, onRecordingComplete, onRecordingStart, stopRecording]);

  const startRecording = useCallback(
    (stream: MediaStream, durationMs = 15000, countdownSec = 3) => {
      if (countdownSec <= 0) {
        beginRecording(stream, durationMs);
        return;
      }

      setCountdown(countdownSec);
      let counter = countdownSec;

      timerRef.current = setInterval(() => {
        counter--;
        if (counter > 0) {
          setCountdown(counter);
        } else {
          if (timerRef.current) clearInterval(timerRef.current);
          setCountdown(null);
          beginRecording(stream, durationMs);
        }
      }, 1000);
    },
    [beginRecording]
  );

  const cancelCountdown = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      setCountdown(null);
    }
  }, []);

  return {
    isRecording,
    isSyncing,
    countdown,
    startRecording,
    stopRecording,
    cancelCountdown,
  };
}
