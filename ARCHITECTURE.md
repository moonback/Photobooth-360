
# Architecture — NeuroBooth 360

## Vue d'ensemble

NeuroBooth 360 est une application web PWA (Progressive Web App) off-line-first, conçue pour le photobooth événementiel professionnel.

```mermaid
graph TD
    A[Borne / Tablette]
    B[Frontend React 19]
    C[Supabase]
    D[Storage]
    E[Database]
    F[Edge Functions]
    G[ESP32]
    H[Invité]

    A --&gt;|WebSerial/Bluetooth| G
    A --&gt; B
    B --&gt;|HTTPS| C
    C --&gt; D
    C --&gt; E
    C --&gt; F
    H --&gt;|QR Code| B
```

## Frontend

### Stack
- React 19
- TypeScript 5.8
- Tailwind CSS 4
- Motion (animations fluides)
- Lucide React (icônes)
- React Router DOM 6 (routage)
- Vite 6 (build)

### Structure du projet

```
src/
├── components/         # Composants réutilisables
├── hooks/             # Custom hooks métier
├── lib/               # Logique métier et intégrations
├── pages/             # Pages principales
├── shared/            # Utilitaires et composants transverses
└── types/             # Définitions de types TypeScript
```

### Composants principaux

- `CameraView` : Affichage du flux caméra en direct
- `PlaybackView` : Lecture vidéo post-capture
- `SplashScreen` : Écran d'accueil personnalisable
- `SettingsModal` : Interface de configuration complète
- `KioskGuard` : Protection mode kiosque et gestes secrets
- `ShareSection` : Génération QR code et partage
- `EmailCaptureModal` : Collecte d'emails et envoi automatique
- `MotorControlPanel` : Contrôle du plateau motorisé ESP32
- `GalleryStrip` : Bande de prévisualisation des captures

### Custom Hooks

Les hooks encapsulent la logique métier complexe pour une réutilisabilité maximale :

- `useCamera` : Gestion du flux MediaStream (caméra front/arrière, résolution, audio)
- `useRecorder` : Enregistrement vidéo via MediaRecorder, gestion du compte à rebours et synchronisation plateau
- `useMotor` : Contrôle du plateau motorisé via WebSerial/Bluetooth
- `useKiosk` : Gestion du mode kiosque et gestes secrets
- `useSettings` : Persistence des paramètres (localStorage + Supabase)
- `useUpload` : Upload vers Supabase Storage avec barre de progression
- `useAnalytics` : Suivi des métriques événementielles
- `useSlowMotion` : Contrôle du playback slow-motion
- `usePWA` : Installation et mise à jour de la PWA
- `useVideoComposer` : Composition des intros/outros et effets vidéo
- `useMobileOptimizations` : Optimisations tactile et haptiques

### Gestion d'état

- `useState` et `useReducer` pour l'état local
- `useSettings` pour la persistance (localStorage + Supabase)
- `videoStore` pour le stockage IndexedDB (fallback hors-ligne)
- `screenCapture` pour la communication entre pages via localStorage

### Routing

- `/` : App principale (splash, capture, partage)
- `/screen` : Écran secondaire pour affichage sur grand écran
- `/gallery` : Galerie complète des vidéos capturées
- `/share/:id` : Page de partage mobile pour récupérer sa vidéo

## Backend & Services externes

### Supabase

Supabase est utilisé comme backend complet :
- **Storage** : Stockage des vidéos, logos et jingles (intro/outro)
- **Database** : Stockage des paramètres, emails collectés et analytics
- **Edge Functions** : Envoi d'emails automatiques via Resend
- **Realtime** : Mise à jour en temps réel entre la borne et l'écran secondaire

### Buckets Storage

| Bucket | Rôle | Public |
|--------|------|--------|
| `photobooth-videos` | Vidéos capturées par les invités | Oui |
| `photobooth-logos` | Logos et arrière-plans personnalisés | Oui |
| `photobooth360` | Jingles (intro/outro) | Oui |

### Edge Functions

- `send-video-email` : Envoie un email avec le lien vidéo via Resend

### Matériel externe

#### Plateau motorisé ESP32

- Communication via **WebSerial API** ou **Web Bluetooth API**
- Firmware Arduino disponible dans `firmware/esp32_photobooth360/`
- Commandes supportées : START, STOP, SET_SPEED, SET_DIRECTION, SET_TURNS
- Synchronisation plateau/capture configurable (ACK, délai fixe, immédiat)

## Base de données

Voir `DB_SCHEMA.md` pour le schéma détaillé.

## Décisions d'architecture clés

### 1. Offline-first avec PWA

La PWA permet de fonctionner sans connexion Internet :
- Stockage IndexedDB pour les vidéos
- Service Worker pour le cache offline
- Sync différée lors du retour réseau

### 2. Hooks isolés et découplés

Chaque hook a une responsabilité unique et ne dépend pas des autres hooks, ce qui permet :
- Une grande modularité
- Une facilité de test
- Une maintenance simplifiée

### 3. Séparation UI / Logique métier

La logique métier est isolée dans les hooks et le dossier `lib/`, tandis que les composants ne s'occupent que de l'affichage et des interactions utilisateur.

### 4. Configuration externalisée

Tous les paramètres sont stockés dans `settingsStore` et peuvent être modifiés via l'interface admin (sans toucher au code).

### 5. Multiples modes de partage

- **Cloud** : Supabase Storage (multi-dispositifs)
- **Local** : IndexedDB (même dispositif)
- **QR Code** : Lien direct vers la page de partage
- **Email** : Envoi automatique via Resend

## Flux de capture complet

1. L'invité touche l'écran splash
2. Compte à rebours configurable (0, 3, 5, 10 secondes)
3. Si motorisé :
   - Envoi de la commande START au plateau
   - Attente de READY/RUNNING (si mode ACK)
   - Synchronisation plateau/capture
4. Déclenchement de l'enregistrement via MediaRecorder
5. Flash visuel + retour haptique + son de déclenchement
6. Arrêt de l'enregistrement après la durée configurée
7. Arrêt du plateau motorisé
8. Upload vers Supabase Storage (si configuré)
9. Génération du QR code de partage
10. Proposition de collecte email (si activée)
11. Retour à l'accueil après 15s d'inactivité

## Sécurité

- RLS (Row Level Security) sur toutes les tables et buckets Supabase
- PIN admin pour accéder aux paramètres et quitter le mode kiosque
- Aucune donnée sensible stockée côté client (sauf les paramètres locaux)
