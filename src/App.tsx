import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Camera, Download, GalleryHorizontal, RefreshCcw } from "lucide-react";
import { motion } from "motion/react";

import SplashScreen from "./components/SplashScreen";
import CameraView from "./components/CameraView";
import PlaybackView from "./components/PlaybackView";
import RecordButton from "./components/RecordButton";
import SettingsModal, { AppSettings } from "./components/SettingsModal";
import ShareSection from "./components/ShareSection";
import EmailCaptureModal from "./components/EmailCaptureModal";
import MotorControlPanel from "./components/MotorControlPanel";
import KioskGuard from "./components/KioskGuard";
import CameraDiagnostic from "./components/CameraDiagnostic";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { PWAUpdatePrompt } from "./components/PWAUpdatePrompt";
import { useCamera } from "./hooks/useCamera";
import { useRecorder } from "./hooks/useRecorder";
import { useMotor } from "./hooks/useMotor";
import { useKiosk } from "./hooks/useKiosk";
import { useSettings } from "./hooks/useSettings";
import { useUpload } from "./hooks/useUpload";
import { useMobileOptimizations, useHapticFeedback } from "./hooks/useMobileOptimizations";
import { saveVideo } from "./lib/videoStore";
import { buildCloudShareUrl, buildLocalShareUrl, publishScreenCapture } from "./lib/screenCapture";
import { trackCapture, trackDownload, trackShare } from "./lib/analytics";
import { saveEmailCapture } from "./lib/emailCapture";
import { getPresentationBackground } from "./lib/presentationTemplates";
import { playTriggerSound } from "./lib/triggerSounds";
import { logger } from "./shared/utils/logger";
import type { EmailCaptureData } from "./components/EmailCaptureModal";

const ACCENT: Record<AppSettings["accentColor"], { bg: string; text: string; border: string; glow: string }> = {
  indigo: { bg: "bg-indigo-500", text: "text-indigo-300", border: "border-indigo-500", glow: "shadow-[0_0_30px_rgba(99,102,241,0.5)]" },
  rose: { bg: "bg-rose-500", text: "text-rose-300", border: "border-rose-500", glow: "shadow-[0_0_30px_rgba(244,63,94,0.5)]" },
  amber: { bg: "bg-amber-500", text: "text-amber-300", border: "border-amber-500", glow: "shadow-[0_0_30px_rgba(245,158,11,0.5)]" },
  emerald: { bg: "bg-emerald-500", text: "text-emerald-300", border: "border-emerald-500", glow: "shadow-[0_0_30px_rgba(16,185,129,0.5)]" },
  cyan: { bg: "bg-cyan-500", text: "text-cyan-300", border: "border-cyan-500", glow: "shadow-[0_0_30px_rgba(6,182,212,0.5)]" },
};

