# 📊 Système d'Analytics - NeuroBooth 360

## Vue d'ensemble

Le système d'analytics de NeuroBooth 360 permet de suivre en temps réel l'activité de votre événement avec des statistiques détaillées sur les captures, partages, téléchargements et vues.

## ✨ Fonctionnalités

### 1. Tracking Automatique
- **Captures** : Chaque vidéo enregistrée est automatiquement comptabilisée
- **Partages** : Génération de QR codes trackée (cloud et local)
- **Téléchargements** : Clics sur le bouton "Sauver" enregistrés
- **Vues** : Pages de partage visitées comptées

### 2. Dashboard en Temps Réel
- Statistiques agrégées live
- Mise à jour automatique toutes les 5 secondes
- Souscription en temps réel via Supabase Realtime
- Interface moderne avec animations

### 3. Badge Live
- Affichage discret sur l'écran principal
- Nombre de captures totales
- Activité de la dernière heure
- Indicateur de mise à jour en temps réel

## 🏗️ Architecture

### Base de Données

#### Table `event_analytics`
```sql
CREATE TABLE event_analytics (
  id              UUID PRIMARY KEY,
  event_id        TEXT NOT NULL,
  video_id        TEXT NOT NULL,
  action_type     TEXT CHECK (action_type IN ('capture', 'share', 'download', 'view')),
  metadata        JSONB,
  created_at      TIMESTAMPTZ
);
```

#### Vue `event_stats`
Vue agrégée qui calcule automatiquement :
- Total des captures, partages, téléchargements, vues
- Nombre de vidéos uniques
- Première et dernière activité
- Activité de la dernière heure et des dernières 24h

### API

#### Fonction `get_event_stats(event_id)`
Récupère les statistiques agrégées pour un événement donné.

```typescript
const stats = await getEventStats('default');
// Returns: {
//   total_captures: 42,
//   total_shares: 38,
//   total_downloads: 25,
//   total_views: 156,
//   unique_videos: 42,
//   first_activity: "2026-06-06T10:00:00Z",
//   last_activity: "2026-06-06T18:30:00Z",
//   activity_last_hour: 8,
//   activity_last_24h: 42
// }
```

## 🔧 Utilisation

### Tracking Manuel

```typescript
import { trackCapture, trackShare, trackDownload, trackView } from '@/lib/analytics';

// Tracker une capture
await trackCapture('video_123', {
  duration: 15000,
  resolution: '1080p',
  facingMode: 'user'
});

// Tracker un partage
await trackShare('video_123', 'qr_cloud');

// Tracker un téléchargement
await trackDownload('video_123');

// Tracker une vue
await trackView('video_123');
```

### Hook `useAnalytics`

```typescript
import { useAnalytics } from '@/hooks/useAnalytics';

function MyComponent() {
  const { stats, loading, error, refresh } = useAnalytics({
    eventId: 'default',
    refreshInterval: 5000, // ms
    realtime: true
  });

  if (loading) return <div>Chargement...</div>;
  if (error) return <div>Erreur : {error}</div>;

  return (
    <div>
      <p>Captures : {stats?.total_captures}</p>
      <p>Partages : {stats?.total_shares}</p>
    </div>
  );
}
```

### Dashboard Complet

```typescript
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';

function AdminPanel() {
  const [showDashboard, setShowDashboard] = useState(false);

  return (
    <>
      <button onClick={() => setShowDashboard(true)}>
        Voir les statistiques
      </button>
      
      {showDashboard && (
        <AnalyticsDashboard onClose={() => setShowDashboard(false)} />
      )}
    </>
  );
}
```

### Badge Live

```typescript
import { LiveStatsBadge } from '@/components/LiveStatsBadge';

function App() {
  return (
    <>
      <LiveStatsBadge show={true} />
      {/* Reste de l'app */}
    </>
  );
}
```

## 📊 Métriques Disponibles

| Métrique | Description | Type |
|----------|-------------|------|
| `total_captures` | Nombre total de vidéos capturées | Nombre |
| `total_shares` | Nombre total de partages (QR générés) | Nombre |
| `total_downloads` | Nombre total de téléchargements | Nombre |
| `total_views` | Nombre total de vues sur les pages de partage | Nombre |
| `unique_videos` | Nombre de vidéos uniques créées | Nombre |
| `first_activity` | Date/heure de la première activité | Date |
| `last_activity` | Date/heure de la dernière activité | Date |
| `activity_last_hour` | Actions dans la dernière heure | Nombre |
| `activity_last_24h` | Actions dans les dernières 24h | Nombre |

## 🔄 Temps Réel

Le système utilise **Supabase Realtime** pour les mises à jour en temps réel :

```typescript
// Le hook s'abonne automatiquement aux changements
const { stats } = useAnalytics({ realtime: true });

// Ou manuellement :
import { subscribeToAnalytics } from '@/lib/analytics';

const unsubscribe = subscribeToAnalytics('default', (payload) => {
  console.log('Nouvelle activité:', payload);
  // Rafraîchir les stats...
});

// N'oubliez pas de vous désabonner
return () => unsubscribe();
```

## 🎨 Dashboard UI

Le dashboard affiche :

### 1. Stats Principales (Cards)
- **Captures** - Bleu/Cyan
- **Partages** - Violet/Rose
- **Téléchargements** - Émeraude/Teal
- **Vues** - Ambre/Orange

### 2. Activité Récente
- Dernière heure
- Dernières 24h
- Vidéos uniques

