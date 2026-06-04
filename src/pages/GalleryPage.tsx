import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Loader2, AlertCircle, Camera, RefreshCw, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAllVideos } from '../lib/videoStore';
import { listVideosFromBucket } from '../lib/uploadVideo';
import { SUPABASE_CONFIGURED } from '../lib/supabase';

interface VideoItem {
  id: string;
  url: string;
  shareUrl: string;
}

export default function GalleryPage() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      <header className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center justify-between max-w-[1800px] mx-auto">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Retour</span>
          </button>
          
          <h1 className="text-2xl font-bold">
            Galerie <span className="text-indigo-400">({videos.length})</span>
          </h1>
          
          <button
            onClick={loadAllVideos}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
        </div>
      </header>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center gap-4 min-h-[calc(100vh-80px)]">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
          <p className="text-zinc-400">Chargement des vidéos…</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center gap-3 min-h-[calc(100vh-80px)]">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-red-400 text-center">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && videos.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 min-h-[calc(100vh-80px)] text-zinc-600">
          <Camera className="w-16 h-16" />
          <p className="text-lg">Aucune vidéo enregistrée</p>
        </div>
      )}

      {/* Gallery Grid - 5 columns */}
      {!loading && !error && videos.length > 0 && (
        <div className="grid grid-cols-5 gap-6 p-6 max-w-[1800px] mx-auto">
          {videos.map((video) => (
            <div
              key={video.id}
              className="flex flex-col gap-4 items-center"
            >
              {/* Video Preview */}
              <div className="w-full aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  src={video.url}
                  className="w-full h-full object-cover"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              </div>

              {/* QR Code */}
              <div className="bg-white p-3 rounded-lg">
                <QRCodeSVG
                  value={video.shareUrl}
                  size={120}
                  bgColor="#ffffff"
                  fgColor="#09090b"
                  level="M"
                  includeMargin={false}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
