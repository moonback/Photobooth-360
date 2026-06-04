import { useState, useRef, useCallback } from 'react';

interface UseRecorderProps {
  onRecordingComplete: (url: string) => void;
  onRecordingStart?: () => void;
}

export function useRecorder({ onRecordingComplete, onRecordingStart }: UseRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
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

  const beginRecording = useCallback((stream: MediaStream, durationMs: number) => {
    try {
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });
      
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        onRecordingComplete(url);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      onRecordingStart?.();

      maxDurationTimerRef.current = setTimeout(() => {
        stopRecording();
      }, durationMs);
    } catch (e) {
      console.error("Failed to start recording", e);
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        onRecordingComplete(url);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      onRecordingStart?.();
      maxDurationTimerRef.current = setTimeout(() => {
        stopRecording();
      }, durationMs);
    }
  }, [onRecordingComplete, stopRecording]);

  const startRecording = useCallback((stream: MediaStream, durationMs: number = 15000) => {
    setCountdown(3);
    let counter = 3;

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
  }, [beginRecording]);

  const cancelCountdown = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      setCountdown(null);
    }
  }, []);

  return {
    isRecording,
    countdown,
    startRecording,
    stopRecording,
    cancelCountdown
  };
}
