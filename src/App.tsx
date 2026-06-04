import { useEffect, useRef, useState } from "react";
import { Camera, Download, RefreshCcw, StopCircle, Video, QrCode, Film, Settings } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useRecorder } from "./hooks/useRecorder";
import SettingsModal, { AppSettings, DEFAULT_SETTINGS } from "./components/SettingsModal";

// Map accent color name → Tailwind classes used throughout the UI
const ACCENT: Record<AppSettings["accentColor"], {
  bg: string; bgHover: string; bgLight: string; border: string; text: string; ring: string; shadow: string;
}> = {
  indigo: {
    bg: "bg-indigo-500", bgHover: "hover:bg-indigo-600", bgLight: "bg-indigo-500/10",
    border: "border-indigo-500", text: "text-indigo-400", ring: "ring-indigo-500",
    shadow: "shadow-[0_0_15px_rgba(99,102,241,0.3)]",
  },
  rose: {
    bg: "bg-rose-500", bgHover: "hover:bg-rose-600", bgLight: "bg-rose-500/10",
    border: "border-rose-500", text: "text-rose-400", ring: "ring-rose-500",
    shadow: "shadow-[0_0_15px_rgba(244,63,94,0.3)]",
  },
  amber: {
    bg: "bg-amber-500", bgHover: "hover:bg-amber-600", bgLight: "bg-amber-500/10",
    border: "border-amber-500", text: "text-amber-400", ring: "ring-amber-500",
    shadow: "shadow-[0_0_15px_rgba(245,158,11,0.3)]",
  },
  emerald: {
    bg: "bg-emerald-500", bgHover: "hover:bg-emerald-600", bgLight: "bg-emerald-500/10",
    border: "border-emerald-500", text: "text-emerald-400", ring: "ring-emerald-500",
    shadow: "shadow-[0_0_15px_rgba(16,185,129,0.3)]",
  },
  cyan: {
    bg: "bg-cyan-500", bgHover: "hover:bg-cyan-600", bgLight: "bg-cyan-500/10",
    border: "border-cyan-500", text: "text-cyan-400", ring: "ring-cyan-500",
    shadow: "shadow-[0_0_15px_rgba(6,182,212,0.3)]",
  },
};

