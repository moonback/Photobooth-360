interface GalleryStripProps {
  gallery: string[];
  activeUrl: string;
  accentBorder: string;
  onSelect: (url: string) => void;
}

export default function GalleryStrip({
  gallery,
  activeUrl,
  accentBorder,
  onSelect,
}: GalleryStripProps) {
  if (gallery.length === 0) return null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 px-5 scrollbar-none snap-x">
      {gallery.map((url, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(url)}
          className={`relative flex-shrink-0 w-16 h-24 rounded-xl overflow-hidden snap-start transition-all border-2 ${
            activeUrl === url
              ? `${accentBorder} scale-95 opacity-100`
              : "border-transparent opacity-50 hover:opacity-80"
          }`}
        >
          <video
            src={url}
            className="w-full h-full object-cover pointer-events-none"
            muted
          />
          {/* Overlay number */}
          <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
            <span className="text-[9px] text-white font-bold">{idx + 1}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
