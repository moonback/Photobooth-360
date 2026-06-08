# NeuroBooth 360 🎥

<p align="center">
  <img src="public/header-bg.png" alt="NeuroBooth 360" width="100%" />
</p>

Application web professionnelle de type photomaton 360° — capture, partage et diffusion de vidéos depuis le navigateur. Conçue pour les événements, mariages, galas et soirées d'entreprise sur borne interactive ou tablette.

---

## 📊 Badges

![Version](https://img.shields.io/badge/version-2.5.0-blue)
![React](https://img.shields.io/badge/React-19-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4)
![Supabase](https://img.shields.io/badge/Supabase-ready-3ECF8E)
![Vercel](https://img.shields.io/badge/Vercel-ready-black)
![PWA](https://img.shields.io/badge/PWA-ready-purple)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 🎯 Pour qui ?

NeuroBooth 360 est parfait pour :
- 🎪 **Organisateurs d'événements** : Mariages, anniversaires, galas, salons
- 📸 **Photographes professionnels** : Ajouter une expérience vidéo à vos services
- 🏢 **Entreprises** : Soirées d'entreprise, team buildings, lancements de produits
- 🎓 **Établissements** : Bals de promo, événements étudiants

---

## ✨ Fonctionnalités

### 📹 Capture Vidéo
- Enregistrement natif via `MediaRecorder` (sans plugin)
- Compte à rebours configurable (0s, 3s, 5s, 10s)
- Durées flexibles : 10s, 15s, 30s, 1min, 2min
- Modes caméra : Frontale / Arrière
- Qualités : 480p, 720p HD, 1080p Full HD
- Audio activable/désactivable
- Mode plein écran immersif

### 🎡 Plateau Motorisé (ESP32)
- Contrôle du moteur via WebSerial / Bluetooth
- Réglage vitesse, direction et nombre de tours
- Synchronisation plateau / déclenchement d'enregistrement
- Modes de sync : ACK firmware, délai fixe, ou immédiat
- Panneau de contrôle moteur intégré dans l'interface
- [Documentation matériel](./firmware/WIRING.md)

### 🔒 Mode Kiosque
- Verrouillage plein écran avec Wake Lock (écran toujours allumé)
- **Geste secret haut-centre :**
  - 5 taps → accès réglages admin (PIN requis)
  - 10 taps → quitter le kiosque (PIN requis)
- Feedback visuel : 5 puces indigo (réglages) + 5 puces rouges (exit)
- Badge kiosque et statut veille en superposition
- Bannière de reprise si plein écran interrompu
- PIN admin pour protéger les deux actions

### 📤 Partage & Stockage
- Upload automatique vers Supabase Storage avec barre de progression
- QR Code instantané après chaque prise
- Page de récupération mobile (téléchargement iOS/Android)
- Stockage local IndexedDB comme fallback hors-ligne
- Capture email opt-in avec envoi automatique de la vidéo via Resend

### 🎨 Interface & UX
- Design sombre avec Tailwind CSS 4
- 5 thèmes de couleur : Indigo, Rose, Ambre, Émeraude, Cyan
- Animations fluides avec Motion
- Retour haptique sur mobile
- Splash screen avec logo et nom de l'événement
- Header compact : nom événement, badge LIVE/REC, bouton plein écran
- Timer d'inactivité : retour splash après 5 minutes

### 📊 Analytics
- Suivi des captures, partages, téléchargements
- Dashboard analytique live pour l'organisateur
- Badge live stats en superposition

### 📱 PWA
- Installable sur iOS et Android (mode standalone)
- Service Worker avec cache offline
- Prompt d'installation et mise à jour automatique
- [Guide PWA](./PWA-GUIDE.md)

### 🖼️ Galerie
- Affichage adaptatif : 1 col mobile → 5 cols desktop
- Autoplay au scroll (Intersection Observer)
- Modal plein écran avec contrôles vidéo
- Tri chronologique, pagination jusqu'à 1000 vidéos

### 🎬 Effets Vidéo
- **Slow-motion** : Playback à 0.5× ou 0.25×
- **Intro/Outro animés** : Jingles de marque en pré/post-roll
  - Upload de vidéos ou images personnalisées
  - Composition automatique avec Canvas API
  - Préservation de l'audio de la vidéo principale

---

## 🛠 Stack Technique

| Couche | Technologie |
|--------|-------------|
| UI | React 19 + TypeScript 5.8 |
| Build | Vite 6 + SWC |
| Style | Tailwind CSS 4 |
| Animations | Motion 12 |
| Backend | Supabase (DB + Storage + Auth + Edge Functions) |
| Stockage local | IndexedDB |
| Navigation | React Router DOM 6 |
| QR Code | qrcode.react |
| Icônes | Lucide React |
| PWA | vite-plugin-pwa + Workbox |
| Matériel | WebSerial / Web Bluetooth API (ESP32) |

---

## 📦 Installation

### Prérequis
- Node.js 18+
- npm ou yarn
- Compte Supabase (optionnel, pour le cloud sharing)
- Compte Resend (optionnel, pour l'envoi d'emails)

### Étapes

1. Clonez le dépôt :
```bash
git clone https://github.com/votre-username/photobooth-360.git
cd photobooth-360
```

2. Installez les dépendances :
```bash
npm install
```

3. Copiez le fichier d'environnement d'exemple :
```bash
cp .env.example .env
```

4. Configurez vos variables d'environnement (voir ci-dessous)

5. Lancez le serveur de développement :
```bash
npm run dev
```

### Variables d'environnement

| Variable | Description | Exemple | Obligatoire |
|----------|-------------|---------|-------------|
| `VITE_SUPABASE_URL` | URL de votre projet Supabase | `https://votre-projet.supabase.co` | Non |
| `VITE_SUPABASE_ANON_KEY` | Clé anonyme Supabase | `votre-clé-anonyme` | Non |
| `GEMINI_API_KEY` | Clé API Gemini (pour IA) | `votre-clé-gemini` | Non |
| `APP_URL` | URL de votre application | `http://localhost:3000` | Non |

> Sans Supabase, l'app fonctionne en mode local avec IndexedDB (partage sur même appareil uniquement).

### Commandes utiles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Lance le serveur de développement sur le port 3000 |
| `npm run build` | Génère le build de production |
| `npm run preview` | Prévisualise le build de production |
| `npm run lint` | Vérifie le code TypeScript |

---

## 🏗 Structure du Projet

```
photobooth-360/
├── docs/                   # Documentation supplémentaire
│   ├── ANALYTICS.md
│   ├── AUDIT-PRODUCTION-2026.md
│   ├── FEATURE-SUGGESTIONS-2026.md
│   ├── JINGLES.md
│   ├── JINGLES-QUICKSTART.md
│   └── PWA-ARCHITECTURE.md
├── firmware/               # Firmware pour ESP32
│   ├── esp32_photobooth360/
│   └── WIRING.md           # Schéma de câblage
├── public/                 # Fichiers statiques
│   ├── song/
│   ├── sounds/
│   ├── header-bg.png
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── manifest.json
│   └── offline.html
├── scripts/                # Scripts utilitaires
│   └── generate-icons.js
├── src/
│   ├── components/         # Composants React
│   ├── hooks/              # Hooks personnalisés
│   ├── lib/                # Logique métier & utilitaires
│   ├── pages/              # Pages de l'application
│   ├── shared/             # Composants & utilitaires partagés
│   ├── types/              # Définitions TypeScript
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── supabase/               # Configuration Supabase
│   ├── functions/          # Edge Functions
│   ├── setup.sql           # Configuration initiale de la DB
│   ├── setup-jingles-storage.sql
│   └── fix-email-captures-rls.sql
├── .cursorrules            # Règles pour Cursor (IA)
├── .env.example            # Exemple de variables d'environnement
├── .gitignore
├── API_DOCS.md             # Documentation API
├── ARCHITECTURE.md         # Architecture système
├── CONTRIBUTING.md         # Guide de contribution
├── DB_SCHEMA.md            # Schéma de base de données
├── LICENSE
├── PWA-GUIDE.md
├── PWA-CHECKLIST.md
├── README.md
├── ROADMAP.md
├── package-lock.json
├── package.json
├── tsconfig.json
├── vercel.json
└── vite.config.ts
```

---

## 📚 Documentation supplémentaire

- [Architecture système](./ARCHITECTURE.md) : Vue d'ensemble de l'architecture technique
- [Schéma de base de données](./DB_SCHEMA.md) : Modèle de données et tables
- [Documentation API](./API_DOCS.md) : Endpoints Supabase utilisés
- [Roadmap](./ROADMAP.md) : Plan de développement futur
- [Guide de contribution](./CONTRIBUTING.md) : Comment contribuer au projet
- [Guide PWA](./PWA-GUIDE.md) : Installation et configuration de la PWA
- [Documentation matériel](./firmware/WIRING.md) : Schéma de câblage pour ESP32

---

## 🚀 Configuration Supabase

Si vous voulez utiliser les fonctionnalités cloud (partage multi-appareils, emails, analytics), suivez ces étapes :

1. Créez un projet sur [Supabase](https://supabase.com)
2. Exécutez les scripts SQL suivants dans l'éditeur SQL de Supabase, dans l'ordre :
   1. [`supabase/setup.sql`](./supabase/setup.sql) : Configure les buckets, tables et RLS policies
   2. [`supabase/setup-jingles-storage.sql`](./supabase/setup-jingles-storage.sql) : Configure le stockage des jingles
   3. [`supabase/fix-email-captures-rls.sql`](./supabase/fix-email-captures-rls.sql) : Corrige les policies pour les captures d'email
3. Configurez vos variables d'environnement (`VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`)
4. (Optionnel) Déployez l'Edge Function `send-video-email` pour l'envoi d'emails automatiques

---

## 🚀 Déploiement

### Vercel (recommandé)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvotre-username%2Fphotobooth-360)

Ou manuellement :
```bash
npm i -g vercel
vercel --prod
```

### Netlify

```bash
npm run build
# Déployez le dossier dist/ sur Netlify
```

N'oubliez pas de configurer vos variables d'environnement sur la plateforme de déploiement !

---

## 📱 Guide d'utilisation

### Organisateur

1. Accédez aux réglages via le geste secret (5 taps en haut-centre) + PIN
2. Configurez : nom événement, logo, durée, compte à rebours, résolution, thème
3. Activez le mode kiosque pour verrouiller l'écran
4. Suivez les stats en direct depuis le dashboard analytique

### Invité

1. Tapez l'écran splash pour démarrer
2. Appuyez sur le bouton rouge pour lancer l'enregistrement
3. Regardez le compte à rebours et souriez !
4. Scannez le QR code pour récupérer votre vidéo

### Mode kiosque

- **5 taps** en haut-centre → entrez le PIN → accédez aux réglages
- **10 taps** en haut-centre → entrez le PIN → quittez le mode kiosque

---

## 🎯 Roadmap

Voir [ROADMAP.md](./ROADMAP.md) pour le détail complet des phases et fonctionnalités à venir, y compris nos futures fonctionnalités IA !

**Points clés à venir :**
- 🤖 IA & Fonctionnalités Intelligentes (Phase 11)
- Remplacement de fond IA
- Amélioration de visage IA
- Sous-titres automatiques IA
- Highlights vidéo IA
- Et bien plus !

---

## 📄 Licence

MIT — voir le fichier [LICENSE](./LICENSE) pour plus de détails.

---

## 💡 Support et communauté

- 📝 **Issues** : Signalez des bugs ou proposez des améliorations sur [GitHub Issues](https://github.com/votre-username/photobooth-360/issues)
- 📧 **Email** : contactez-nous à support@neurobooth360.com
- 🔧 **Contribuer** : Consultez le [guide de contribution](./CONTRIBUTING.md)

---

Développé avec ❤️ pour créer des souvenirs inoubliables
