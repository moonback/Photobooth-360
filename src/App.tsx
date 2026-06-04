import { useEffect, useRef, useState } from "react";
import { Camera, Download, RefreshCcw, StopCircle, Video, Play } from "lucide-react";
import { useRecorder } from "./hooks/useRecorder";

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streamAction, setStreamAction] = useState<MediaStream | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [cameraError, setCameraError] = useState<string>("");
  const [duration, setDuration] = useState<number>(15000);

  const { isRecording, countdown, startRecording, stopRecording } = useRecorder({
    onRecordingComplete: (url) => setVideoUrl(url),
  });

  useEffect(() => {
    startCamera();
    return () => {
      // Cleanup stream when component unmounts
      if (streamAction) {
        streamAction.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
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
      startRecording(streamAction, duration);
    }
  };

  const handleReset = () => {
    setVideoUrl("");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center py-10 px-4 md:px-8 font-sans selection:bg-indigo-500/30">
      <div className="w-full max-w-3xl flex flex-col items-center gap-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 rounded-full mb-2">
            <Camera className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
            Photobooth <span className="text-indigo-400">360</span>
          </h1>
          <p className="text-zinc-400 max-w-md mx-auto">
            Créez des souvenirs inoubliables. Enregistrez un message vidéo pour l'événement !
          </p>
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
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video ring-1 ring-white/10 group">
              <video
                src={videoUrl}
                controls
                className="w-full h-full object-contain"
              />
            </div>
          )}

          {/* Duration Selector */}
          {!videoUrl && !isRecording && countdown === null && (
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {[15000, 30000, 60000].map((ms) => (
                <button
                  key={ms}
                  onClick={() => setDuration(ms)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    duration === ms
                      ? "bg-indigo-500 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                  }`}
                >
                  {ms / 1000}s
                </button>
              ))}
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
                  <span>Démarrer ({duration / 1000}s)</span>
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
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-full transition-all active:scale-95 shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                >
                  <Download className="w-4 h-4" />
                  <span>Télécharger</span>
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
