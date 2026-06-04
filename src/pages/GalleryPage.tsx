import { useEffect, useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Loader2, AlertCircle, Camera, RefreshCw, ArrowLeft, X, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAllVideos } from '../lib/videoStore';
import { listVideosFromBucket } from '../lib/uploadVideo';
import { SUPABASE_CONFIGURED } from '../lib/supabase';

interface VideoItem {
  id: string;
  url: string;
  shareUrl: string;
}

// Video card component with intersection observer
function VideoCard({ video, qrSize, onClick }: { video: VideoItem; qrSize: number; onClick: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            videoElement.play().catch(() => {
              // Autoplay might be blocked, ignore error
            });
          } else {
            videoElement.pause();
          }
        });
      },
      {
        threshold: 0.5, // Play when 50% of video is visible
      }
    );

    observer.observe(videoElement);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="flex flex-col gap-4 items-center bg-zinc-900/50 rounded-2xl p-4 border border-zinc-800 hover:border-zinc-700 transition-colors">
      {/* Video Preview - Larger - Clickable */}
      <div 
        className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-lg relative cursor-pointer group"
        onClick={onClick}
      >
        <video
          ref={videoRef}
          src={video.url}
          className="w-full h-full object-cover"
          loop
          muted
          playsInline
          preload="metadata"
        />
        {/* Play/Expand indicator */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border-2 border-white/40">
              <div className="w-0 h-0 border-t-8 border-t-transparent border-l-12 border-l-white border-b-8 border-b-transparent ml-1" />
            </div>
          </div>
        </div>
      </div>

      {/* QR Code - Centered below video */}
      <div className="bg-white p-4 rounded-xl shadow-xl">
        <QRCodeSVG
          value={video.shareUrl}
          size={qrSize}
          bgColor="#ffffff"
          fgColor="#09090b"
          level="M"
          includeMargin={false}
        />
      </div>
    </div>
  );
}

// Video Modal Component
function VideoModal({ video, onClose }: { video: VideoItem; onClose: () => void }) {
  const modalVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Play video when modal opens
    modalVideoRef.current?.play();

    // Close on ESC key
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="relative max-w-6xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
          aria-label="Fermer"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Video */}
        <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl">
          <video
            ref={modalVideoRef}
            src={video.url}
            className="w-full h-full object-contain"
            controls
            loop
            playsInline
          />
        </div>

        {/* QR Code and Download - Below video */}
        <div className="mt-6 flex items-center justify-center gap-6">
          <div className="bg-white p-4 rounded-xl shadow-xl">
            <QRCodeSVG
              value={video.shareUrl}
              size={150}
              bgColor="#ffffff"
              fgColor="#09090b"
              level="M"
              includeMargin={false}
            />
          </div>
          
          <a
            href={video.url}
            download="photobooth360.webm"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
          >
            <Download className="w-5 h-5" />
            Télécharger
          </a>
        </div>
      </div>
    </div>
  );
}

export default function GalleryPage() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qrSize, setQrSize] = useState(120);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);

  // Adjust QR size based on screen width
  useEffect(() => {
    const updateQrSize = () => {
      // Responsive QR sizes: mobile (140), tablet (130), laptop (120), desktop (110)
      if (window.innerWidth < 640) {
        setQrSize(140); // Mobile - larger for easy scanning
      } else if (window.innerWidth < 1024) {
        setQrSize(130); // Tablet - 2 columns
      } else if (window.innerWidth < 1280) {
        setQrSize(120); // Laptop - 3 columns
      } else {
        setQrSize(110); // Desktop - 5 columns
      }
    };
    updateQrSize();
    window.addEventListener('resize', updateQrSize);
    return () => window.removeEventListener('resize', updateQrSize);
  }, []);

  const loadAllVideos = async () => {
    setLoading(true);
    setError('');
    try {
      if (SUPABASE_CONFIGURED) {
        // Load from Supabase bucket
        console.log('[GalleryPage] Loading from Supabase bucket...');
        const bucketVideos = await listVideosFromBucket();
        console.log('[GalleryPage] Found', bucketVideos.length, 'videos');
        const videosWithShareUrl = bucketVideos.map((url, index) => ({
          id: `bucket-${index}`,
          url,
          shareUrl: url, // Use the public URL directly
        }));
        setVideos(videosWithShareUrl);
      } else {
        // Load from IndexedDB
        console.log('[GalleryPage] Loading from IndexedDB...');
        const allVideos = await getAllVideos();
        console.log('[GalleryPage] Found', allVideos.length, 'videos');
        const videosWithShareUrl = allVideos.map((v) => ({
          ...v,
          shareUrl: `${window.location.origin}/share/${v.id}`,
        }));
        setVideos(videosWithShareUrl);
      }
    } catch (err) {
      console.error('Error loading videos:', err);
      setError('Erreur lors du chargement des vidéos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllVideos();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-800 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between max-w-[1800px] mx-auto">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-sm sm:text-base">Retour</span>
          </button>
          
          <h1 className="text-lg sm:text-2xl font-bold">
            Galerie <span className="text-indigo-400">({videos.length})</span>
          </h1>
          
          <button
            onClick={loadAllVideos}
            disabled={loading}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
          >
            <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
        </div>
      </header>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center gap-4 min-h-[calc(100vh-80px)] px-4">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
          <p className="text-zinc-400 text-sm sm:text-base">Chargement des vidéos…</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center gap-3 min-h-[calc(100vh-80px)] px-4">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-red-400 text-center text-sm sm:text-base">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && videos.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 min-h-[calc(100vh-80px)] text-zinc-600 px-4">
          <Camera className="w-12 h-12 sm:w-16 sm:h-16" />
          <p className="text-base sm:text-lg">Aucune vidéo enregistrée</p>
        </div>
      )}

      {/* Gallery Grid - Responsive: 1 col mobile, 2 cols tablet, 3 cols laptop, 5 cols desktop */}
      {!loading && !error && videos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6 p-4 sm:p-6 max-w-[1920px] mx-auto">
          {videos.map((video, index) => (
            <div key={video.id || `video-${index}`}>
              <VideoCard 
                video={video} 
                qrSize={qrSize}
                onClick={() => setSelectedVideo(video)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Video Modal */}
      {selectedVideo && (
        <VideoModal 
          video={selectedVideo} 
          onClose={() => setSelectedVideo(null)} 
        />
      )}
    </div>
  );
}
