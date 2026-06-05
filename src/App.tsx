import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Camera, Download, GalleryHorizontal, Maximize2, Minimize2, RefreshCcw, Settings } from "lucide-react";
import { motion } from "motion/react";

import SplashScreen from "./components/SplashScreen";
import CameraView from "./components/CameraView";
import GalleryStrip from "./components/GalleryStrip";
import PinModal from "./components/PinModal";
import PlaybackView from "./components/PlaybackView";
import RecordButton from "./components/RecordButton";
import SettingsModal, { AppSettings } from "./components/SettingsModal";
import ShareSection from "./components/ShareSection";
import { useCamera } from "./hooks/useCamera";
import { useRecorder } from "./hooks/useRecorder";
import { useSettings } from "./hooks/useSettings";
import { useUpload } from "./hooks/useUpload";
import { saveVideo } from "./lib/videoStore";

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

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [gallery, setGallery] = useState<string[]>([]);
  const [shareId, setShareId] = useState("");
  const [isSavingShare, setIsSavingShare] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  const accent = ACCENT[settings.accentColor];
  const isReviewing = Boolean(videoUrl);

  const { liveVideoRef, stream, cameraError } = useCamera({
    facingMode: settings.facingMode,
    resolution: settings.resolution,
    recordAudio: settings.recordAudio,
  });

  const { upload, status: uploadStatus, progress: uploadProgress, publicUrl: uploadedUrl, isConfigured: cloudEnabled } = useUpload();

  const { isRecording, countdown, startRecording, stopRecording } = useRecorder({
    onRecordingStart: () => {
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 500);
    },
    onRecordingComplete: (url) => {
      stream?.getAudioTracks().forEach((track) => { track.enabled = false; });
      setVideoUrl(url);
      setShareId("");
      setGallery((prev) => [url, ...prev.filter((item) => item !== url)]);

      if (cloudEnabled) {
        upload(url).then((publicUrl) => {
          if (publicUrl) setGallery((prev) => prev.map((item) => (item === url ? publicUrl : item)));
        });
      } else {
        setIsSavingShare(true);
        saveVideo(url)
          .then((id) => setShareId(id))
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
    setIsFullscreen(false);
  };

  const handleSaveSettings = async (next: AppSettings) => {
    if (!isReviewing && stream && next.recordAudio !== settings.recordAudio) {
      stream.getAudioTracks().forEach((track) => { track.enabled = next.recordAudio; });
    }
    await handleSave(next);
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
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-neuro-bg font-sans text-neuro-text select-none">
      {showSplash ? (
        <SplashScreen
          settings={settings}
          onEnter={() => setShowSplash(false)}
          onAdmin={() => {
            setShowSplash(false);
            setSettingsOpen(true);
          }}
        />
      ) : (
        <>
          <main className={`relative flex-1 overflow-hidden bg-black ${isFullscreen ? "fixed inset-0 z-50" : ""}`}>
            {!isReviewing && (
              <button
                type="button"
                onClick={() => setIsFullscreen((value) => !value)}
                className="glass-panel absolute right-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-30 grid min-h-10 min-w-10 place-items-center rounded-full text-white transition-all hover:bg-white/10 active:scale-95 sm:right-5"
                aria-label={isFullscreen ? "Quitter le plein écran" : "Passer en plein écran"}
              >
                {isFullscreen ? <Minimize2 className="h-[18px] w-[18px]" /> : <Maximize2 className="h-[18px] w-[18px]" />}
              </button>
            )}

            {cameraError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
                <AlertCircle className="h-11 w-11 text-neuro-error" />
                <p className="max-w-sm text-body text-red-200">{cameraError}</p>
              </div>
            ) : (
              <>
                <CameraView liveVideoRef={liveVideoRef} isRecording={isRecording} countdown={countdown} showFlash={showFlash} eventName={settings.eventName} hidden={isReviewing} />
                {isReviewing && <PlaybackView videoUrl={videoUrl} eventName={settings.eventName} />}
              </>
            )}

            {!isReviewing && (
              <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+4.55rem)] left-1/2 z-40 -translate-x-1/2 md:bottom-6">
                <RecordButton isRecording={isRecording} isCountingDown={countdown !== null} hasStream={Boolean(stream)} durationSeconds={settings.duration / 1000} onStart={handleStart} onStop={stopRecording} />
              </div>
            )}

            {isReviewing && (
              <div className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+3.9rem)] z-30 md:bottom-0">
                {gallery.length > 1 && <GalleryStrip gallery={gallery.slice(0, 12)} activeUrl={videoUrl} accentBorder={accent.border} onSelect={setVideoUrl} />}
                <ShareSection cloudEnabled={cloudEnabled} uploadStatus={uploadStatus} uploadProgress={uploadProgress} uploadedUrl={uploadedUrl} shareId={shareId} isSavingShare={isSavingShare} accent={accent} />
              </div>
            )}

            {isReviewing && (
              <div className="absolute left-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-30 flex gap-2 sm:left-5">
                <motion.button type="button" onClick={handleReset} className="glass-panel flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[12px] font-bold text-white" whileTap={{ scale: 0.95 }} aria-label="Refaire une capture">
                  <RefreshCcw className="h-4 w-4" /> Refaire
                </motion.button>
                <motion.a href={videoUrl} download="neurobooth360.webm" className={`flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[12px] font-bold text-white ${accent.bg} ${accent.glow}`} whileTap={{ scale: 0.95 }} aria-label="Télécharger la vidéo">
                  <Download className="h-4 w-4" /> Sauver
                </motion.a>
              </div>
            )}
          </main>

          {!isFullscreen && (
            <nav className="glass-panel fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.55rem)] z-50 grid min-h-14 grid-cols-3 rounded-[1.25rem] p-1 md:left-1/2 md:max-w-xs md:-translate-x-1/2" aria-label="Navigation principale">
              <button type="button" onClick={isReviewing ? handleReset : undefined} className={`flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-bold transition-all active:scale-95 ${!isReviewing ? "bg-white text-black" : "text-neuro-muted hover:text-white"}`} aria-label="Capture">
                <Camera className="h-[18px] w-[18px]" /> Capture
              </button>
              <button type="button" onClick={() => navigate("/gallery")} className="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-bold text-neuro-muted transition-all hover:text-white active:scale-95" aria-label="Galerie">
                <GalleryHorizontal className="h-[18px] w-[18px]" /> Galerie
              </button>
              <button type="button" onClick={() => setShowPinModal(true)} className="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-bold text-neuro-muted transition-all hover:text-white active:scale-95" aria-label="Réglages">
                <Settings className="h-[18px] w-[18px]" /> Réglages
              </button>
            </nav>
          )}
        </>
      )}

      {showPinModal && <PinModal adminPin={settings.adminPin} onUnlock={() => { setShowPinModal(false); setSettingsOpen(true); }} onCancel={() => setShowPinModal(false)} />}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} settings={settings} onSave={handleSaveSettings} />
    </div>
  );
}