export default function App() {
  const navigate = useNavigate();
  const { settings, loadState, handleSave } = useSettings();
  const mobile = useMobileOptimizations();
  const haptic = useHapticFeedback();
  const motor = useMotor();
  const kiosk = useKiosk();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [gallery, setGallery] = useState<string[]>([]);
  const [shareId, setShareId] = useState("");
  const [isSavingShare, setIsSavingShare] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState("");
  const [showDiagnostic, setShowDiagnostic] = useState(false); // État pour le diagnostic
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Exposer le toggle diagnostic dans la console pour debug mobile
  useEffect(() => {
    window.toggleCameraDiagnostic = () => {
      setShowDiagnostic(prev => {
        logger.debug("[Debug] Camera diagnostic", { enabled: !prev });
        return !prev;
      });
    };
    logger.debug("[Debug] Pour afficher le diagnostic caméra, tapez: toggleCameraDiagnostic()");
    
    return () => {
      delete window.toggleCameraDiagnostic;
    };
  }, []);

  const accent = ACCENT[settings.accentColor];
  const isReviewing = Boolean(videoUrl);
  const bg = getPresentationBackground(settings.appBackground);
  const backgroundStyle = settings.appBackgroundUrl
    ? { backgroundImage: `url(${settings.appBackgroundUrl})`, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }
    : { background: `radial-gradient(circle at 50% 20%, ${bg.colors[1]}55, transparent 55%), linear-gradient(135deg, ${bg.colors.join(", ")})` };

  useEffect(() => {
    return () => {
      if (videoUrl.startsWith("blob:")) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  const { liveVideoRef, stream, cameraError } = useCamera({
    facingMode: settings.facingMode,
    resolution: settings.resolution,
    recordAudio: settings.recordAudio,
  });

  const { upload, status: uploadStatus, progress: uploadProgress, publicUrl: uploadedUrl, isConfigured: cloudEnabled } = useUpload();

  const { isRecording, countdown, isSyncing, startRecording, stopRecording } = useRecorder({
    /**
     * onBeforeRecord — sync gate.
     *
     * Called after the countdown, right before MediaRecorder.start().
     * When motorAutoStart + motorEnabled + connected:
     *   - 'ack'   → sends MOTOR:START, awaits firmware READY/RUNNING (or timeout)
     *   - 'delay' → sends MOTOR:START, waits a fixed delay
     *   - 'none'  → sends MOTOR:START without waiting
     *
     * Recording only starts once this promise resolves, ensuring the
     * turntable is already spinning at target speed on frame 1.
     */
    onBeforeRecord: (settings.motorEnabled && settings.motorAutoStart)
      ? async () => {
          if (motor.connectionState !== "connected") return;
          if (motor.isRunning) return; // already spinning, no need to sync

          const config = {
            speed: settings.motorSpeed,
            direction: settings.motorDirection,
            turns: settings.motorTurns,
            baudRate: 115200,
            backend: settings.motorBackend,
          };

          if (settings.motorSyncMode === "ack") {
            // Wait for firmware READY/RUNNING (with 4s hard timeout)
            await motor.startMotorAndWaitReady(config, 4000);

          } else if (settings.motorSyncMode === "delay") {
            // Fire START and wait a fixed duration
            await motor.startMotor(config);
            await new Promise<void>((resolve) =>
              setTimeout(resolve, settings.motorSyncDelay)
            );

          } else {
            // 'none' — fire and forget
            motor.startMotor(config).catch(console.error);
          }
        }
      : undefined,

    onRecordingStart: () => {
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 500);
      haptic.medium();
      
      // Play trigger sound
      if (settings.triggerSoundEnabled) {
        playTriggerSound(settings.triggerSound, settings.triggerSoundVolume);
      }
    },

    onRecordingComplete: async (url, blob) => {
      stream?.getAudioTracks().forEach((track: MediaStreamTrack) => { track.enabled = false; });
      
      setVideoUrl(url);
      setShareId("");
      setGallery((prev: string[]) => [url, ...prev.filter((item: string) => item !== url)]);

      // Stop motor when recording ends
      if (settings.motorEnabled && motor.isRunning) {
        motor.stopMotor().catch(console.error);
      }

      // Générer un ID unique pour la vidéo
      const videoId = `video_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      setCurrentVideoId(videoId);

      trackCapture(videoId, {
        duration: settings.duration,
        resolution: settings.resolution,
        facingMode: settings.facingMode,
      }, settings.eventName || "default");

      haptic.success();

      if (cloudEnabled) {
        upload(blob).then((publicUrl) => {
          if (publicUrl) {
            setGallery((prev: string[]) => prev.map((item: string) => (item === url ? publicUrl : item)));
            publishScreenCapture({
              videoUrl: publicUrl,
              shareUrl: buildCloudShareUrl(publicUrl),
              source: "cloud",
            });
          }
        });
      } else {
        setIsSavingShare(true);
        saveVideo(blob)
          .then((id) => {
            setShareId(id);
            publishScreenCapture({
              videoUrl: url,
              shareUrl: buildLocalShareUrl(id),
              source: "local",
            });
          })
          .catch((error) => logger.error("[App] Local share save failed", error))
          .finally(() => setIsSavingShare(false));
      }
    },
  });

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (!showSplash) {
      // If we're in share mode, return much faster (15s)
      const delay = isReviewing ? 15000 : 300000;
      inactivityTimerRef.current = setTimeout(() => {
        setShowSplash(true);
        setVideoUrl("");
        setShareId("");
      }, delay);
    }
  }, [showSplash, isReviewing]);

  useEffect(() => {
    if (showSplash) {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
      return;
    }

    resetInactivityTimer();
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"];
    events.forEach((event) => document.addEventListener(event, resetInactivityTimer));

    return () => {
      events.forEach((event) => document.removeEventListener(event, resetInactivityTimer));
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [resetInactivityTimer, showSplash]);

  useEffect(() => {
    const loadGallery = async () => {
      if (cloudEnabled) {
        const { listVideosFromBucket } = await import("./lib/uploadVideo");
        const videos = await listVideosFromBucket();
        setGallery(videos.map((video) => video.url));
      } else {
        const { getAllVideos } = await import("./lib/videoStore");
        const localVideos = await getAllVideos();
        setGallery(localVideos.map((video) => video.url));
      }
    };

    if (!showSplash) loadGallery();
  }, [showSplash, cloudEnabled]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isFullscreen) setIsFullscreen(false);
      if (event.key === "F11") {
        event.preventDefault();
        setIsFullscreen((value) => !value);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  const handleStart = () => {
    if (!stream) return;
    stream.getAudioTracks().forEach((track) => { track.enabled = settings.recordAudio; });
    startRecording(stream, settings.duration, settings.countdownSeconds);
  };

  const handleReset = () => {
    stream?.getAudioTracks().forEach((track) => { track.enabled = settings.recordAudio; });
    setVideoUrl("");
    setShareId("");
    setCurrentVideoId("");
    setIsFullscreen(false);
    
    // Feedback haptique
    haptic.light();
  };

  const handleSaveSettings = async (next: AppSettings) => {
    if (!isReviewing && stream && next.recordAudio !== settings.recordAudio) {
      stream.getAudioTracks().forEach((track) => { track.enabled = next.recordAudio; });
    }
    await handleSave(next);

    // If kiosk was just enabled and we're already in the app, enter it
    if (next.kioskEnabled && !settings.kioskEnabled && !showSplash) {
      setTimeout(() => kiosk.enter(), 300);
    }
    // If kiosk was disabled, exit it
    if (!next.kioskEnabled && kiosk.active) {
      kiosk.exit();
    }
  };

  const handleSwitchCamera = () => {
    if (isRecording || countdown !== null) return; // Ne pas changer pendant l'enregistrement ou le compte à rebours
    
    const newFacingMode = settings.facingMode === "user" ? "environment" : "user";
    logger.debug("[App] Switching camera", { from: settings.facingMode, to: newFacingMode });
    handleSave({ ...settings, facingMode: newFacingMode });
    haptic.light();
  };

  const handleEmailCapture = async (emailData: EmailCaptureData) => {
    const videoToSend = uploadedUrl || videoUrl;
    const videoIdToUse = currentVideoId || shareId || `video_${Date.now()}`;

    await saveEmailCapture({
      eventId: settings.eventName || "default",
      videoId: videoIdToUse,
      videoUrl: videoToSend,
      emailData,
      sendEmail: settings.emailSendEnabled,
    });

    // Tracker l'action
    trackShare(videoIdToUse, 'email', settings.eventName || "default");
    haptic.success();
  };

  if (loadState === "loading") {
    return (
      <div className="fixed inset-0 grid place-items-center bg-neuro-bg text-neuro-muted">
        <div className="flex flex-col items-center gap-4">
          <div className="h-11 w-11 rounded-full border-4 border-white/10 border-t-neuro-accent animate-spin" />
          <p className="text-caption font-semibold uppercase tracking-[0.18em]">Chargement des réglages</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden font-sans text-neuro-text select-none touch-none" style={backgroundStyle}>
      {showSplash ? (
        <SplashScreen
          settings={settings}
          onEnter={() => {
            setShowSplash(false);
            if (settings.kioskEnabled) {
              setTimeout(() => kiosk.enter(), 100);
            }
          }}
        />
      ) : (
        <>
          <main className={`relative flex-1 overflow-hidden bg-black ${isFullscreen ? "fixed inset-0 z-50" : ""}`}>
            {cameraError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
                <AlertCircle className="h-11 w-11 text-neuro-error" />
                <p className="max-w-sm text-body text-red-200">{cameraError}</p>
              </div>
            ) : (
              <>
                <CameraView 
              liveVideoRef={liveVideoRef} 
              isRecording={isRecording} 
              countdown={countdown}
              isSyncing={isSyncing}
              showFlash={showFlash} 
              eventName={settings.eventName} 
              hidden={isReviewing} 
              onSwitchCamera={handleSwitchCamera}
              facingMode={settings.facingMode}
            />
                {isReviewing && <PlaybackView videoUrl={videoUrl} eventName={settings.eventName} slowMotionEnabled={settings.slowMotionEnabled} slowMotionSpeed={settings.slowMotionSpeed} />}

                {/* Motor control panel — visible on camera view when motor is enabled */}
                {settings.motorEnabled && !isReviewing && (
                  <MotorControlPanel settings={settings} visible={!isReviewing} />
                )}
              </>
            )}

            {!isReviewing && (
              <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+5rem)] left-1/2 z-40 -translate-x-1/2 md:bottom-8">
                <RecordButton isRecording={isRecording} isCountingDown={countdown !== null} hasStream={Boolean(stream)} durationSeconds={settings.duration / 1000} onStart={handleStart} onStop={stopRecording} />
              </div>
            )}

            {isReviewing && (
              <div className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-30 md:bottom-0">
                {/* Auto-return countdown indicator */}
                <motion.div 
                  className="mx-auto mb-4 flex max-w-[360px] items-center justify-center gap-2 rounded-full bg-black/60 px-4 py-2 text-[12px] text-white/80 backdrop-blur"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                  Retour à l'accueil dans 15s...
                </motion.div>

                <ShareSection 
                  cloudEnabled={cloudEnabled} 
                  uploadStatus={uploadStatus} 
                  uploadProgress={uploadProgress} 
                  uploadedUrl={uploadedUrl} 
                  shareId={shareId} 
                  isSavingShare={isSavingShare} 
                  accent={accent}
                  eventId={settings.eventName || "default"}
                  onOpenEmailCapture={settings.emailCaptureEnabled ? () => {
                    setShowEmailModal(true);
                    haptic.light();
                  } : undefined}
                />
                
                {/* Simplified buttons */}
                <motion.div 
                  className="flex gap-2.5 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-2 sm:px-6"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                >
                  <motion.button 
                    type="button" 
                    onClick={handleReset} 
                    className="glass-panel group relative flex min-h-14 flex-1 items-center justify-center gap-2 overflow-hidden rounded-[1.2rem] px-4 text-[14px] font-bold text-white shadow-lg hover:bg-white/15 active:scale-[0.98] touch-manipulation" 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }} 
                    aria-label="Refaire une capture"
                    onTouchStart={() => haptic.light()}
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100"
                      initial={{ x: "-100%" }}
                      whileHover={{ x: "200%" }}
                      transition={{ duration: 0.6 }}
                    />
                    <RefreshCcw className="relative h-5 w-5" /> 
                    <span className="relative">Refaire</span>
                  </motion.button>
                </motion.div>
              </div>
            )}
          </main>


        </>
      )}

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} settings={settings} onSave={handleSaveSettings} />
      
      {/* Modal email capture */}
      <EmailCaptureModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onSubmit={handleEmailCapture}
        videoUrl={uploadedUrl || videoUrl}
      />
      
      {/* Kiosk guard — blocks navigation, shows exit PIN prompt */}
      <KioskGuard
        kioskState={kiosk}
        adminPin={settings.adminPin}
        onAdminAccess={() => {
          setSettingsOpen(true);
          haptic.medium();
        }}
        onReEnterFullscreen={() => kiosk.enter()}
        onExitKiosk={async () => {
          // Disable kiosk in settings and exit
          await handleSave({ ...settings, kioskEnabled: false });
          kiosk.exit();
          haptic.medium();
        }}
      />

      {/* iOS kiosk install hint */}
      {settings.kioskEnabled && kiosk.installRequired && !showSplash && (
        <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4rem)] z-[198] mx-4">
          <motion.div
            className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 backdrop-blur-xl"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <p className="text-[12px] font-bold text-amber-300">
              Mode kiosque complet sur iOS
            </p>
            <p className="mt-0.5 text-[11px] text-amber-200/60">
              Appuyez sur <span className="font-mono">Partager →</span> puis{" "}
              <span className="font-mono">"Sur l'écran d'accueil"</span> pour activer le plein écran.
            </p>
          </motion.div>
        </div>
      )}

      {/* Composants PWA */}
      <PWAInstallPrompt />
      <PWAUpdatePrompt />

      {/* Diagnostic caméra - activé par triple tap sur le logo ou via console */}
      {showDiagnostic && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowDiagnostic(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <CameraDiagnostic />
          </div>
        </div>
      )}
    </div>
  );
}
