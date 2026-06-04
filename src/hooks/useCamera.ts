import { useEffect, useRef, useState, useCallback } from "react";
import { AppSettings } from "../components/SettingsModal";

const RESOLUTION_MAP: Record<AppSettings["resolution"], { width: number; height: number }> = {
  "480p":  { width: 854,  height: 480  },
  "720p":  { width: 1280, height: 720  },
  "1080p": { width: 1920, height: 1080 },
};

interface UseCameraOptions {
  facingMode: "user" | "environment";
  resolution: AppSettings["resolution"];
  recordAudio: boolean;
}

export function useCamera({ facingMode, resolution, recordAudio }: UseCameraOptions) {
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string>("");

  const stopStream = useCallback((s: MediaStream | null) => {
    s?.getTracks().forEach((t) => t.stop());
  }, []);

  const startCamera = useCallback(
    async (mode: "user" | "environment", res: AppSettings["resolution"]) => {
      const { width, height } = RESOLUTION_MAP[res];
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode, width: { ideal: width }, height: { ideal: height } },
          audio: true,
        });
        newStream.getAudioTracks().forEach((t) => { t.enabled = recordAudio; });
        setStream((prev) => { stopStream(prev); return newStream; });
        if (liveVideoRef.current) liveVideoRef.current.srcObject = newStream;
        setCameraError("");
      } catch (err) {
        console.error("Camera access denied", err);
        setCameraError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
      }
    },
    [recordAudio, stopStream]
  );

  // Restart when facingMode or resolution changes
  useEffect(() => {
    startCamera(facingMode, resolution);
    return () => stopStream(stream);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode, resolution]);

  // Keep the <video> element in sync
  useEffect(() => {
    if (liveVideoRef.current && stream) {
      liveVideoRef.current.srcObject = stream;
    }
  }, [stream]);

  return { liveVideoRef, stream, cameraError, stopStream };
}
