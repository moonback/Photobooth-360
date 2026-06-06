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
      console.log("[useCamera] Starting camera:", { mode, resolution: res, recordAudio });
      
      // First, enumerate devices to check what's available
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        console.log("[useCamera] Available video devices:", videoDevices.map(d => ({
          label: d.label || 'Unknown',
          deviceId: d.deviceId
        })));
      } catch (err) {
        console.warn("[useCamera] Could not enumerate devices:", err);
      }
      
      try {
        let newStream: MediaStream | null = null;
        let lastError: any = null;

        // Strategy 1: Try exact facingMode with high resolution (best quality)
        try {
          console.log("[useCamera] Strategy 1: Exact facingMode with full resolution");
          newStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { exact: mode },
              width: { ideal: width },
              height: { ideal: height }
            },
            audio: recordAudio,
          });
          console.log("[useCamera] ✓ Strategy 1 succeeded");
        } catch (err) {
          lastError = err;
          console.warn("[useCamera] Strategy 1 failed:", err);
        }

        // Strategy 2: Try ideal facingMode with resolution
        if (!newStream) {
          try {
            console.log("[useCamera] Strategy 2: Ideal facingMode with resolution");
            newStream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: { ideal: mode },
                width: { ideal: width },
                height: { ideal: height }
              },
              audio: recordAudio,
            });
            console.log("[useCamera] ✓ Strategy 2 succeeded");
          } catch (err) {
            lastError = err;
            console.warn("[useCamera] Strategy 2 failed:", err);
          }
        }

        // Strategy 3: Try just facingMode string (works on many mobiles)
        if (!newStream) {
          try {
            console.log("[useCamera] Strategy 3: Simple facingMode string");
            newStream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: mode,
                width: { ideal: width },
                height: { ideal: height }
              },
              audio: recordAudio,
            });
            console.log("[useCamera] ✓ Strategy 3 succeeded");
          } catch (err) {
            lastError = err;
            console.warn("[useCamera] Strategy 3 failed:", err);
          }
        }

        // Strategy 4: Try without resolution constraints
        if (!newStream) {
          try {
            console.log("[useCamera] Strategy 4: Just facingMode, no resolution");
            newStream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: mode },
              audio: recordAudio,
            });
            console.log("[useCamera] ✓ Strategy 4 succeeded");
          } catch (err) {
            lastError = err;
            console.warn("[useCamera] Strategy 4 failed:", err);
          }
        }

        // Strategy 5: Try ANY video (last resort)
        if (!newStream) {
          try {
            console.log("[useCamera] Strategy 5: Any video source");
            newStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: recordAudio,
            });
            console.log("[useCamera] ✓ Strategy 5 succeeded (but might not be correct camera)");
          } catch (err) {
            lastError = err;
            console.error("[useCamera] Strategy 5 failed:", err);
            throw lastError || err;
          }
        }

        // Log successful stream details
        if (newStream) {
          const videoTrack = newStream.getVideoTracks()[0];
          const settings = videoTrack?.getSettings();
          const capabilities = videoTrack?.getCapabilities?.();
          
          console.log("[useCamera] Stream obtained successfully:", {
            videoTracks: newStream.getVideoTracks().length,
            audioTracks: newStream.getAudioTracks().length,
            label: videoTrack?.label,
            settings: {
              facingMode: settings?.facingMode,
              width: settings?.width,
              height: settings?.height,
              deviceId: settings?.deviceId,
            },
            capabilities: capabilities ? {
              facingMode: capabilities.facingMode,
            } : 'not available'
          });

          setStream((prev) => { 
            stopStream(prev); 
            return newStream; 
          });
          
          if (liveVideoRef.current) {
            liveVideoRef.current.srcObject = newStream;
            console.log("[useCamera] Video element srcObject set");
          }
          setCameraError("");
        }

      } catch (err) {
        console.error("[useCamera] All strategies failed:", err);
        const errorMsg = err instanceof Error ? err.message : String(err);
        setCameraError(
          `Impossible d'accéder à la caméra ${mode === "environment" ? "arrière" : "avant"}. ` +
          `Erreur: ${errorMsg}. Vérifiez les permissions.`
        );
      }
    },
    [recordAudio, stopStream]
  );

  // Restart when facingMode or resolution changes
  useEffect(() => {
    console.log("[useCamera] Effect triggered - facingMode or resolution changed");
    startCamera(facingMode, resolution);
    
    // Cleanup function - stop the current stream when unmounting or before starting a new one
    return () => {
      console.log("[useCamera] Cleanup - stopping current stream");
      setStream((currentStream) => {
        stopStream(currentStream);
        return null;
      });
    };
  }, [facingMode, resolution, startCamera, stopStream]);

  // Keep the <video> element in sync - runs when stream changes OR when video element mounts
  useEffect(() => {
    const videoElement = liveVideoRef.current;
    if (videoElement && stream) {
      console.log("Syncing video element with stream");
      videoElement.srcObject = stream;
      
      // Force play in case autoPlay fails
      const playPromise = videoElement.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn("Video autoplay failed:", err);
        });
      }
    }
  }, [stream]);

  // Additional effect to handle late mounting of video element
  useEffect(() => {
    const videoElement = liveVideoRef.current;
    if (videoElement && stream && !videoElement.srcObject) {
      console.log("Late mounting detected - assigning stream to video element");
      videoElement.srcObject = stream;
      
      const playPromise = videoElement.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn("Video autoplay failed on late mount:", err);
        });
      }
    }
  });

  return { liveVideoRef, stream, cameraError, stopStream };
}
