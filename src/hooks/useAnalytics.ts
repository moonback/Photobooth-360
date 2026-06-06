import { useEffect, useState } from 'react';
import { EventStats, getEventStats, subscribeToAnalytics } from '../lib/analytics';

interface UseAnalyticsOptions {
  eventId?: string;
  refreshInterval?: number; // en millisecondes
  realtime?: boolean;
}

export function useAnalytics(options: UseAnalyticsOptions = {}) {
  const {
    eventId = 'default',
    refreshInterval = 5000,
    realtime = true,
  } = options;

  const [stats, setStats] = useState<EventStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Récupérer les stats initiales
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await getEventStats(eventId);
        setStats(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [eventId]);

  // Polling pour rafraîchir les stats
  useEffect(() => {
    if (!refreshInterval) return;

    const interval = setInterval(async () => {
      const data = await getEventStats(eventId);
      if (data) setStats(data);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [eventId, refreshInterval]);

  // Écoute en temps réel
  useEffect(() => {
    if (!realtime) return;

    const unsubscribe = subscribeToAnalytics(eventId, async () => {
      // Quand un nouvel événement arrive, rafraîchir les stats
      const data = await getEventStats(eventId);
      if (data) setStats(data);
    });

    return unsubscribe;
  }, [eventId, realtime]);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await getEventStats(eventId);
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  return {
    stats,
    loading,
    error,
    refresh,
  };
}
