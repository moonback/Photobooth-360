import { useEffect, useRef, useState } from "react";
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
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Exposer le toggle diagnostic dans la console pour debug mobile
  useEffect(() => {
    (window as any).toggleCameraDiagnostic = () => {
      setShowDiagnostic(prev => {
        console.log("[Debug] Camera diagnostic:", !prev ? "ON" : "OFF");
        return !prev;
      });
    };
    console.log("[Debug] Pour afficher le diagnostic caméra, tapez: toggleCameraDiagnostic()");
    
    return () => {
      delete (window as any).toggleCameraDiagnostic;
    };
  }, []);

  const accent = ACCENT[settings.accentColor];
  const isReviewing = Boolean(videoUrl);

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
    },

    onRecordingComplete: async (url) => {
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
      });

      haptic.success();

      if (cloudEnabled) {
        upload(url).then((publicUrl) => {
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
        saveVideo(url)
          .then((id) => {
            setShareId(id);
            publishScreenCapture({
              videoUrl: url,
              shareUrl: buildLocalShareUrl(id),
              source: "local",
            });
          })
          .catch(console.error)
          .finally(() => setIsSavingShare(false));
      }
    },
  });

  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (!showSplash) {
      inactivityTimerRef.current = setTimeout(() => {
        setShowSplash(true);
        setVideoUrl("");
        setShareId("");
      }, 300000);
    }
  };

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
  }, [showSplash]);

  useEffect(() => {
    const loadGallery = async () => {
      if (cloudEnabled) {
        const { listVideosFromBucket } = await import("./lib/uploadVideo");
        setGallery(await listVideosFromBucket());
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
    console.log("[App] Switching camera from", settings.facingMode, "to", newFacingMode);
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
    trackShare(videoIdToUse, 'email');
    haptic.success();
  };

  if (loadState === "loading") {
    return (
      <div className="fixed inset-0 grid place-items-center bg-neuro-bg text-neuro-muted">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-[3px] border-white/10 border-t-neuro-accent animate-spin" />
          <p className="text-label text-neuro-muted">Chargement…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-neuro-bg font-sans text-neuro-text select-none touch-none">
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
                  isFullscreen={isFullscreen}
                  onToggleFullscreen={() => setIsFullscreen((value) => !value)}
                  onSwitchCamera={handleSwitchCamera}
                  facingMode={settings.facingMode}
                />
                {isReviewing && <PlaybackView videoUrl={videoUrl} eventName={settings.eventName} />}

                {/* Motor control panel — visible on camera view when motor is enabled */}
                {settings.motorEnabled && !isReviewing && (
                  <MotorControlPanel settings={settings} visible={!isReviewing} />
                )}
              </>
            )}

            {!isReviewing && (
              <div className="absolute bottom-[var(--record-offset)] left-1/2 z-40 -translate-x-1/2">
                <RecordButton isRecording={isRecording} isCountingDown={countdown !== null} hasStream={Boolean(stream)} durationSeconds={settings.duration / 1000} onStart={handleStart} onStop={stopRecording} />
              </div>
            )}

            {isReviewing && (
              <div className="absolute inset-x-0 bottom-[var(--nav-offset)] z-30">
                <ShareSection 
                  cloudEnabled={cloudEnabled} 
                  uploadStatus={uploadStatus} 
                  uploadProgress={uploadProgress} 
                  uploadedUrl={uploadedUrl} 
                  shareId={shareId} 
                  isSavingShare={isSavingShare} 
                  accent={accent}
                  onOpenEmailCapture={settings.emailCaptureEnabled ? () => {
                    setShowEmailModal(true);
                    haptic.light();
                  } : undefined}
                />

                <motion.div 
                  className="flex gap-2 px-3 pb-2 pt-1.5 sm:px-4"
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                >
                  <button 
                    type="button" 
                    onClick={handleReset} 
                    className="btn-secondary flex-1 rounded-xl text-[13px] touch-manipulation"
                    aria-label="Refaire une capture"
                    onTouchStart={() => haptic.light()}
                  >
                    <RefreshCcw className="h-4 w-4" /> 
                    Refaire
                  </button>

                  <a 
                    href={videoUrl} 
                    download="neurobooth360.webm"
                    onClick={() => {
                      const videoId = currentVideoId || shareId || videoUrl || `video_${Date.now()}`;
                      trackDownload(videoId);
                      haptic.medium();
                    }}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl text-[13px] font-bold text-white shadow-lg active:scale-[0.97] touch-manipulation min-h-[3.25rem] ${accent.bg}`}
                    aria-label="Télécharger la vidéo"
                    onTouchStart={() => haptic.light()}
                  >
                    <Download className="h-4 w-4" /> 
                    Sauver
                  </a>
                </motion.div>
              </div>
            )}
          </main>

          {!isFullscreen && (
            <nav
              className="nav-bar fixed inset-x-0 bottom-0 z-50 flex min-h-[var(--nav-height)] items-stretch px-2 pb-[env(safe-area-inset-bottom)] pt-1 sm:inset-x-auto sm:left-1/2 sm:max-w-sm sm:-translate-x-1/2 sm:rounded-t-2xl sm:border-b-0"
              aria-label="Navigation principale"
            >
              <button 
                type="button" 
                onClick={isReviewing ? handleReset : undefined} 
                className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-bold transition-colors touch-manipulation ${!isReviewing ? "text-white" : "text-neuro-muted"}`}
                aria-label="Capture"
                aria-current={!isReviewing ? "page" : undefined}
                onTouchStart={() => haptic.light()}
              >
                {!isReviewing && (
                  <span className="absolute inset-x-2 inset-y-1 rounded-xl bg-white/10" />
                )}
                <Camera className="relative h-[20px] w-[20px]" strokeWidth={!isReviewing ? 2.5 : 2} />
                <span className="relative">Capture</span>
              </button>

              <div className="my-2 w-px bg-white/8" aria-hidden="true" />

              <button 
                type="button" 
                onClick={() => navigate("/gallery")} 
                className="relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-bold text-neuro-muted transition-colors active:text-white touch-manipulation" 
                aria-label="Galerie"
                onTouchStart={() => haptic.light()}
              >
                <GalleryHorizontal className="h-[20px] w-[20px]" />
                <span>Galerie</span>
              </button>
            </nav>
          )}
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
