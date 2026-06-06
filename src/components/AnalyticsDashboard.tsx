import { BarChart3, Download, Eye, Share2, Video, TrendingUp, Clock, Activity } from 'lucide-react';
import { motion } from 'motion/react';
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

  useEffect(() => {
    // Rafraîchir immédiatement à l'ouverture
    refresh();
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Aucune activité';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const statCards = [
    {
      icon: Video,
      label: 'Captures',
      value: stats?.total_captures || 0,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-500/10',
      iconColor: 'text-blue-400',
    },
    {
      icon: Share2,
      label: 'Partages',
      value: stats?.total_shares || 0,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-500/10',
      iconColor: 'text-purple-400',
    },
    {
      icon: Download,
      label: 'Téléchargements',
      value: stats?.total_downloads || 0,
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-500/10',
      iconColor: 'text-emerald-400',
    },
    {
      icon: Eye,
      label: 'Vues',
      value: stats?.total_views || 0,
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-500/10',
      iconColor: 'text-amber-400',
    },
  ];

  const activityCards = [
    {
      icon: Clock,
      label: 'Dernière heure',
      value: stats?.activity_last_hour || 0,
      description: 'actions',
    },
    {
      icon: TrendingUp,
      label: 'Dernières 24h',
      value: stats?.activity_last_24h || 0,
      description: 'actions',
    },
    {
      icon: Video,
      label: 'Vidéos uniques',
      value: stats?.unique_videos || 0,
      description: 'créées',
    },
  ];

  if (loading && !stats) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-white/10 border-t-white animate-spin" />
          <p className="text-white/70 text-sm">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl shadow-2xl border border-white/10"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-lg border-b border-white/10 p-6 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-3 rounded-2xl">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Statistiques Live</h2>
                <p className="text-white/60 text-sm">Tableau de bord en temps réel</p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="glass-panel px-4 py-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Stats principales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((card, index) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass-panel p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`${card.bgColor} p-3 rounded-xl`}>
                    <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                  </div>
                  <div className={`text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r ${card.color} bg-clip-text text-transparent`}>
                    Live
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className={`text-3xl font-bold bg-gradient-to-r ${card.color} bg-clip-text text-transparent`}>
                    {card.value.toLocaleString('fr-FR')}
                  </div>
                  <div className="text-white/50 text-sm font-medium">{card.label}</div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Activité récente */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-bold text-white">Activité récente</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {activityCards.map((card, index) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="bg-white/5 p-4 rounded-xl border border-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <card.icon className="w-4 h-4 text-white/50" />
                    <div className="text-white/50 text-xs font-medium">{card.label}</div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <div className="text-2xl font-bold text-white">
                      {card.value.toLocaleString('fr-FR')}
                    </div>
                    <div className="text-white/40 text-xs">{card.description}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-bold text-white">Chronologie</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="text-white/70 text-sm">Première activité</div>
                <div className="text-white font-medium text-sm">
                  {formatDate(stats?.first_activity || null)}
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="text-white/70 text-sm">Dernière activité</div>
                <div className="text-white font-medium text-sm">
                  {formatDate(stats?.last_activity || null)}
                </div>
              </div>
            </div>
          </div>

          {/* Indicateur temps réel */}
          <motion.div
            className="flex items-center justify-center gap-2 text-white/50 text-xs"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Mise à jour en temps réel
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
