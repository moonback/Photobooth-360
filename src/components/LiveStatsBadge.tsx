import { Video, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAnalytics } from '../hooks/useAnalytics';

interface LiveStatsBadgeProps {
  show?: boolean;
}

export function LiveStatsBadge({ show = true }: LiveStatsBadgeProps) {
  const { stats } = useAnalytics({
    refreshInterval: 10000,
    realtime: true,
  });

  if (!show || !stats) return null;

  const totalActions = (stats.total_captures || 0) + (stats.total_shares || 0) + (stats.total_downloads || 0);

  return (
    <AnimatePresence>
      {totalActions > 0 && (
        <motion.div
          className="fixed top-[calc(env(safe-area-inset-top)+1rem)] right-3 z-30 sm:right-5"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="glass-panel px-3 py-2 rounded-full border border-white/10 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              {/* Captures */}
              <div className="flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-xs font-bold text-white tabular-nums">
                  {stats.total_captures}
                </span>
              </div>

              {/* Divider */}
              <div className="w-px h-3 bg-white/20" />

              {/* Activité récente */}
              <div className="flex items-center gap-1.5">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                </motion.div>
                <span className="text-xs font-bold text-white tabular-nums">
                  {stats.activity_last_hour}
                </span>
              </div>

              {/* Indicateur live */}
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-green-500"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
