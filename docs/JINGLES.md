# Intro / Outro animés (Jingles)

## Vue d'ensemble

Cette fonctionnalité permet d'ajouter automatiquement des animations de marque (jingles) au début et à la fin de chaque vidéo capturée. Les jingles peuvent être des vidéos ou des images fixes.

## Fonctionnalités

### 1. Upload de médias
- **Types de fichiers acceptés**: 
  - Vidéos: MP4, WebM, MOV
  - Images: JPG, PNG, GIF, WebP
- **Stockage**: Les jingles sont uploadés vers Supabase Storage dans le dossier `jingles/`
- **Gestion**: Upload via l'interface des paramètres avec indicateur de progression

### 2. Composition vidéo
- **Rendu en temps réel**: Utilise l'API Canvas pour composer la vidéo finale
- **Ordre de composition**: Intro → Vidéo principale → Outro
- **Gestion des formats**:
  - Images: affichées pendant 2 secondes (60 frames à 30fps)
  - Vidéos: jouées en entier
- **Audio**: L'audio de la vidéo principale est préservé, les jingles sont muets
- **Aspect ratio**: Les jingles sont centrés et mis à l'échelle pour couvrir le canvas tout en préservant leurs proportions

### 3. Interface utilisateur
- **Section dédiée** dans les paramètres "Intro / Outro animés"
- **Toggle d'activation/désactivation** de la fonctionnalité
- **Prévisualisation** des jingles uploadés
- **Indicateur de progression** pendant la composition:
  - Cercle de progression animé
  - Étapes affichées: Intro → Traitement → Outro → Finalisation
  - Pourcentage de progression en temps réel

## Configuration

### Paramètres disponibles

```typescript
interface AppSettings {
  // Intro/Outro
  jingleEnabled: boolean;      // Activer/désactiver la fonctionnalité
  introUrl?: string;           // URL du jingle d'intro
  outroUrl?: string;           // URL du jingle d'outro
}
```

### Activation

1. Ouvrir les **Réglages** depuis le mode kiosque (geste secret)
2. Faire défiler jusqu'à la section **"Intro / Outro animés"**
3. Activer le toggle **"Ajouter intro/outro aux vidéos"**
4. Uploader les jingles:
   - Cliquer sur **"Intro"** pour le pré-roll
   - Cliquer sur **"Outro"** pour le post-roll
5. Les jingles sont automatiquement sauvegardés et appliqués à toutes les captures suivantes

## Architecture technique

### Fichiers créés

```
src/
├── lib/
│   ├── uploadJingle.ts       # Upload des jingles vers Supabase
│   └── videoComposer.ts      # Composition vidéo avec Canvas API
├── hooks/
│   └── useVideoComposer.ts   # Hook React pour la composition
└── components/
    └── SettingsModal.tsx     # Interface utilisateur (modifiée)
```

### Flux de traitement

```
1. Utilisateur enregistre une vidéo
   ↓
2. useRecorder capture la vidéo
   ↓
3. onRecordingComplete déclenché
   ↓
4. useVideoComposer.composeWithJingles()
   ↓
5. videoComposer.composeVideo()
   - Charge intro (si activé)
   - Rend l'intro sur le canvas
   - Charge la vidéo principale
   - Rend la vidéo principale
   - Charge l'outro (si activé)
   - Rend l'outro sur le canvas
   ↓
6. MediaRecorder capture le canvas
   ↓
7. Blob vidéo final créé
   ↓
8. URL blob retournée et affichée
```

### API Canvas

La composition utilise:
- `canvas.captureStream(30)`: Capture du canvas à 30fps
- `MediaRecorder`: Enregistrement du stream canvas
- `drawImage()`: Rendu des images et vidéos
- `requestAnimationFrame()`: Synchronisation du rendu vidéo

## Optimisations

### Performance
- **Résolution respectée**: La composition utilise la résolution définie dans les paramètres (480p, 720p, 1080p)
- **FPS constant**: 30 images par seconde pour un rendu fluide
- **Codec WebM**: Utilise VP8 avec opus pour la compatibilité maximale

### Gestion des erreurs
- Si la composition échoue, la vidéo originale est retournée sans modification
- Les erreurs sont loguées dans la console pour débogage
- Indicateurs visuels d'erreur lors de l'upload

## Limitations connues

1. **Taille des jingles**: Les jingles très longs augmentent le temps de composition
2. **Compatibilité navigateur**: Nécessite un navigateur moderne avec support de:
   - Canvas API
   - MediaRecorder API
   - HTMLVideoElement
3. **Mémoire**: La composition se fait en mémoire, des jingles très haute résolution peuvent causer des problèmes sur les appareils limités

## Exemples d'utilisation

### Cas d'usage typiques

1. **Logo animé d'entreprise**: Ajouter un intro de 2-3 secondes avec le logo et un jingle audio
2. **Call-to-action**: Outro avec informations de contact, réseaux sociaux, QR code
3. **Branding événement**: Intro avec le nom de l'événement et sponsors

### Recommandations

- **Durée intro**: 2-3 secondes maximum
- **Durée outro**: 3-5 secondes avec appel à l'action
- **Format**: MP4 H.264 pour meilleure compatibilité avant upload
- **Résolution**: Matcher la résolution de capture (720p recommandé)
- **Audio**: Pas d'audio dans les jingles pour éviter les conflits

## Dépannage

### Le jingle ne s'affiche pas
- Vérifier que `jingleEnabled` est `true` dans les paramètres
- Vérifier que l'URL du jingle est valide et accessible
- Vérifier la console pour les erreurs de chargement

### La composition est lente
- Réduire la résolution de capture
- Utiliser des jingles de résolution inférieure
- Utiliser des images fixes plutôt que des vidéos si possible

### Erreur d'upload
- Vérifier la configuration Supabase (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- Vérifier que le bucket autorise les uploads anonymes
- Vérifier la taille du fichier (limite Supabase)

## Configuration Supabase

### Politique RLS pour le bucket jingles

```sql
-- Autoriser les uploads anonymes dans le dossier jingles/
CREATE POLICY "Allow anonymous uploads to jingles"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'photobooth360' AND (storage.foldername(name))[1] = 'jingles');

-- Autoriser la lecture publique des jingles
CREATE POLICY "Public read access to jingles"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'photobooth360' AND (storage.foldername(name))[1] = 'jingles');
```

## Évolutions futures

- [ ] Prévisualisation en direct de la composition
- [ ] Transitions personnalisées entre les segments
- [ ] Support des overlays (watermarks)
- [ ] Bibliothèque de jingles prédéfinis
- [ ] Édition des jingles dans l'interface
- [ ] Support des jingles avec audio séparé
