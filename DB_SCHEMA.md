
# Schéma de base de données — NeuroBooth 360

## Tables principales

### 1. `event_settings` — Réglages de l'événement

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | `TEXT` | PRIMARY KEY, DEFAULT 'default' | Identifiant unique des réglages (toujours 'default') |
| `settings` | `JSONB` | NOT NULL, DEFAULT '{}' | Objet JSON contenant tous les paramètres |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | Date de dernière modification |

#### Exemple de `settings` JSON

```json
{
  "eventName": "Mariage de Lucas & Emma",
  "accentColor": "rose",
  "appBackground": "midnight",
  "duration": 15000,
  "countdownSeconds": 3,
  "facingMode": "user",
  "resolution": "1080p",
  "recordAudio": true,
  "kioskEnabled": true,
  "adminPin": "1234",
  "motorEnabled": true,
  "motorSpeed": 50,
  "motorDirection": "clockwise",
  "motorTurns": 1,
  "motorSyncMode": "ack",
  "motorSyncDelay": 2000,
  "emailCaptureEnabled": true,
  "emailSendEnabled": true,
  "slowMotionEnabled": false,
  "slowMotionSpeed": 0.5
}
```

#### Index & Triggers

- Trigger `event_settings_updated_at` : Met automatiquement à jour `updated_at` lors de chaque modification
- Aucun index supplémentaire nécessaire (table mono-ligne)

#### RLS (Row Level Security)

| Politique | Action | Condition |
|-----------|--------|-----------|
| `Public read — event_settings` | SELECT | Autorisé à tous |
| `Anon insert — event_settings` | INSERT | Autorisé à tous |
| `Anon update — event_settings` | UPDATE | Autorisé à tous |

---

### 2. `event_analytics` — Statistiques événementielles

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | `UUID` | PRIMARY KEY, DEFAULT gen_random_uuid() | Identifiant unique |
| `event_id` | `TEXT` | NOT NULL, DEFAULT 'default' | Identifiant de l'événement |
| `video_id` | `TEXT` | NOT NULL | Identifiant de la vidéo concernée |
| `action_type` | `TEXT` | NOT NULL, CHECK IN ('capture','share','download','view') | Type d'action |
| `metadata` | `JSONB` | DEFAULT '{}' | Métadonnées supplémentaires |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | Date de l'action |

#### Index

| Nom | Colonne(s) |
|-----|------------|
| `idx_event_analytics_event_id` | `event_id` |
| `idx_event_analytics_created_at` | `created_at DESC` |
| `idx_event_analytics_action_type` | `action_type` |

#### RLS

| Politique | Action | Condition |
|-----------|--------|-----------|
| `Public read — event_analytics` | SELECT | Autorisé à tous |
| `Anon insert — event_analytics` | INSERT | Autorisé à tous |
| `Anon delete — event_analytics` | DELETE | Autorisé à tous |

---

### 3. `email_captures` — Collecte d'emails

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | `BIGSERIAL` | PRIMARY KEY | Identifiant unique auto-incrémenté |
| `event_id` | `TEXT` | NOT NULL, DEFAULT 'default' | Identifiant de l'événement |
| `video_id` | `TEXT` | NOT NULL | Identifiant de la vidéo |
| `video_url` | `TEXT` | NOT NULL | Lien public de la vidéo |
| `email` | `TEXT` | NOT NULL | Adresse email collectée |
| `first_name` | `TEXT` | NULLABLE | Prénom (optionnel) |
| `last_name` | `TEXT` | NULLABLE | Nom (optionnel) |
| `phone` | `TEXT` | NULLABLE | Numéro de téléphone (optionnel) |
| `consent_marketing` | `BOOLEAN` | DEFAULT false | Consentement marketing |
| `email_sent` | `BOOLEAN` | DEFAULT false | Indique si l'email a été envoyé |
| `email_sent_at` | `TIMESTAMPTZ` | NULLABLE | Date d'envoi de l'email |
| `email_error` | `TEXT` | NULLABLE | Message d'erreur si échec |
| `metadata` | `JSONB` | DEFAULT '{}' | Métadonnées supplémentaires |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Date de collecte |

#### Index

| Nom | Colonne(s) |
|-----|------------|
| `idx_email_captures_event_id` | `event_id` |
| `idx_email_captures_email` | `email` |
| `idx_email_captures_created_at` | `created_at DESC` |
| `idx_email_captures_email_sent` | `email_sent` |

#### RLS

| Politique | Action | Condition |
|-----------|--------|-----------|
| `Allow public insert` | INSERT | Autorisé à tous |
| `Allow public select` | SELECT | Autorisé à tous |
| `Allow public update` | UPDATE | Autorisé à tous |
| `Allow public delete` | DELETE | Autorisé à tous |

---

## Vue agrégée

### `event_stats` — Statistiques agrégées par événement

| Colonne | Type | Description |
|---------|------|-------------|
| `event_id` | `TEXT` | Identifiant de l'événement |
| `total_captures` | `BIGINT` | Nombre total de captures |
| `total_shares` | `BIGINT` | Nombre total de partages |
| `total_downloads` | `BIGINT` | Nombre total de téléchargements |
| `total_views` | `BIGINT` | Nombre total de vues |
| `unique_videos` | `BIGINT` | Nombre de vidéos uniques |
| `first_activity` | `TIMESTAMPTZ` | Date de la première activité |
| `last_activity` | `TIMESTAMPTZ` | Date de la dernière activité |
| `activity_last_hour` | `BIGINT` | Nombre d'actions dans la dernière heure |
| `activity_last_24h` | `BIGINT` | Nombre d'actions dans les dernières 24h |

---

## Fonction stockée

### `get_event_stats(p_event_id TEXT)`

Récupère les statistiques agrégées pour un événement donné.

#### Paramètres
- `p_event_id` : `TEXT` (DEFAULT 'default') — Identifiant de l'événement

#### Retour
Tableau avec les colonnes de la vue `event_stats`

---

## Buckets Storage

| Bucket | Rôle | Taille max. par fichier | Types autorisés |
|--------|------|-------------------------|-----------------|
| `photobooth-videos` | Vidéos capturées | 500MB | `video/webm`, `video/mp4`, `video/quicktime` |
| `photobooth-logos` | Logos et arrière-plans | 5MB | `image/png`, `image/jpeg`, `image/jpg`, `image/gif`, `image/webp`, `image/svg+xml` |
| `photobooth360` | Jingles (intro/outro) | N/A | Tous types |

---

## Diagramme ER

```mermaid
erDiagram
    event_settings {
        TEXT id PK
        JSONB settings
        TIMESTAMPTZ updated_at
    }

    event_analytics {
        UUID id PK
        TEXT event_id
        TEXT video_id
        TEXT action_type
        JSONB metadata
        TIMESTAMPTZ created_at
    }

    email_captures {
        BIGSERIAL id PK
        TEXT event_id
        TEXT video_id
        TEXT video_url
        TEXT email
        TEXT first_name
        TEXT last_name
        TEXT phone
        BOOLEAN consent_marketing
        BOOLEAN email_sent
        TIMESTAMPTZ email_sent_at
        TEXT email_error
        JSONB metadata
        TIMESTAMPTZ created_at
    }

    event_stats {
        TEXT event_id
        BIGINT total_captures
        BIGINT total_shares
        BIGINT total_downloads
        BIGINT total_views
        BIGINT unique_videos
        TIMESTAMPTZ first_activity
        TIMESTAMPTZ last_activity
        BIGINT activity_last_hour
        BIGINT activity_last_24h
    }
