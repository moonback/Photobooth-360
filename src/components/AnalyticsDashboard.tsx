import { BarChart3, Download, Eye, Share2, Video, TrendingUp, Clock, Activity, X, RefreshCw } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useAnalytics } from '../hooks/useAnalytics';
import { useEffect } from 'react';

interface AnalyticsDashboardProps {
  onClose: () => void;
}

export function AnalyticsDashboard({ onClose }: AnalyticsDashboardProps) {
  const { stats, loading, refresh } = useAnalytics({
    refreshInterval: 5000,
    realtime: true,
  });

  useEffect(() => { refresh(); }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  const mainStats = [
    {
      icon: Video,
      label: 'Captures',
      value: stats?.total_captures ?? 0,
      gradient: 'from-blue-500 to-cyan-400',
      bg: 'bg-blue-500/15',
      iconColor: 'text-blue-400',
    },
    {
      icon: Share2,
      label: 'Partages',
      value: stats?.total_shares ?? 0,
      gradient: 'from-purple-500 to-pink-400',
      bg: 'bg-purple-500/15',
      iconColor: 'text-purple-400',
    },
    {
      icon: Download,
      label: 'Téléch.',
      value: stats?.total_downloads ?? 0,
      gradient: 'from-emerald-500 to-teal-400',
      bg: 'bg-emerald-500/15',
      iconColor: 'text-emerald-400',
    },
    {
      icon: Eye,
      label: 'Vues',
      value: stats?.total_views ?? 0,
      gradient: 'from-amber-500 to-orange-400',
      bg: 'bg-amber-500/15',
      iconColor: 'text-amber-400',
    },
  ];

  return (
    <motion.div
      className="fixed inset-0 z-[110] flex items-end bg-black/80 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="relative flex max-h-[96dvh] w-full flex-col overflow-hidden rounded-t-[1.75rem] border-t border-white/10 bg-gradient-to-b from-gray-900 to-[#09090B] shadow-2xl"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 36 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <header className="flex items-center justify-between px-5 py-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 shadow-[0_0_16px_rgba(168,85,247,0.4)]">
              <BarChart3 className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <h2 className="text-[18px] font-black text-white leading-tight">Statistiques</h2>
              <div className="flex items-center gap-1.5">
                <motion.div
                  className="h-1.5 w-1.5 rounded-full bg-green-400"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <p className="text-[11px] text-white/50">Temps réel</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-white/60 active:scale-90 touch-manipulation"
              aria-label="Rafraîchir"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-white/60 active:scale-90 touch-manipulation"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-8 space-y-4">

          {/* 4 stat cards — 2×2 grid */}
          <div className="grid grid-cols-2 gap-3">
            {mainStats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.07, type: 'spring', stiffness: 300, damping: 24 }}
                className="rounded-2xl border border-white/8 bg-white/[0.04] p-4"
              >
                <div className={`mb-3 inline-flex items-center justify-center rounded-xl p-2 ${s.bg}`}>
                  <s.icon className={`h-4 w-4 ${s.iconColor}`} />
                </div>
                <div className={`text-[2rem] font-black leading-none bg-gradient-to-r ${s.gradient} bg-clip-text text-transparent tabular-nums`}>
                  {loading && !stats ? '—' : s.value.toLocaleString('fr-FR')}
                </div>
                <div className="mt-1 text-[12px] font-medium text-white/50">{s.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Activité récente — 3 cells horizontal scroll */}
          <div>
            <div className="mb-2.5 flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-400" />
              <h3 className="text-[13px] font-bold text-white">Activité</h3>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { icon: Clock, label: '1h', value: stats?.activity_last_hour ?? 0, sub: 'actions' },
                { icon: TrendingUp, label: '24h', value: stats?.activity_last_24h ?? 0, sub: 'actions' },
                { icon: Video, label: 'Unique', value: stats?.unique_videos ?? 0, sub: 'vidéos' },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="rounded-xl border border-white/8 bg-white/[0.04] p-3 text-center"
                >
                  <item.icon className="mx-auto mb-1.5 h-4 w-4 text-white/40" />
                  <div className="text-[22px] font-black text-white tabular-nums leading-none">
                    {loading && !stats ? '—' : item.value.toLocaleString('fr-FR')}
                  </div>
                  <div className="mt-1 text-[10px] text-white/40 font-medium">{item.label}</div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Chronologie */}
          <div>
            <div className="mb-2.5 flex items-center gap-2">
              <Clock className="h-4 w-4 text-cyan-400" />
              <h3 className="text-[13px] font-bold text-white">Chronologie</h3>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] overflow-hidden divide-y divide-white/8">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[12px] text-white/50">Première activité</span>
                <span className="text-[12px] font-semibold text-white">
                  {formatDate(stats?.first_activity ?? null)}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[12px] text-white/50">Dernière activité</span>
                <span className="text-[12px] font-semibold text-white">
                  {formatDate(stats?.last_activity ?? null)}
                </span>
              </div>
            </div>
          </div>

        </div>
      </motion.div>
    </motion.div>
  );
}
