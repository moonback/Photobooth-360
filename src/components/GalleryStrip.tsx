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
    <div className="flex gap-3 overflow-x-auto px-5 pb-2 scrollbar-none snap-x" aria-label="Vidéos récentes">
      {gallery.map((url, idx) => (
        <button
          key={`${url}-${idx}`}
          type="button"
          onClick={() => onSelect(url)}
          className={`group relative h-28 w-20 flex-shrink-0 overflow-hidden rounded-[1.35rem] border snap-start transition-all hover:scale-[1.03] active:scale-95 ${
            activeUrl === url ? `${accentBorder} opacity-100 shadow-[0_0_22px_rgba(99,102,241,0.3)]` : "border-white/10 opacity-70 hover:opacity-100"
          }`}
          aria-label={`Ouvrir la vidéo ${idx + 1}`}
        >
          <video src={url} className="h-full w-full object-cover pointer-events-none" muted preload="metadata" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="absolute bottom-2 left-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/15 backdrop-blur-xl">
            <Play className="h-3.5 w-3.5 fill-white text-white" />
          </div>
        </button>
      ))}
    </div>
  );
}
