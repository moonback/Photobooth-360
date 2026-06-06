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

/**
 * Get the best matching camera device ID for the desired facing mode
 */
async function getBestCameraDevice(desiredFacing: "user" | "environment"): Promise<string | undefined> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(d => d.kind === 'videoinput');
    
    console.log('Available video devices:', videoDevices.map(d => ({ 
      label: d.label, 
      deviceId: d.deviceId 
    })));

    // Try to find a device that matches the facing mode in its label
    const facingKeywords = desiredFacing === "environment" 
      ? ["back", "rear", "arrière", "environment"]
      : ["front", "face", "user", "avant", "selfie"];
    
    const matchingDevice = videoDevices.find(device => {
      const label = device.label.toLowerCase();
      return facingKeywords.some(keyword => label.includes(keyword));
    });

    if (matchingDevice) {
      console.log(`Found matching device for ${desiredFacing}:`, matchingDevice.label);
      return matchingDevice.deviceId;
    }

    // Fallback: if environment, try to get the last camera (usually rear on mobile)
    if (desiredFacing === "environment" && videoDevices.length > 1) {
      console.log('Using last device as environment camera');
      return videoDevices[videoDevices.length - 1].deviceId;
    }

    // Fallback: if user, try to get the first camera (usually front on mobile)
    if (desiredFacing === "user" && videoDevices.length > 0) {
      console.log('Using first device as user camera');
      return videoDevices[0].deviceId;
    }

    return undefined;
  } catch (err) {
    console.error('Error enumerating devices:', err);
    return undefined;
  }
}

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
      console.log("Starting camera with:", { mode, resolution: res, width, height, recordAudio });
      
      try {
        let newStream: MediaStream | null = null;

        // Strategy 1: Try to get specific device ID (most reliable on mobile)
        const deviceId = await getBestCameraDevice(mode);
        
        if (deviceId) {
          console.log(`Attempting with specific deviceId: ${deviceId}`);
          try {
            newStream = await navigator.mediaDevices.getUserMedia({
              video: {
                deviceId: { exact: deviceId },
                width: { ideal: width },
                height: { ideal: height }
              },
              audio: recordAudio,
            });
            console.log("✓ Camera stream obtained with deviceId");
          } catch (deviceError) {
            console.warn("Failed with deviceId, trying facingMode:", deviceError);
          }
        }

        // Strategy 2: Try with ideal facingMode
        if (!newStream) {
          try {
            newStream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: { ideal: mode },
                width: { ideal: width },
                height: { ideal: height }
              },
              audio: recordAudio,
            });
            console.log("✓ Camera stream obtained with ideal facingMode");
          } catch (idealError) {
            console.warn("Failed with ideal facingMode, trying exact:", idealError);
          }
        }

        // Strategy 3: Try with exact facingMode (strict for mobile)
        if (!newStream) {
          try {
            newStream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: { exact: mode },
                width: { ideal: width },
                height: { ideal: height }
              },
              audio: recordAudio,
            });
            console.log("✓ Camera stream obtained with exact facingMode");
          } catch (exactError) {
            console.warn("Failed with exact facingMode, trying basic:", exactError);
          }
        }

        // Strategy 4: Fallback to basic constraints
        if (!newStream) {
          newStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: mode }
            },
            audio: recordAudio,
          });
          console.log("✓ Camera stream obtained with basic constraints");
        }

        // Log final stream info
        const videoTrack = newStream.getVideoTracks()[0];
        const settings = videoTrack?.getSettings();
        console.log("Camera stream final:", {
          videoTracks: newStream.getVideoTracks().length,
          audioTracks: newStream.getAudioTracks().length,
          settings: {
            facingMode: settings?.facingMode,
            width: settings?.width,
            height: settings?.height,
            deviceId: settings?.deviceId,
          }
        });

        setStream((prev) => { stopStream(prev); return newStream; });
        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = newStream;
          console.log("Video element srcObject set");
        }
        setCameraError("");
      } catch (err) {
        console.error("Camera access error:", err);
        const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
        setCameraError(`Impossible d'accéder à la caméra ${mode === "environment" ? "arrière" : "avant"}. ${errorMessage}`);
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
