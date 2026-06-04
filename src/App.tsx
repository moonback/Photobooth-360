import { useEffect, useRef, useState } from "react";
import { Camera, Download, RefreshCcw, StopCircle, Video, QrCode, Film, Settings, Loader2, CloudUpload, Wifi, WifiOff, Sparkles, Timer, Mic, MicOff } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useRecorder } from "./hooks/useRecorder";
import SettingsModal, { AppSettings, DEFAULT_SETTINGS } from "./components/SettingsModal";
import { saveVideo } from "./lib/videoStore";
import { useUpload } from "./hooks/useUpload";

const ACCENT: Record<AppSettings["accentColor"], {
  bg: string; bgHover: string; bgLight: string; border: string; text: string; ring: string; shadow: string;
}> = {
  // "indigo" maps to electric violet (#8B5CF6 / violet-500) — Requirements: 1.3, 14.2, 14.5
  indigo: {
    bg: "bg-violet-500", bgHover: "hover:bg-violet-600", bgLight: "bg-violet-500/10",
    border: "border-violet-500", text: "text-violet-400", ring: "ring-violet-500",
    shadow: "shadow-[0_0_15px_rgba(139,92,246,0.3)]",
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
  // "cyan" stays as neon blue (#06B6D4 / cyan-500) — Requirements: 1.3, 14.2, 14.5
  cyan: {
    bg: "bg-cyan-500", bgHover: "hover:bg-cyan-600", bgLight: "bg-cyan-500/10",
    border: "border-cyan-500", text: "text-cyan-400", ring: "ring-cyan-500",
    shadow: "shadow-[0_0_15px_rgba(6,182,212,0.3)]",
  },
};

const RESOLUTION_MAP: Record<AppSettings["resolution"], { width: number; height: number }> = {
  "480p":  { width: 854,  height: 480  },
  "720p":  { width: 1280, height: 720  },
  "1080p": { width: 1920, height: 1080 },
};

export default function App() {
  // Separate ref for the live webcam feed — never used for playback
  const liveVideoRef = useRef<HTMLVideoElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [cameraError, setCameraError] = useState<string>("");
  const [showFlash, setShowFlash] = useState<boolean>(false);
  const [gallery, setGallery] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  // QR share: the IndexedDB video ID and the saving state
  const [shareId, setShareId] = useState<string>("");
  const [isSavingShare, setIsSavingShare] = useState(false);

  // Cloud upload via Supabase
  const { upload, status: uploadStatus, progress: uploadProgress, publicUrl: uploadedUrl, isConfigured: cloudEnabled } = useUpload();

  const accent = ACCENT[settings.accentColor];

  const { isRecording, countdown, startRecording, stopRecording } = useRecorder({
    onRecordingComplete: (url) => {
      // Silence audio tracks during review to prevent mic feedback
      if (stream) {
        stream.getAudioTracks().forEach((t) => { t.enabled = false; });
      }
      setVideoUrl(url);
      setShareId("");
      setGallery((prev) => [url, ...prev]);

      if (cloudEnabled) {
        // Cloud path: upload to Supabase — share URL will be the public CDN link
        upload(url); // status tracked via useUpload
      } else {
        // Local fallback: save to IndexedDB
        setIsSavingShare(true);
        saveVideo(url)
          .then((id) => { setShareId(id); })
          .catch(console.error)
          .finally(() => setIsSavingShare(false));
      }
    },
    onRecordingStart: () => {
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 500);
    },
  });

  // Start/restart camera whenever facingMode or resolution setting changes
  useEffect(() => {
    startCamera(settings.facingMode, settings.resolution);
    return () => stopStream(stream);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.facingMode, settings.resolution]);

  // Keep the live <video> element pointing at the stream whenever it changes
  useEffect(() => {
    if (liveVideoRef.current && stream) {
      liveVideoRef.current.srcObject = stream;
    }
  }, [stream]);

  function stopStream(s: MediaStream | null) {
    s?.getTracks().forEach((t) => t.stop());
  }

  const startCamera = async (mode: "user" | "environment", res: AppSettings["resolution"]) => {
    const { width, height } = RESOLUTION_MAP[res];
    try {
      // Stop any previous stream first
      stopStream(stream);

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: width }, height: { ideal: height } },
        audio: true, // always request audio permission; we control track.enabled separately
      });

      // Apply the audio setting immediately — disabled by default
      newStream.getAudioTracks().forEach((t) => { t.enabled = settings.recordAudio; });

      setStream(newStream);

      // Attach directly in case useEffect fires after this
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = newStream;
      }
      setCameraError("");
    } catch (err) {
      console.error("Camera access denied or not available", err);
      setCameraError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
    }
  };

  const handleStart = () => {
    if (!stream) return;
    // Enable audio tracks only if the setting is on
    stream.getAudioTracks().forEach((t) => { t.enabled = settings.recordAudio; });
    startRecording(stream, settings.duration, settings.countdownSeconds);
  };

  const handleReset = () => {
    // Re-apply audio setting for the next take
    stream?.getAudioTracks().forEach((t) => { t.enabled = settings.recordAudio; });
    setVideoUrl("");
    setShareId("");
  };

  const handleSaveSettings = (next: AppSettings) => {
    // If only the audio setting changed (no camera restart needed), apply immediately
    if (!isReviewing && stream && next.recordAudio !== settings.recordAudio) {
      stream.getAudioTracks().forEach((t) => { t.enabled = next.recordAudio; });
    }
    setSettings(next);
  };

  // Viewing mode: true when a recorded video is selected for review
  const isReviewing = Boolean(videoUrl);
  const cameraStatusTone = cameraError ? "error" : stream ? "ready" : "loading";
  const cameraStatusLabel = cameraStatusTone === "error"
    ? "Caméra indisponible"
    : cameraStatusTone === "ready"
      ? "Caméra prête"
      : "Initialisation caméra";
  const cameraStatusClass = {
    error: "border-red-500/30 bg-red-500/10 text-red-300",
    loading: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    ready: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  }[cameraStatusTone];
  const cameraStatusDotClass = {
    error: "bg-red-400",
    loading: "bg-amber-400",
    ready: "bg-emerald-400",
  }[cameraStatusTone];
  const workflowStatusLabel = isRecording ? "Enregistrement" : isReviewing ? "Relecture" : "Accueil studio";
  const accueilSteps = [
    { icon: Camera, title: "Cadrez", description: "Placez-vous face à la caméra et vérifiez le filigrane." },
    { icon: Video, title: "Enregistrez", description: `Lancez une prise guidée de ${settings.duration / 1000}s.` },
    { icon: QrCode, title: "Partagez", description: cloudEnabled ? "Récupération cloud par QR Code." : "QR Code local sur le même Wi‑Fi." },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0F0F0F] text-zinc-100 flex flex-col items-center py-8 px-4 md:px-8 font-sans selection:bg-violet-500/30">
      <div className={`pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full ${accent.bgLight} blur-3xl`} />
      <div className="pointer-events-none absolute left-[-12rem] top-32 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className={`pointer-events-none absolute bottom-[-14rem] right-[-10rem] h-96 w-96 rounded-full ${accent.bgLight} blur-3xl`} />
      <div className="w-full max-w-3xl flex flex-col items-center gap-8 relative z-10">

        {/* Header / Accueil */}
        <header className="w-full relative overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/70 px-5 py-7 md:px-8 md:py-10 shadow-2xl">
          <div className={`pointer-events-none absolute inset-x-10 -top-24 h-48 ${accent.bgLight} blur-3xl`} />
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="absolute right-4 top-4 z-10 p-2.5 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white premium-interactive active:scale-[0.98] hover:scale-[1.02] border border-white/10 premium-touch backdrop-blur-lg"
            title="Réglages"
            aria-label="Ouvrir les réglages"
          >
            <Settings className="w-5 h-5" />
          </button>

          <div className="relative flex flex-col items-center text-center">
            <div className={`mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 ${accent.bgLight} px-3 py-1 text-xs font-medium ${accent.text}`}>
              <Sparkles className="h-3.5 w-3.5" />
              Expérience vidéo premium
            </div>
            <div className={`inline-flex items-center justify-center p-4 ${accent.bgLight} rounded-3xl mb-4 ring-1 ring-white/10 ${accent.shadow}`}>
              <Camera className={`w-9 h-9 ${accent.text}`} />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white">
              Neurobooth <span className={accent.text}>360</span>
            </h1>
            <p className="mt-3 text-zinc-400 max-w-xl mx-auto leading-relaxed">
              Accueil studio prêt pour vos invités : cadrage instantané, enregistrement guidé et partage par QR Code.
            </p>

            <div className="mt-6 grid w-full grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Résumé des réglages d'accueil">
              <div className="glass-subtle rounded-2xl px-4 py-3 text-left">
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
                  <Timer className="h-3.5 w-3.5" /> Durée
                </div>
                <div className="mt-1 text-lg font-semibold text-white">{settings.duration / 1000}s</div>
              </div>
              <div className="glass-subtle rounded-2xl px-4 py-3 text-left">
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
                  <Sparkles className="h-3.5 w-3.5" /> Décompte
                </div>
                <div className="mt-1 text-lg font-semibold text-white">
                  {settings.countdownSeconds > 0 ? `${settings.countdownSeconds}s` : "Aucun"}
                </div>
              </div>
              <div className="glass-subtle rounded-2xl px-4 py-3 text-left">
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
                  {settings.recordAudio ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
                  Audio
                </div>
                <div className="mt-1 text-lg font-semibold text-white">
                  {settings.recordAudio ? "Activé" : "Silencieux"}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="#camera-stage"
                className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 premium-touch ${accent.bg} ${accent.bgHover} text-sm font-semibold text-white premium-interactive hover:scale-[1.02] active:scale-[0.98] ${accent.shadow}`}
              >
                <Camera className="h-4 w-4" />
                Aller à la caméra
              </a>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-zinc-900/80 px-5 py-3 premium-touch text-sm font-medium text-zinc-300 premium-interactive hover:scale-[1.02] hover:bg-zinc-800 hover:text-white active:scale-[0.98]"
              >
                <Settings className="h-4 w-4" />
                Ajuster l'accueil
              </button>
            </div>
          </div>
        </header>

        <section className="grid w-full grid-cols-1 gap-3 md:grid-cols-3" aria-label="Guide rapide de l'accueil">
          {accueilSteps.map(({ icon: StepIcon, title, description }) => (
            <article key={title} className="glass-subtle rounded-3xl p-4 shadow-lg">
              <div className={`mb-3 inline-flex rounded-2xl ${accent.bgLight} p-2 ${accent.text}`}>
                <StepIcon className="h-5 w-5" />
              </div>
              <h2 className="text-sm font-semibold text-white">{title}</h2>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">{description}</p>
            </article>
          ))}
        </section>

        {/* Main Stage */}
        <div id="camera-stage" className="w-full glass border-zinc-800/50 rounded-3xl p-4 md:p-6 shadow-2xl relative overflow-hidden scroll-mt-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">Accueil caméra</p>
              <h2 className="text-lg font-semibold text-white">{workflowStatusLabel}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${cameraStatusClass}`}>
                <span className={`h-2 w-2 rounded-full ${cameraStatusDotClass}`} />
                {cameraStatusLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-zinc-900/70 px-3 py-1 text-xs font-medium text-zinc-300">
                {cloudEnabled ? <Wifi className="h-3 w-3 text-emerald-400" /> : <WifiOff className="h-3 w-3 text-zinc-500" />}
                {cloudEnabled ? "Cloud" : "Local"}
              </span>
            </div>
          </div>

          {cameraError ? (
            <div className="aspect-video glass-subtle rounded-2xl flex flex-col items-center justify-center text-center p-6 border border-red-500/20">
              <div className="mb-3 rounded-2xl bg-red-500/10 p-3 text-red-300 ring-1 ring-red-500/20">
                <Camera className="h-6 w-6" />
              </div>
              <p className="max-w-sm text-sm text-red-300">{cameraError}</p>
              <p className="mt-2 text-xs text-zinc-500">Autorisez l'accès caméra dans le navigateur pour lancer l'accueil vidéo.</p>
            </div>
          ) : (
            <>
              {/* ── LIVE WEBCAM ─────────────────────────────────────────
                  Always mounted so the stream stays alive.
                  Hidden (not unmounted) while reviewing a recorded clip. */}
              <div
                className={`relative rounded-2xl overflow-hidden bg-black aspect-video ring-1 ring-white/10 ${
                  isReviewing ? "hidden" : "block"
                }`}
              >
                <video
                  ref={liveVideoRef}
                  autoPlay
                  playsInline
                  muted          /* mic audio must NEVER play back live — prevents feedback */
                  className={`w-full h-full object-cover transition-opacity duration-300 ${
                    isRecording ? "opacity-100 ring-2 ring-red-500" : "opacity-90"
                  }`}
                />

                {/* Watermark */}
                <div className="absolute bottom-4 md:bottom-8 left-4 md:left-8 pointer-events-none z-20 flex items-center gap-2 opacity-80 mix-blend-overlay">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/20 backdrop-blur-lg flex items-center justify-center border border-white/40 shadow-lg">
                    <Camera className="w-4 h-4 md:w-5 md:h-5 text-white" />
                  </div>
                  <span className="text-white font-bold tracking-widest text-lg md:text-2xl drop-shadow-lg">
                    {settings.eventName}
                  </span>
                </div>

                {/* Countdown overlay */}
                {countdown !== null && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-md z-10">
                    <span className="text-8xl md:text-[150px] font-bold text-white drop-shadow-2xl animate-pulse">
                      {countdown}
                    </span>
                  </div>
                )}

                {/* REC indicator */}
                {isRecording && (
                  <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.25)]">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-red-500 text-sm font-medium tracking-wide uppercase">REC</span>
                  </div>
                )}

                {/* Flash */}
                {showFlash && (
                  <div className="absolute inset-0 bg-white z-50 animate-flash pointer-events-none" />
                )}
              </div>

              {/* ── PLAYBACK ────────────────────────────────────────────
                  Separate element — no srcObject, pure src URL playback. */}
              {isReviewing && (
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-video ring-1 ring-white/10">
                  <video
                    key={videoUrl}
                    src={videoUrl}
                    controls
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain"
                  />

                  {/* Watermark */}
                  <div className="absolute bottom-16 md:bottom-20 left-4 md:left-8 pointer-events-none z-20 flex items-center gap-2 opacity-80 mix-blend-overlay">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/20 backdrop-blur-lg flex items-center justify-center border border-white/40 shadow-lg">
                      <Camera className="w-4 h-4 md:w-5 md:h-5 text-white" />
                    </div>
                    <span className="text-white font-bold tracking-widest text-lg md:text-2xl drop-shadow-lg">
                      {settings.eventName}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Controls */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            {!isReviewing ? (
              !isRecording ? (
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={countdown !== null || !stream}
                  className={`flex items-center gap-2 px-8 py-4 premium-touch ${accent.bg} ${accent.bgHover} text-white font-semibold rounded-2xl premium-interactive hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group ${accent.shadow}`}
                >
                  <Video className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>Démarrer ({settings.duration / 1000}s)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex items-center gap-2 px-8 py-4 premium-touch bg-red-500 hover:bg-red-600 text-white font-semibold rounded-2xl premium-interactive hover:scale-[1.02] active:scale-[0.98] group shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                >
                  <StopCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>Arrêter l'enregistrement</span>
                </button>
              )
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-2 px-6 py-3 premium-touch bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-medium rounded-2xl premium-interactive active:scale-[0.98] hover:scale-[1.02]"
                >
                  <RefreshCcw className="w-4 h-4" />
                  <span>Refaire</span>
                </button>
                <a
                  href={videoUrl}
                  download="photobooth360.webm"
                  className={`flex items-center gap-2 px-6 py-3 premium-touch ${accent.bg} ${accent.bgHover} text-white font-medium rounded-2xl premium-interactive hover:scale-[1.02] active:scale-[0.98] ${accent.shadow}`}
                >
                  <Download className="w-4 h-4" />
                  <span>Télécharger</span>
                </a>
              </>
            )}
          </div>

          {/* QR Code Share */}
          {isReviewing && (
            <div className="mt-8 border-t border-zinc-800/50 pt-8">
              {/* Glassmorphism panel — Requirements: 3.1, 3.2, 3.3, 3.4, 3.5 */}
              <div className="glass rounded-2xl p-5 flex flex-col items-center gap-4">
                <div className="flex items-center gap-2 w-full">
                  <QrCode className={`w-4 h-4 ${accent.text}`} />
                  {/* text-white on zinc-900/80 dark background — contrast ≥ 4.5:1 (WCAG AA) */}
                  <span className="text-sm font-semibold text-white">Récupérer sur ton téléphone</span>
                  {/* Cloud / local badge */}
                  <span className={`ml-auto flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                    cloudEnabled
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-zinc-800 text-zinc-400"
                  }`}>
                    {cloudEnabled
                      ? <><Wifi className="w-3 h-3" /> Cloud</>
                      : <><WifiOff className="w-3 h-3" /> Local</>
                    }
                  </span>
                </div>

                {/* ── CLOUD MODE ── */}
                {cloudEnabled && (
                  <>
                    {uploadStatus === 'uploading' && (
                      <div className="w-full space-y-2">
                        <div className="flex items-center justify-between text-xs text-zinc-300">
                          <span className="flex items-center gap-1.5">
                            <CloudUpload className="w-3.5 h-3.5 animate-pulse" />
                            Upload en cours…
                          </span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${accent.bg} rounded-full transition-all duration-300`}
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        {/* text-zinc-400 on zinc-900/80 background — contrast ≥ 4.5:1 (WCAG AA) */}
                        <p className="text-xs text-zinc-400 text-center">
                          Envoi vers le cloud — le QR Code sera disponible dans quelques secondes
                        </p>
                      </div>
                    )}

                    {uploadStatus === 'done' && uploadedUrl && (
                      <>
                        <div className="bg-white p-4 rounded-2xl shadow-lg">
                          <QRCodeSVG
                            value={`${window.location.origin}/share/cloud?url=${btoa(encodeURIComponent(uploadedUrl))}`}
                            size={160}
                            bgColor="#ffffff"
                            fgColor="#000000"
                            level="M"
                            includeMargin={false}
                          />
                        </div>
                        {/* text-zinc-400 on zinc-900/80 background — contrast ≥ 4.5:1 (WCAG AA) */}
                        <p className="text-xs text-zinc-400 text-center max-w-xs">
                          Scanne depuis n'importe quel téléphone. Tu pourras choisir ton effet slow-motion avant de télécharger.
                        </p>
                        <code className="text-xs text-zinc-300 bg-zinc-800/80 px-3 py-1.5 rounded-lg break-all text-center max-w-full">
                          {uploadedUrl}
                        </code>
                      </>
                    )}

                    {uploadStatus === 'error' && (
                      <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 w-full">
                        <span>Upload échoué — partage local disponible ci-dessous.</span>
                      </div>
                    )}

                    {uploadStatus === 'idle' && (
                      <div className="flex items-center gap-2 text-zinc-300 py-4">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Préparation…</span>
                      </div>
                    )}
                  </>
                )}

                {/* ── LOCAL FALLBACK (IndexedDB) ── */}
                {(!cloudEnabled || uploadStatus === 'error') && (
                  <>
                    {isSavingShare ? (
                      <div className="flex items-center gap-2 text-zinc-300 py-4">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Préparation du lien local…</span>
                      </div>
                    ) : shareId ? (
                      <>
                        <div className="bg-white p-4 rounded-2xl shadow-lg">
                          <QRCodeSVG
                            value={`${window.location.origin}/share/${shareId}`}
                            size={160}
                            bgColor="#ffffff"
                            fgColor="#000000"
                            level="M"
                            includeMargin={false}
                          />
                        </div>
                        {/* text-zinc-400 on zinc-900/80 background — contrast ≥ 4.5:1 (WCAG AA) */}
                        <p className="text-xs text-zinc-400 text-center max-w-xs">
                          Scanne depuis le même réseau Wi-Fi. Tu pourras choisir ton effet slow-motion avant de télécharger.
                        </p>
                        <p className="text-xs text-zinc-400 text-center">
                          Pour un partage cross-réseau, configure Supabase dans le fichier <code className="text-zinc-300">.env</code>.
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-zinc-400">Lien indisponible.</p>
                    )}
                  </>
                )}
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
                  type="button"
                  aria-label={`Revoir la vidéo ${idx + 1}`}
                  aria-current={videoUrl === url ? "true" : undefined}
                  onClick={() => {
                    // Always silence mic during review — re-enabled on next record start
                    stream?.getAudioTracks().forEach((t) => { t.enabled = false; });
                    setVideoUrl(url);
                    setShareId("");
                  }}
                  className={`relative flex-shrink-0 w-32 h-44 md:w-40 md:h-56 bg-zinc-900/80 backdrop-blur-lg rounded-2xl overflow-hidden snap-start premium-interactive hover:scale-105 border ${
                    videoUrl === url
                      ? `${accent.border} opacity-100 shadow-[0_0_16px_rgba(139,92,246,0.25)]`
                      : "border-zinc-800/50 hover:border-zinc-600 opacity-60 hover:opacity-100"
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
