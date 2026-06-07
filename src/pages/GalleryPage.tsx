import { useEffect, useRef, useState, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { AlertCircle, ArrowLeft, Camera, Download, Loader2, Play, RefreshCw, Share2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence, PanInfo } from "motion/react";
import { useNavigate } from "react-router-dom";
import { getAllVideos } from "../lib/videoStore";
import { listVideosFromBucket } from "../lib/uploadVideo";
import { SUPABASE_CONFIGURED } from "../lib/supabase";

interface VideoItem {
  id: string;
  url: string;
  shareUrl: string;
}

// ─── Video Card ────────────────────────────────────────────────────────────────

function VideoCard({
  video,
  index,
  onClick,
}: {
  video: VideoItem;
  index: number;
  onClick: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.play().catch(() => undefined);
        else el.pause();
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-2xl bg-black text-left active:scale-[0.97] touch-manipulation"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4), type: "spring", stiffness: 260, damping: 24 }}
      aria-label={`Vidéo ${index + 1}`}
    >
      {/* Video */}
      <div className="relative overflow-hidden">
        <video
          ref={videoRef}
          src={video.url}
          className="w-full object-cover transition-transform duration-500 group-active:scale-105"
          style={{ aspectRatio: index % 3 === 1 ? "3/4" : "4/5" }}
          loop
          muted
          playsInline
          preload="metadata"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10 pointer-events-none" />

        {/* Number badge */}
        <div className="absolute top-2.5 left-2.5">
          <span className="rounded-lg bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white/80 backdrop-blur-sm">
            #{String(index + 1).padStart(2, "0")}
          </span>
        </div>

        {/* Play button */}
        <motion.div
          className="absolute bottom-3 right-3"
          animate={{ scale: isHovered ? 1.1 : 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
            <Play className="h-4 w-4 fill-black text-black ml-0.5" />
          </div>
        </motion.div>
      </div>
    </motion.button>
  );
}

// ─── Video Modal ───────────────────────────────────────────────────────────────

function VideoModal({
  video,
  index,
  total,
  onClose,
  onPrev,
  onNext,
}: {
  video: VideoItem;
  index: number;
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shareTab, setShareTab] = useState<"qr" | "download">("qr");
  const hasPrev = index > 0;
  const hasNext = index < total - 1;

  useEffect(() => {
    videoRef.current?.play();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onPrev();
      if (e.key === "ArrowRight" && hasNext) onNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  // Swipe horizontal pour naviguer
  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60 && hasNext) onNext();
    if (info.offset.x > 60 && hasPrev) onPrev();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "NeuroBooth 360", url: video.shareUrl });
      } catch {
        /* dismissed */
      }
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white active:scale-90 touch-manipulation"
          aria-label="Fermer"
        >
          <X className="h-5 w-5" />
        </button>

        <span className="text-[13px] font-bold text-white/70">
          {index + 1} / {total}
        </span>

        {/* Share natif si disponible */}
        {typeof navigator.share === "function" ? (
          <button
            type="button"
            onClick={handleShare}
            className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white active:scale-90 touch-manipulation"
            aria-label="Partager"
          >
            <Share2 className="h-4.5 w-4.5" />
          </button>
        ) : (
          <div className="w-10" />
        )}
      </div>

      {/* Video avec swipe */}
      <motion.div
        className="flex-1 relative overflow-hidden"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
      >
        <video
          key={video.url}
          ref={videoRef}
          src={video.url}
          className="h-full w-full object-contain"
          controls={false}
          loop
          playsInline
          onClick={() => {
            if (videoRef.current?.paused) videoRef.current.play();
            else videoRef.current?.pause();
          }}
        />

        {/* Nav flèches sur tablette/desktop */}
        {hasPrev && (
          <button
            type="button"
            onClick={onPrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 hidden sm:grid h-10 w-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 active:scale-90"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {hasNext && (
          <button
            type="button"
            onClick={onNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:grid h-10 w-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 active:scale-90"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        {/* Indicateur de swipe (mobile) */}
        {total > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 pointer-events-none">
            {Array.from({ length: Math.min(total, 8) }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === index
                    ? "w-4 bg-white"
                    : "w-1.5 bg-white/35"
                }`}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Bottom actions */}
      <div className="shrink-0 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        {/* Tabs QR / Télécharger */}
        <div className="mx-4 mb-3 flex gap-2 rounded-2xl bg-white/8 p-1">
          <button
            type="button"
            onClick={() => setShareTab("qr")}
            className={`flex-1 h-10 rounded-xl text-[13px] font-bold transition-all touch-manipulation ${
              shareTab === "qr" ? "bg-white text-black" : "text-white/60"
            }`}
          >
            QR Code
          </button>
          <button
            type="button"
            onClick={() => setShareTab("download")}
            className={`flex-1 h-10 rounded-xl text-[13px] font-bold transition-all touch-manipulation ${
              shareTab === "download" ? "bg-white text-black" : "text-white/60"
            }`}
          >
            Télécharger
          </button>
        </div>

        <AnimatePresence mode="wait">
          {shareTab === "qr" ? (
            <motion.div
              key="qr"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mx-4 flex items-center gap-4 rounded-2xl bg-white/8 px-4 py-3"
            >
              <div className="shrink-0 rounded-xl bg-white p-2.5">
                <QRCodeSVG value={video.shareUrl} size={80} bgColor="#fff" fgColor="#09090B" level="M" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-white">Scanner pour récupérer</p>
                <p className="mt-0.5 text-[11px] text-white/50 leading-relaxed">
                  Pointe la caméra sur le QR code pour accéder à la vidéo.
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="dl"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mx-4"
            >
              <a
                href={video.url}
                download="neurobooth360.webm"
                className="flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-neuro-accent text-[15px] font-black text-white shadow-[0_0_24px_rgba(99,102,241,0.4)] active:scale-[0.97] touch-manipulation"
              >
                <Download className="h-5 w-5" /> Sauvegarder la vidéo
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Gallery Page ──────────────────────────────────────────────────────────────

export default function GalleryPage() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const loadVideos = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (SUPABASE_CONFIGURED) {
        const urls = await listVideosFromBucket();
        setVideos(urls.map((url, i) => ({ id: `bucket-${i}`, url, shareUrl: url })));
      } else {
        const local = await getAllVideos();
        setVideos(local.map((v) => ({ ...v, shareUrl: `${window.location.origin}/share/${v.id}` })));
      }
    } catch {
      setError("Impossible de charger les vidéos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadVideos(); }, [loadVideos]);

  const selectedVideo = selectedIndex !== null ? videos[selectedIndex] : null;

  return (
    <div className="h-dvh overflow-hidden flex flex-col bg-neuro-bg text-neuro-text font-sans">

      {/* Header */}
      <header className="shrink-0 flex items-center gap-3 px-4 pt-[calc(env(safe-area-inset-top)+0.625rem)] pb-3 border-b border-white/6 bg-neuro-bg/95 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/5 text-white active:scale-92 touch-manipulation"
          aria-label="Retour"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-label text-neuro-accent">NeuroBooth</p>
          <h1 className="font-display text-[17px] font-bold text-white leading-tight truncate">
            Galerie
            {!loading && (
              <span className="ml-1.5 text-[13px] font-medium text-white/40">
                · {videos.length}
              </span>
            )}
          </h1>
        </div>

        <button
          type="button"
          onClick={loadVideos}
          disabled={loading}
          className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/5 text-white active:scale-92 disabled:opacity-40 touch-manipulation"
          aria-label="Actualiser"
        >
          <RefreshCw className={`h-[18px] w-[18px] ${loading ? "animate-spin" : ""}`} />
        </button>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto overscroll-contain">

        {/* Loading */}
        {loading && (
          <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-3">
            <Loader2 className="h-9 w-9 animate-spin text-neuro-accent" />
            <p className="text-[13px] text-neuro-muted">Chargement…</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 px-8 text-center">
            <AlertCircle className="h-10 w-10 text-red-400" />
            <p className="text-[14px] text-red-300">{error}</p>
            <button
              onClick={loadVideos}
              className="mt-2 rounded-xl bg-white/10 px-5 py-2.5 text-[13px] font-bold text-white active:scale-95"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && videos.length === 0 && (
          <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-5 px-8 text-center">
            <div className="grid h-[4.5rem] w-[4.5rem] place-items-center rounded-2xl border border-white/10 bg-white/[0.04]">
              <Camera className="h-8 w-8 text-neuro-muted" />
            </div>
            <div>
              <p className="font-display text-[17px] font-bold text-white">Aucune capture</p>
              <p className="mt-1.5 text-body text-neuro-muted">Vos vidéos apparaîtront ici après chaque session.</p>
            </div>
            <button
              onClick={() => navigate("/")}
              className="btn-primary px-8 touch-manipulation"
            >
              Faire une capture
            </button>
          </div>
        )}

        {/* Grid */}
        {!loading && !error && videos.length > 0 && (
          <div className="columns-2 gap-3 px-3 pt-3 pb-6 sm:columns-3 lg:columns-4">
            {videos.map((video, index) => (
              <VideoCard
                key={video.id}
                video={video}
                index={index}
                onClick={() => setSelectedIndex(index)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal fullscreen */}
      <AnimatePresence>
        {selectedVideo && selectedIndex !== null && (
          <VideoModal
            key={selectedVideo.id}
            video={selectedVideo}
            index={selectedIndex}
            total={videos.length}
            onClose={() => setSelectedIndex(null)}
            onPrev={() => setSelectedIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
            onNext={() => setSelectedIndex((i) => (i !== null && i < videos.length - 1 ? i + 1 : i))}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