const RESOLUTION_MAP: Record<AppSettings["resolution"], { width: number; height: number }> = {
  "480p": { width: 854, height: 480 },
  "720p": { width: 1280, height: 720 },
  "1080p": { width: 1920, height: 1080 },
};

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streamAction, setStreamAction] = useState<MediaStream | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [cameraError, setCameraError] = useState<string>("");
  const [showFlash, setShowFlash] = useState<boolean>(false);
  const [gallery, setGallery] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const accent = ACCENT[settings.accentColor];

  const { isRecording, countdown, startRecording, stopRecording } = useRecorder({
    onRecordingComplete: (url) => {
      setVideoUrl(url);
      setGallery((prev) => [url, ...prev]);
    },
    onRecordingStart: () => {
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 500);
    },
  });

  // Restart camera when resolution or facingMode changes
  useEffect(() => {
    startCamera(settings.facingMode, settings.resolution);
    return () => {
      if (streamAction) {
        streamAction.getTracks().forEach((track) => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.facingMode, settings.resolution]);

  const startCamera = async (mode: "user" | "environment", res: AppSettings["resolution"]) => {
    const { width, height } = RESOLUTION_MAP[res];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: width }, height: { ideal: height } },
        audio: true,
      });
      setStreamAction(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraError("");
    } catch (err) {
      console.error("Camera access denied or not available", err);
      setCameraError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
    }
  };

  const handleStart = () => {
    if (streamAction) {
      startRecording(streamAction, settings.duration, settings.countdownSeconds);
    }
  };

  const handleReset = () => {
    setVideoUrl("");
  };

  const handleSaveSettings = (next: AppSettings) => {
    const resolutionChanged = next.resolution !== settings.resolution;
    const cameraChanged = next.facingMode !== settings.facingMode;
    setSettings(next);
    // Camera will restart via useEffect if facingMode or resolution changed
    if (!resolutionChanged && !cameraChanged) {
      // nothing else needed
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center py-10 px-4 md:px-8 font-sans selection:bg-indigo-500/30">
      <div className="w-full max-w-3xl flex flex-col items-center gap-8">

        {/* Header */}
        <div className="w-full flex items-start justify-between">
          <div className="flex-1 text-center space-y-2">
            <div className={`inline-flex items-center justify-center p-3 ${accent.bgLight} rounded-full mb-2`}>
              <Camera className={`w-8 h-8 ${accent.text}`} />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
              Photobooth <span className={accent.text}>360</span>
            </h1>
            <p className="text-zinc-400 max-w-md mx-auto">
              Créez des souvenirs inoubliables. Enregistrez un message vidéo pour l'événement !
            </p>
          </div>

          {/* Settings button */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="mt-1 p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors border border-zinc-700"
            title="Réglages"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Main Stage */}
        <div className="w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-4 md:p-6 shadow-2xl relative overflow-hidden">

          {cameraError ? (
            <div className="aspect-video bg-zinc-800/50 rounded-2xl flex items-center justify-center text-center p-6 border border-red-500/20">
              <p className="text-red-400">{cameraError}</p>
            </div>
          ) : !videoUrl ? (
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video ring-1 ring-white/10">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  isRecording ? "opacity-100 ring-2 ring-red-500" : "opacity-90"
                }`}
              />

              {/* Watermark Overlay */}
              <div className="absolute bottom-4 md:bottom-8 left-4 md:left-8 pointer-events-none z-20 flex items-center gap-2 opacity-80 mix-blend-overlay">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/40 shadow-lg">
                  <Camera className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <span className="text-white font-bold tracking-widest text-lg md:text-2xl drop-shadow-lg">
                  {settings.eventName}
                </span>
              </div>

              {/* Countdown Overlay */}
              {countdown !== null && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-10">
                  <span className="text-8xl md:text-[150px] font-bold text-white drop-shadow-2xl animate-pulse">
                    {countdown}
                  </span>
                </div>
              )}

              {/* Recording Indicator */}
              {isRecording && (
                <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-red-500/30">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-red-500 text-sm font-medium tracking-wide uppercase">REC</span>
                </div>
              )}

              {/* Flash Effect */}
              {showFlash && (
                <div className="absolute inset-0 bg-white z-50 animate-flash pointer-events-none" />
              )}
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video ring-1 ring-white/10 group">
              <video
                src={videoUrl}
                controls
                className="w-full h-full object-contain"
              />

              {/* Watermark Overlay for recorded video */}
              <div className="absolute bottom-16 md:bottom-20 left-4 md:left-8 pointer-events-none z-20 flex items-center gap-2 opacity-80 mix-blend-overlay">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/40 shadow-lg">
                  <Camera className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <span className="text-white font-bold tracking-widest text-lg md:text-2xl drop-shadow-lg">
                  {settings.eventName}
                </span>
              </div>
            </div>
          )}



          {/* Controls */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            {!videoUrl ? (
              !isRecording ? (
                <button
                  onClick={handleStart}
                  disabled={countdown !== null || !streamAction}
                  className="flex items-center gap-2 px-8 py-4 bg-white hover:bg-zinc-200 text-black font-semibold rounded-full transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <Video className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>Démarrer ({settings.duration / 1000}s)</span>
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-2 px-8 py-4 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-full transition-all active:scale-95 group shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                >
                  <StopCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>Arrêter l'enregistrement</span>
                </button>
              )
            ) : (
              <>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-full transition-all active:scale-95"
                >
                  <RefreshCcw className="w-4 h-4" />
                  <span>Refaire</span>
                </button>
                <a
                  href={videoUrl}
                  download="photobooth360.webm"
                  className={`flex items-center gap-2 px-6 py-3 ${accent.bg} ${accent.bgHover} text-white font-medium rounded-full transition-all active:scale-95 ${accent.shadow}`}
                >
                  <Download className="w-4 h-4" />
                  <span>Télécharger</span>
                </a>
              </>
            )}
          </div>

          {/* QR Code Share */}
          {videoUrl && (
            <div className="mt-8 border-t border-zinc-800 pt-8 flex flex-col items-center">
              <div className="bg-white p-4 rounded-xl shadow-lg">
                <QRCodeSVG
                  value={videoUrl}
                  size={120}
                  bgColor={"#ffffff"}
                  fgColor={"#000000"}
                  level={"L"}
                  includeMargin={false}
                />
              </div>
              <div className="mt-4 flex items-center gap-2 text-zinc-400">
                <QrCode className="w-4 h-4" />
                <span className="text-sm">Scannez pour récupérer sur votre mobile (Démo)</span>
              </div>
            </div>
          )}
        </div>

        {/* Local Session Gallery */}
        {gallery.length > 0 && (
          <div className="w-full max-w-3xl mt-4 animate-in slide-in-from-bottom-8 fade-in duration-500">
            <div className="flex items-center gap-2 mb-4 px-2">
              <Film className={`w-5 h-5 ${accent.text}`} />
              <h2 className="text-xl font-semibold text-white">Galerie de la session</h2>
              <span className="bg-zinc-800 text-zinc-300 text-xs py-1 px-2 rounded-full">{gallery.length}</span>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x px-2 scrollbar-none">
              {gallery.map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => setVideoUrl(url)}
                  className={`relative flex-shrink-0 w-32 h-44 md:w-40 md:h-56 bg-zinc-900 rounded-xl overflow-hidden snap-start transition-all border ${
                    videoUrl === url
                      ? `${accent.border} scale-95 opacity-100`
                      : "border-zinc-800 hover:border-zinc-600 opacity-60 hover:opacity-100"
                  }`}
                >
                  <video src={url} className="w-full h-full object-cover pointer-events-none" />
                  <div className="absolute inset-0 bg-black/10 hover:bg-transparent transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />
    </div>
  );
}
