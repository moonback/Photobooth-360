import { useState } from "react";
import SplashScreen from "./components/SplashScreen";
import {
  Settings,
  RefreshCcw,
  Download,
  QrCode,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";

import { useCamera } from "./hooks/useCamera";
import { useRecorder } from "./hooks/useRecorder";
import { useUpload } from "./hooks/useUpload";
import { useSettings } from "./hooks/useSettings";

import CameraView from "./components/CameraView";
import PlaybackView from "./components/PlaybackView";
import RecordButton from "./components/RecordButton";
import ShareSection from "./components/ShareSection";
import GalleryStrip from "./components/GalleryStrip";
import SettingsModal, { AppSettings } from "./components/SettingsModal";

import { saveVideo } from "./lib/videoStore";

// ─── Accent palette ────────────────────────────────────────────────────────────
const ACCENT: Record<
  AppSettings["accentColor"],
  { bg: string; text: string; border: string; glow: string }
> = {
  indigo:  { bg: "bg-indigo-500",  text: "text-indigo-400",  border: "border-indigo-500",  glow: "shadow-[0_0_30px_rgba(99,102,241,0.5)]"  },
  rose:    { bg: "bg-rose-500",    text: "text-rose-400",    border: "border-rose-500",    glow: "shadow-[0_0_30px_rgba(244,63,94,0.5)]"    },
  amber:   { bg: "bg-amber-500",   text: "text-amber-400",   border: "border-amber-500",   glow: "shadow-[0_0_30px_rgba(245,158,11,0.5)]"   },
  emerald: { bg: "bg-emerald-500", text: "text-emerald-400", border: "border-emerald-500", glow: "shadow-[0_0_30px_rgba(16,185,129,0.5)]"   },
  cyan:    { bg: "bg-cyan-500",    text: "text-cyan-400",    border: "border-cyan-500",    glow: "shadow-[0_0_30px_rgba(6,182,212,0.5)]"    },
};

// ─── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  // Settings — persisted to Supabase (falls back to localStorage)
  const { settings, loadState, handleSave } = useSettings();

  const [settingsOpen, setSettingsOpen]   = useState(false);
  const [videoUrl, setVideoUrl]           = useState("");
  const [gallery, setGallery]             = useState<string[]>([]);
  const [shareId, setShareId]             = useState("");
  const [isSavingShare, setIsSavingShare] = useState(false);
  const [showFlash, setShowFlash]         = useState(false);
  const [shareOpen, setShareOpen]         = useState(false);
  const [showSplash, setShowSplash]       = useState(true);

  const accent = ACCENT[settings.accentColor];

  // Camera
  const { liveVideoRef, stream, cameraError } = useCamera({
    facingMode:  settings.facingMode,
    resolution:  settings.resolution,
    recordAudio: settings.recordAudio,
  });

  // Cloud upload
  const {
    upload,
    status:    uploadStatus,
    progress:  uploadProgress,
    publicUrl: uploadedUrl,
    isConfigured: cloudEnabled,
  } = useUpload();

  // Recorder
  const { isRecording, countdown, startRecording, stopRecording } = useRecorder({
    onRecordingStart: () => {
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 500);
    },
    onRecordingComplete: (url) => {
      // Mute mic during review
      stream?.getAudioTracks().forEach((t) => { t.enabled = false; });
      setVideoUrl(url);
      setShareId("");
      setShareOpen(true);
      setGallery((prev) => [url, ...prev]);

      if (cloudEnabled) {
        upload(url);
      } else {
        setIsSavingShare(true);
        saveVideo(url)
          .then((id) => setShareId(id))
          .catch(console.error)
          .finally(() => setIsSavingShare(false));
      }
    },
  });

  const isReviewing = Boolean(videoUrl);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleStart = () => {
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => { t.enabled = settings.recordAudio; });
    startRecording(stream, settings.duration, settings.countdownSeconds);
  };

  const handleReset = () => {
    stream?.getAudioTracks().forEach((t) => { t.enabled = settings.recordAudio; });
    setVideoUrl("");
    setShareId("");
    setShareOpen(false);
  };

  const handleGallerySelect = (url: string) => {
    stream?.getAudioTracks().forEach((t) => { t.enabled = false; });
    setVideoUrl(url);
    setShareId("");
    setShareOpen(false);
  };

  const handleSaveSettings = async (next: AppSettings) => {
    if (!isReviewing && stream && next.recordAudio !== settings.recordAudio) {
      stream.getAudioTracks().forEach((t) => { t.enabled = next.recordAudio; });
    }
    await handleSave(next);
  };

  // ── Loading screen while settings are fetched ────────────────────────
  if (loadState === 'loading') {
    return (
      <div className="fixed inset-0 bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className={`w-10 h-10 rounded-full border-4 border-zinc-700 border-t-indigo-500 animate-spin`} />
          <p className="text-zinc-500 text-sm">Chargement des réglages…</p>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-zinc-950 flex flex-col overflow-hidden font-sans select-none">

      {showSplash ? (
        <SplashScreen
          settings={settings}
          onUnlock={() => {
            setShowSplash(false);
            setSettingsOpen(true);
          }}
        />
      ) : (
        <>
          {/* ── TOP BAR ──────────────────────────────────────────────────── */}
          <header className="relative z-20 flex items-center justify-between px-5 pt-safe-top pt-4 pb-3 flex-shrink-0">
            <div className="flex flex-col leading-tight">
              <span className="text-white font-bold text-lg tracking-tight">
                Neurobooth <span className={accent.text}>360</span>
              </span>
              <span className="text-zinc-500 text-xs">{settings.eventName}</span>
            </div>

            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white active:scale-95 transition-all"
              aria-label="Réglages"
            >
              <Settings className="w-5 h-5" />
            </button>
          </header>

          {/* ── VIEWFINDER ───────────────────────────────────────────────── */}
          <div className="relative flex-1 overflow-hidden bg-black">
            {cameraError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8">
                <AlertCircle className="w-10 h-10 text-red-400" />
                <p className="text-red-300 text-center text-sm leading-relaxed">{cameraError}</p>
              </div>
            ) : (
              <>
                {/* Live feed — always mounted, hidden during review */}
                <CameraView
                  liveVideoRef={liveVideoRef}
                  isRecording={isRecording}
                  countdown={countdown}
                  showFlash={showFlash}
                  eventName={settings.eventName}
                  hidden={isReviewing}
                />

                {/* Playback — only when reviewing */}
                {isReviewing && (
                  <PlaybackView videoUrl={videoUrl} eventName={settings.eventName} />
                )}
              </>
            )}

            {/* ── SHARE DRAWER (slides up from bottom of viewfinder) ── */}
            {isReviewing && (
              <div
                className={`absolute bottom-0 left-0 right-0 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800 rounded-t-3xl z-30 transition-transform duration-300 ${
                  shareOpen ? "translate-y-0" : "translate-y-[calc(100%-3.5rem)]"
                }`}
              >
                {/* Drawer handle / toggle */}
                <button
                  onClick={() => setShareOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-5 py-3.5"
                >
                  <div className="flex items-center gap-2">
                    <QrCode className={`w-4 h-4 ${accent.text}`} />
                    <span className="text-sm font-semibold text-white">Partager</span>
                  </div>
                  {shareOpen ? (
                    <ChevronDown className="w-4 h-4 text-zinc-500" />
                  ) : (
                    <ChevronUp className="w-4 h-4 text-zinc-500" />
                  )}
                </button>

                {/* Drawer content */}
                <ShareSection
                  cloudEnabled={cloudEnabled}
                  uploadStatus={uploadStatus}
                  uploadProgress={uploadProgress}
                  uploadedUrl={uploadedUrl}
                  shareId={shareId}
                  isSavingShare={isSavingShare}
                  accent={accent}
                />
              </div>
            )}
          </div>

          {/* ── BOTTOM CONTROLS ──────────────────────────────────────────── */}
          <div className="flex-shrink-0 bg-zinc-950 border-t border-zinc-900 pb-safe-bottom">

            {/* Gallery strip */}
            {gallery.length > 0 && (
              <div className="pt-3">
                <GalleryStrip
                  gallery={gallery}
                  activeUrl={videoUrl}
                  accentBorder={accent.border}
                  onSelect={handleGallerySelect}
                />
              </div>
            )}

            {/* Main action row */}
            <div className="flex items-center justify-between px-8 py-5">

              {/* Left — Redo */}
              <div className="w-14 flex justify-center">
                {isReviewing && (
                  <button
                    onClick={handleReset}
                    className="flex flex-col items-center gap-1 group"
                    aria-label="Refaire"
                  >
                    <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center active:scale-95 transition-transform">
                      <RefreshCcw className="w-5 h-5 text-zinc-300 group-active:scale-90 transition-transform" />
                    </div>
                    <span className="text-[10px] text-zinc-500">Refaire</span>
                  </button>
                )}
              </div>

              {/* Center — Record / Stop */}
              <RecordButton
                isRecording={isRecording}
                isCountingDown={countdown !== null}
                hasStream={Boolean(stream)}
                durationSeconds={settings.duration / 1000}
                onStart={handleStart}
                onStop={stopRecording}
              />

              {/* Right — Download */}
              <div className="w-14 flex justify-center">
                {isReviewing && (
                  <a
                    href={videoUrl}
                    download="photobooth360.webm"
                    className="flex flex-col items-center gap-1 group"
                    aria-label="Télécharger"
                  >
                    <div
                      className={`w-12 h-12 rounded-full ${accent.bg} ${accent.glow} flex items-center justify-center active:scale-95 transition-transform`}
                    >
                      <Download className="w-5 h-5 text-white group-active:scale-90 transition-transform" />
                    </div>
                    <span className="text-[10px] text-zinc-500">Sauver</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── SETTINGS MODAL ───────────────────────────────────────────────── */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />
    </div>
  );
}
