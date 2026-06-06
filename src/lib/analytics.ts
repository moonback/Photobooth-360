import { supabase } from './supabase';

export type AnalyticsActionType = 'capture' | 'share' | 'download' | 'view';

export interface AnalyticsEvent {
  event_id?: string;
  video_id: string;
  action_type: AnalyticsActionType;
  metadata?: Record<string, any>;
}

export interface EventStats {
  total_captures: number;
  total_shares: number;
  total_downloads: number;
  total_views: number;
  unique_videos: number;
  first_activity: string | null;
  last_activity: string | null;
  activity_last_hour: number;
  activity_last_24h: number;
}

/**
 * Enregistre un événement d'analytics
 */
export async function trackEvent(event: AnalyticsEvent): Promise<void> {
  try {
    const { error } = await supabase.from('event_analytics').insert({
      event_id: event.event_id || 'default',
      video_id: event.video_id,
      action_type: event.action_type,
      metadata: event.metadata || {},
    });

    if (error) {
      console.error('Erreur lors du tracking:', error);
    }
  } catch (err) {
    console.error('Erreur lors du tracking:', err);
  }
}

/**
 * Récupère les statistiques de l'événement
 */
export async function getEventStats(eventId: string = 'default'): Promise<EventStats | null> {
  try {
    const { data, error } = await supabase.rpc('get_event_stats', {
      p_event_id: eventId,
    });

    if (error) {
      console.error('Erreur lors de la récupération des stats:', error);
      return null;
    }

    return data?.[0] || null;
  } catch (err) {
    console.error('Erreur lors de la récupération des stats:', err);
    return null;
  }
}

/**
 * Récupère les événements récents
 */
export async function getRecentEvents(
  eventId: string = 'default',
  limit: number = 50
): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('event_analytics')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Erreur lors de la récupération des événements:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Erreur lors de la récupération des événements:', err);
    return [];
  }
}

/**
 * Écoute les changements en temps réel des statistiques
 */
export function subscribeToAnalytics(
  eventId: string = 'default',
  callback: (payload: any) => void
) {
  const channel = supabase
    .channel(`analytics:${eventId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'event_analytics',
        filter: `event_id=eq.${eventId}`,
      },
      callback
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Helper pour tracker une capture
 */
export function trackCapture(videoId: string, metadata?: Record<string, any>) {
  return trackEvent({
    video_id: videoId,
    action_type: 'capture',
    metadata,
  });
}

/**
 * Helper pour tracker un partage
 */
export function trackShare(videoId: string, shareMethod?: string) {
  return trackEvent({
    video_id: videoId,
    action_type: 'share',
    metadata: { share_method: shareMethod },
  });
}

/**
 * Helper pour tracker un téléchargement
 */
export function trackDownload(videoId: string) {
  return trackEvent({
    video_id: videoId,
    action_type: 'download',
  });
}

/**
 * Helper pour tracker une vue
 */
export function trackView(videoId: string) {
  return trackEvent({
    video_id: videoId,
    action_type: 'view',
  });
}
