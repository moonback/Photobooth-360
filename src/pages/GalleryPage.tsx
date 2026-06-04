import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Loader2, AlertCircle, Camera } from 'lucide-react';
import { getAllVideos } from '../lib/videoStore';

interface VideoItem {
  id: string;
  url: string;
  shareUrl: string;
}

export default function GalleryPage() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAllVideos = async () => {
    setLoading(true);
    setError('');
    try {
      const allVideos = await getAllVideos();
      const videosWithShareUrl = allVideos.map((v) => ({
        ...v,
        shareUrl: `${window.location.origin}/share/${v.id}`,
      }));
      setVideos(videosWithShareUrl);
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
      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center gap-4 min-h-screen">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
          <p className="text-zinc-400">Chargement des vidéos…</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex flex-col items-center justify-center gap-3 min-h-screen">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-red-400 text-center">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && videos.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 min-h-screen text-zinc-600">
          <Camera className="w-16 h-16" />
          <p className="text-lg">Aucune vidéo enregistrée</p>
        </div>
      )}

      {/* Gallery Grid - 5 columns */}
      {!loading && !error && videos.length > 0 && (
        <div className="grid grid-cols-5 gap-6 p-6">
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
