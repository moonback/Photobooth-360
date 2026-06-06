import { Play } from "lucide-react";
import { motion } from "motion/react";

interface GalleryStripProps {
  gallery: string[];
  activeUrl: string;
  accentBorder: string;
  onSelect: (url: string) => void;
}

export default function GalleryStrip({ gallery, activeUrl, accentBorder, onSelect }: GalleryStripProps) {
  if (gallery.length === 0) return null;

  return (
    <div className="mb-2 px-4 pb-2" aria-label="Vidéos récentes">
      {/* Header du carousel */}
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-neuro-muted">
          Captures ({gallery.slice(0, 12).length})
        </p>
      </div>
      
      {/* Carousel */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none snap-x">
        {gallery.slice(0, 12).map((url, idx) => {
          const isActive = activeUrl === url;
          
          return (
            <motion.button
              key={`${url}-${idx}`}
              type="button"
              onClick={() => onSelect(url)}
              className={`group relative h-24 w-16 flex-shrink-0 overflow-hidden rounded-2xl border-2 snap-start transition-all touch-manipulation ${
                isActive 
                  ? `${accentBorder} opacity-100 shadow-[0_0_22px_rgba(99,102,241,0.35)]` 
                  : "border-white/15 opacity-70 hover:opacity-100 hover:border-white/30"
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label={`Ouvrir la vidéo ${idx + 1}`}
            >
              {/* Video thumbnail */}
              <video 
                src={url} 
                className="h-full w-full object-cover pointer-events-none" 
                muted 
                preload="metadata" 
              />
              
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
              
              {/* Badge numéro */}
              <div className="absolute right-1.5 top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-black/60 px-1.5 text-[10px] font-bold text-white backdrop-blur-sm">
                {idx + 1}
              </div>
              
              {/* Play button */}
              <motion.div 
                className={`absolute bottom-1.5 left-1.5 flex h-6 w-6 items-center justify-center rounded-full backdrop-blur-xl transition-all ${
                  isActive 
                    ? "bg-white/25 shadow-lg" 
                    : "bg-white/15 group-hover:bg-white/25"
                }`}
                whileHover={{ scale: 1.1 }}
              >
                <Play className="h-3 w-3 fill-white text-white" />
              </motion.div>
              
              {/* Border glow pour vidéo active */}
              {isActive && (
                <motion.div
                  className="absolute inset-0 rounded-2xl"
                  animate={{
                    boxShadow: [
                      "inset 0 0 15px rgba(99,102,241,0.3)",
                      "inset 0 0 25px rgba(99,102,241,0.5)",
                      "inset 0 0 15px rgba(99,102,241,0.3)",
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
