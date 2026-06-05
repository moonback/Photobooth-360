import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { AlertCircle, ArrowLeft, Camera, Download, Loader2, Play, RefreshCw, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { getAllVideos } from "../lib/videoStore";
import { listVideosFromBucket } from "../lib/uploadVideo";
import { SUPABASE_CONFIGURED } from "../lib/supabase";

interface VideoItem {
  id: string;
  url: string;
  shareUrl: string;
}

function VideoCard({ video, index, onClick }: { key?: string; video: VideoItem; index: number; onClick: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) videoElement.play().catch(() => undefined);
          else videoElement.pause();
        });
      },
      { threshold: 0.4 }
    );

    observer.observe(videoElement);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="group mb-4 block w-full break-inside-avoid overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5 text-left shadow-2xl backdrop-blur-xl transition-all hover:border-white/20 active:scale-[0.98]"
      initial={{ y: 18, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: Math.min(index * 0.035, 0.35) }}
      aria-label={`Ouvrir la vidéo ${index + 1}`}
    >
      <div className={`${index % 3 === 1 ? "aspect-[3/4]" : index % 3 === 2 ? "aspect-square" : "aspect-[4/5]"} relative overflow-hidden bg-black`}>
        <video ref={videoRef} src={video.url} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loop muted playsInline preload="metadata" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/10" />
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-caption font-bold uppercase tracking-[0.18em] text-neuro-muted">Capture</p>
            <p className="text-body font-black text-white">#{String(index + 1).padStart(2, "0")}</p>
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.25)]">
            <Play className="h-5 w-5 fill-black" />
          </span>
        </div>
      </div>
    </motion.button>
  );
}

function VideoModal({ video, onClose }: { video: VideoItem; onClose: () => void }) {
  const modalVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    modalVideoRef.current?.play();
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xl safe-top safe-bottom" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="w-full max-w-5xl" onClick={(event) => event.stopPropagation()} initial={{ scale: 0.96, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.98, y: 10, opacity: 0 }}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-caption font-bold uppercase tracking-[0.18em] text-neuro-accent">Fullscreen viewer</p>
            <h2 className="text-title font-black text-white">Vidéo prête à partager</h2>
          </div>
          <button type="button" onClick={onClose} className="grid min-h-12 min-w-12 place-items-center rounded-full border border-white/10 bg-white/5 text-white backdrop-blur-xl transition-all active:scale-95" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-black shadow-2xl">
          <video ref={modalVideoRef} src={video.url} className="max-h-[68dvh] w-full object-contain" controls loop playsInline />
        </div>

        <div className="mt-4 grid gap-3 rounded-[1.75rem] border border-white/10 bg-white/5 p-4 backdrop-blur-xl sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="mx-auto rounded-3xl bg-white p-3 sm:mx-0">
            <QRCodeSVG value={video.shareUrl} size={144} bgColor="#ffffff" fgColor="#09090B" level="M" includeMargin={false} />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-subtitle font-black text-white">Scanner pour récupérer</p>
            <p className="mt-1 text-caption text-neuro-muted">Le QR code est optimisé mobile et reste l'action principale.</p>
            <a href={video.url} download="neurobooth360.webm" className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-neuro-accent px-5 text-sm font-bold text-white shadow-[0_0_24px_rgba(99,102,241,0.35)] transition-all active:scale-95">
              <Download className="h-4 w-4" /> Télécharger
            </a>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function GalleryPage() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);

  const loadAllVideos = async () => {
    setLoading(true);
    setError("");
    try {
      if (SUPABASE_CONFIGURED) {
        const bucketVideos = await listVideosFromBucket();
        setVideos(bucketVideos.map((url, index) => ({ id: `bucket-${index}`, url, shareUrl: url })));
      } else {
        const allVideos = await getAllVideos();
        setVideos(allVideos.map((video) => ({ ...video, shareUrl: `${window.location.origin}/share/${video.id}` })));
      }
    } catch (err) {
      console.error("Error loading videos:", err);
      setError("Erreur lors du chargement des vidéos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllVideos();
  }, []);

  return (
    <div className="h-dvh overflow-y-auto bg-neuro-bg text-neuro-text font-sans safe-top safe-bottom">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-neuro-bg/80 px-4 py-4 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <button type="button" onClick={() => navigate("/")} className="grid min-h-11 min-w-11 place-items-center rounded-full border border-white/10 bg-white/5 text-neuro-muted transition-all hover:text-white active:scale-95" aria-label="Retour à la capture">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 text-center">
            <p className="text-caption font-bold uppercase tracking-[0.2em] text-neuro-accent">NeuroBooth</p>
            <h1 className="truncate text-title font-black text-white">Galerie ({videos.length})</h1>
          </div>
          <button type="button" onClick={loadAllVideos} disabled={loading} className="grid min-h-11 min-w-11 place-items-center rounded-full border border-white/10 bg-white/5 text-white transition-all hover:bg-white/10 active:scale-95 disabled:opacity-50" aria-label="Actualiser la galerie">
            <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      {loading && (
        <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 px-4">
          <Loader2 className="h-10 w-10 animate-spin text-neuro-accent" />
          <p className="text-body text-neuro-muted">Chargement des vidéos…</p>
        </div>
      )}

      {!loading && error && (
        <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-3 px-4 text-center">
          <AlertCircle className="h-11 w-11 text-neuro-error" />
          <p className="text-body text-red-200">{error}</p>
        </div>
      )}

      {!loading && !error && videos.length === 0 && (
        <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 px-4 text-center text-neuro-muted">
          <div className="grid h-20 w-20 place-items-center rounded-[2rem] border border-white/10 bg-white/5">
            <Camera className="h-10 w-10" />
          </div>
          <div>
            <p className="text-subtitle font-bold text-white">Aucune vidéo enregistrée</p>
            <p className="mt-1 text-caption">Les captures apparaîtront ici automatiquement.</p>
          </div>
        </div>
      )}

      {!loading && !error && videos.length > 0 && (
        <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
          <div className="columns-2 gap-4 sm:columns-3 lg:columns-4 xl:columns-5">
            {videos.map((video, index) => <VideoCard key={video.id || `video-${index}`} video={video} index={index} onClick={() => setSelectedVideo(video)} />)}
          </div>
        </main>
      )}

      <AnimatePresence>{selectedVideo && <VideoModal video={selectedVideo} onClose={() => setSelectedVideo(null)} />}</AnimatePresence>
    </div>
  );
}