### 3. Chronologie
- Première activité
- Dernière activité

### 4. Indicateurs
- Badge "Live" animé
- Indicateur de mise à jour en temps réel
- Animations de chargement

## 🔐 Sécurité & Permissions

### Row Level Security (RLS)

Les politiques Supabase permettent :
- **Lecture publique** : Tout le monde peut lire les stats
- **Insertion anonyme** : Les utilisateurs peuvent tracker leurs actions
- **Pas de modification/suppression** : Protection des données historiques

```sql
-- Lecture publique
CREATE POLICY "Public read — event_analytics"
  ON event_analytics FOR SELECT
  USING (true);

-- Insertion anonyme
CREATE POLICY "Anon insert — event_analytics"
  ON event_analytics FOR INSERT
  TO anon
  WITH CHECK (true);
```

### Données Sensibles

- Les IDs de vidéos sont générés côté client (non prédictibles)
- Pas de données personnelles stockées dans les analytics
- Les métadonnées sont optionnelles et contrôlées par l'app

## 📈 Performance

### Indexation
```sql
-- Index pour les requêtes fréquentes
CREATE INDEX idx_event_analytics_event_id ON event_analytics(event_id);
CREATE INDEX idx_event_analytics_created_at ON event_analytics(created_at DESC);
CREATE INDEX idx_event_analytics_action_type ON event_analytics(action_type);
```

### Cache
- Vue `event_stats` calculée à la demande
- Fonction `get_event_stats` avec `SECURITY DEFINER`
- Polling côté client configurable (défaut: 5s)

### Optimisations
- Agrégation côté base de données (vue matérialisée possible)
- Limit sur les requêtes d'événements récents
- Souscription en temps réel filtrée par event_id

## 🧪 Tests

### Tester le Tracking

```typescript
// Simuler des captures
for (let i = 0; i < 10; i++) {
  await trackCapture(`test_video_${i}`);
}

// Vérifier les stats
const stats = await getEventStats('default');
console.log('Captures:', stats?.total_captures); // 10
```

### Tester le Dashboard

1. Ouvrir l'application
2. Aller dans Réglages (avec PIN admin)
3. Cliquer sur "Voir les statistiques"
4. Vérifier que les données s'affichent
5. Faire une capture dans un autre onglet
6. Vérifier la mise à jour automatique du dashboard

### Tester le Temps Réel

1. Ouvrir le dashboard dans un onglet
2. Ouvrir l'application dans un autre onglet
3. Faire plusieurs captures/partages
4. Observer la mise à jour automatique du dashboard

## 🐛 Debugging

### Logs Console

```typescript
// Activer les logs détaillés
const { stats, loading, error } = useAnalytics({
  eventId: 'default',
  refreshInterval: 5000,
  realtime: true
});

console.log('Stats:', stats);
console.log('Loading:', loading);
console.log('Error:', error);
```

### Requêtes SQL

```sql
-- Voir tous les événements
SELECT * FROM event_analytics ORDER BY created_at DESC LIMIT 20;

-- Voir les stats
SELECT * FROM event_stats;

-- Compter par type d'action
SELECT action_type, COUNT(*) 
FROM event_analytics 
WHERE event_id = 'default'
GROUP BY action_type;
```

### Supabase Dashboard

1. Aller sur supabase.com
2. Sélectionner votre projet
3. Table Editor > event_analytics
4. Realtime > Vérifier les souscriptions actives

## 📦 Configuration Initiale

### 1. Exécuter le SQL Setup

```bash
# Copier le contenu de supabase/setup.sql
# Coller dans Supabase Dashboard > SQL Editor
# Exécuter
```

### 2. Vérifier les Permissions

```sql
-- Tester la fonction
SELECT * FROM get_event_stats('default');

-- Vérifier les policies
SELECT * FROM pg_policies WHERE tablename = 'event_analytics';
```

### 3. Tester l'Insertion

```sql
-- Insérer un événement test
INSERT INTO event_analytics (event_id, video_id, action_type)
VALUES ('default', 'test_123', 'capture');

-- Vérifier
SELECT * FROM event_stats;
```

## 🚀 Déploiement

### Variables d'Environnement

Assurez-vous que Supabase est configuré :

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
```

### Migration

Si vous avez déjà une base de données en production :

```sql
-- Backup d'abord !
-- Puis exécuter le nouveau setup.sql
-- Les politiques existantes seront préservées avec ON CONFLICT
```

## 📚 Ressources

- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [PostgreSQL Views](https://www.postgresql.org/docs/current/sql-createview.html)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

## 🆘 FAQ

**Q: Les stats ne se mettent pas à jour en temps réel ?**
R: Vérifiez que Supabase Realtime est activé et que vous avez bien souscrit au channel.

**Q: Les événements ne sont pas enregistrés ?**
R: Vérifiez les politiques RLS et que l'utilisateur est en mode `anon`.

**Q: Comment réinitialiser les stats ?**
R: 
```sql
DELETE FROM event_analytics WHERE event_id = 'default';
```

**Q: Peut-on avoir plusieurs événements en parallèle ?**
R: Oui, utilisez des `event_id` différents :
```typescript
trackCapture('video_123', { event_id: 'event_2026' });
```

**Q: Y a-t-il une limite de stockage ?**
R: Supabase gratuit : 500 MB. Pensez à purger les vieux événements régulièrement.

---

**Version** : 1.0.0  
**Dernière mise à jour** : Juin 2026
