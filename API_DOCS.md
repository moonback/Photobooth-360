
# Documentation API — NeuroBooth 360

NeuroBooth 360 utilise **Supabase** comme backend complet. Cette documentation décrit les endpoints Supabase utilisés par l'application.

## Base URL

Toutes les requêtes sont envoyées à l'URL de votre projet Supabase :
```
https://<votre-projet>.supabase.co
```

## Authentification

La plupart des endpoints utilisent la **clé anonyme Supabase** (`SUPABASE_ANON_KEY`), passée dans le header `apikey` et `Authorization`.

```http
apikey: <votre-anon-key>
Authorization: Bearer <votre-anon-key>
```

## Endpoints

### Storage

#### 1. Uploader une vidéo

- **Méthode** : `POST`
- **URL** : `/storage/v1/object/photobooth-videos/<nom-fichier>`
- **Description** : Upload une vidéo vers le bucket `photobooth-videos`
- **Headers** :
  - `Content-Type`: Type MIME de la vidéo (`video/webm`, `video/mp4`, etc.)
- **Body** : Blob vidéo

**Exemple cURL** :
```bash
curl -X POST 'https://<votre-projet>.supabase.co/storage/v1/object/photobooth-videos/video_123456789.webm' \
-H 'apikey: <votre-anon-key>' \
-H 'Authorization: Bearer <votre-anon-key>' \
-H 'Content-Type: video/webm' \
--data-binary '@./video.webm'
```

**Réponse succès (200 OK)** :
```json
{
  "Key": "photobooth-videos/video_123456789.webm"
}
```

---

#### 2. Récupérer une vidéo publique

- **Méthode** : `GET`
- **URL** : `/storage/v1/object/public/photobooth-videos/<nom-fichier>`
- **Description** : Récupère une vidéo publique depuis le bucket
- **Pas d'authentification requise**

**Exemple** :
```
https://<votre-projet>.supabase.co/storage/v1/object/public/photobooth-videos/video_123456789.webm
```

---

#### 3. Lister les vidéos du bucket

- **Méthode** : `GET`
- **URL** : `/storage/v1/object/list/photobooth-videos`
- **Description** : Liste toutes les vidéos dans le bucket `photobooth-videos`
- **Body** (optionnel) :
  ```json
  {
    "limit": 100,
    "offset": 0,
    "sortBy": {
      "column": "created_at",
      "order": "desc"
    }
  }
  ```

**Exemple cURL** :
```bash
curl -X GET 'https://<votre-projet>.supabase.co/storage/v1/object/list/photobooth-videos' \
-H 'apikey: <votre-anon-key>' \
-H 'Authorization: Bearer <votre-anon-key>' \
-H 'Content-Type: application/json' \
--data-raw '{
  "limit": 100,
  "sortBy": {
    "column": "created_at",
    "order": "desc"
  }
}'
```

---

### Database - REST API

#### 1. Récupérer les paramètres de l'événement

- **Méthode** : `GET`
- **URL** : `/rest/v1/event_settings?id=eq.default&select=*`
- **Description** : Récupère les réglages de l'événement

**Réponse succès (200 OK)** :
```json
[
  {
    "id": "default",
    "settings": { "eventName": "Mon événement", ... },
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
]
```

---

#### 2. Mettre à jour les paramètres de l'événement

- **Méthode** : `PATCH`
- **URL** : `/rest/v1/event_settings?id=eq.default`
- **Description** : Met à jour les réglages de l'événement
- **Headers** :
  - `Content-Type`: `application/json`
  - `Prefer`: `return=representation`
- **Body** :
  ```json
  {
    "settings": {
      "eventName": "Nouveau nom d'événement",
      "accentColor": "rose"
    }
  }
  ```

---

#### 3. Ajouter une entrée analytics

- **Méthode** : `POST`
- **URL** : `/rest/v1/event_analytics`
- **Description** : Enregistre une action (capture, partage, téléchargement, vue)
- **Headers** :
  - `Content-Type`: `application/json`
  - `Prefer`: `return=representation`
- **Body** :
  ```json
  {
    "event_id": "default",
    "video_id": "video_123456789",
    "action_type": "capture",
    "metadata": { "duration": 15000, "resolution": "1080p" }
  }
  ```

---

#### 4. Ajouter une capture email

- **Méthode** : `POST`
- **URL** : `/rest/v1/email_captures`
- **Description** : Enregistre une adresse email collectée
- **Headers** :
  - `Content-Type`: `application/json`
  - `Prefer`: `return=representation`
- **Body** :
  ```json
  {
    "event_id": "default",
    "video_id": "video_123456789",
    "video_url": "https://.../video.webm",
    "email": "invite@example.com",
    "first_name": "Jean",
    "last_name": "Dupont",
    "consent_marketing": true
  }
  ```

---

### Edge Functions

#### 1. Envoyer un email avec la vidéo

- **Méthode** : `POST`
- **URL** : `/functions/v1/send-video-email`
- **Description** : Envoie un email avec le lien vidéo via Resend
- **Headers** :
  - `Content-Type`: `application/json`
  - `Authorization`: Bearer <votre-anon-key> (optionnel, selon votre configuration)
- **Body** :
  ```json
  {
    "to": "invite@example.com",
    "video_url": "https://.../video.webm",
    "event_name": "Mon événement"
  }
  ```

---

## Erreurs courantes

| Code | Description |
|------|-------------|
| 400 | Bad Request (paramètres invalides) |
| 401 | Unauthorized (clé API invalide ou manquante) |
| 403 | Forbidden (RLS policy bloque la requête) |
| 404 | Not Found (ressource introuvable) |
| 413 | Payload Too Large (fichier trop volumineux) |
| 429 | Too Many Requests (limite de dépassée) |
| 500 | Internal Server Error |
