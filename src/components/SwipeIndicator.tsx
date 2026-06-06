import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';

interface SwipeIndicatorProps {
  show: boolean;
  currentIndex: number;
  totalCount: number;
}

export function SwipeIndicator({ show, currentIndex, totalCount }: SwipeIndicatorProps) {
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    // Masquer après 5 secondes ou après interaction
    const timer = setTimeout(() => setHasInteracted(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  const showLeft = currentIndex > 0;
  const showRight = currentIndex < totalCount - 1;

  if (!show || hasInteracted || totalCount <= 1) return null;

  return (
    <AnimatePresence>
      <div 
        className="pointer-events-none fixed inset-0 z-20"
        onClick={() => setHasInteracted(true)}
      >
        {/* Indicateur gauche */}
        {showLeft && (
          <motion.div
            className="absolute left-2 top-1/2 -translate-y-1/2"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: [0.3, 0.6, 0.3] }}
            exit={{ x: -20, opacity: 0 }}
            transition={{ 
              x: { duration: 0.3 },
              opacity: { duration: 2, repeat: Infinity }
            }}
          >
            <div className="glass-panel p-2 rounded-full">
              <ChevronLeft className="w-6 h-6 text-white" />
            </div>
          </motion.div>
        )}

        {/* Indicateur droite */}
        {showRight && (
          <motion.div
            className="absolute right-2 top-1/2 -translate-y-1/2"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: [0.3, 0.6, 0.3] }}
            exit={{ x: 20, opacity: 0 }}
            transition={{ 
              x: { duration: 0.3 },
              opacity: { duration: 2, repeat: Infinity, delay: 1 }
            }}
          >
            <div className="glass-panel p-2 rounded-full">
              <ChevronRight className="w-6 h-6 text-white" />
            </div>
          </motion.div>
        )}

        {/* Message instructions */}
        <motion.div
          className="absolute bottom-32 left-1/2 -translate-x-1/2"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
        >
          <div className="glass-panel px-4 py-2 rounded-full backdrop-blur-xl">
            <p className="text-xs text-white/80 font-medium">
              ← Swipe pour naviguer →
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
