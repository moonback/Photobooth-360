import { Play } from "lucide-react";

interface GalleryStripProps {
  gallery: string[];
  activeUrl: string;
  accentBorder: string;
  onSelect: (url: string) => void;
}

export default function GalleryStrip({ gallery, activeUrl, accentBorder, onSelect }: GalleryStripProps) {
  if (gallery.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none snap-x" aria-label="Vidéos récentes">
      {gallery.map((url, idx) => (
        <button
          key={`${url}-${idx}`}
          type="button"
          onClick={() => onSelect(url)}
          className={`group relative h-20 w-14 flex-shrink-0 overflow-hidden rounded-2xl border snap-start transition-all hover:scale-[1.03] active:scale-95 ${
            activeUrl === url ? `${accentBorder} opacity-100 shadow-[0_0_18px_rgba(99,102,241,0.28)]` : "border-white/10 opacity-60 hover:opacity-100"
          }`}
          aria-label={`Ouvrir la vidéo ${idx + 1}`}
        >
          <video src={url} className="h-full w-full object-cover pointer-events-none" muted preload="metadata" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
          <div className="absolute bottom-1.5 left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/15 backdrop-blur-xl">
            <Play className="h-2.5 w-2.5 fill-white text-white" />
          </div>
        </button>
      ))}
    </div>
  );
}
