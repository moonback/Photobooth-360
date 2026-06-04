# Neurobooth 360 🎥

Une application web moderne de type "Photomaton 360" professionnelle, permettant de capturer et partager des vidéos directement depuis le navigateur. Conçue pour être utilisée lors d'événements, soirées et mariages sur une borne interactive ou une tablette.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![React](https://img.shields.io/badge/React-19-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Fonctionnalités Principales

### 📹 Capture Vidéo Avancée
- **Enregistrement natif** via l'API `MediaRecorder` (sans plugins)
- **Compte à rebours visuel** personnalisable (0s, 3s, 5s, 10s)
- **Durées flexibles** : 10s, 15s, 30s, 1min, 2min
- **Modes caméra** : Frontale / Arrière
- **Qualités vidéo** : 480p, 720p HD, 1080p Full HD
- **Enregistrement audio** : Activable/désactivable
- **Mode plein écran** : Pour une expérience immersive

### 🎨 Interface Utilisateur
- **Design moderne** avec Tailwind CSS 4 et thème sombre
- **Responsive & Mobile-First** : Optimisé pour tablettes, smartphones et desktop
- **5 thèmes de couleur** : Indigo, Rose, Ambre, Émeraude, Cyan
- **Animations fluides** avec Motion
- **Splash screen** personnalisable avec logo
- **Watermark** sur les vidéos avec nom de l'événement

### 🔒 Sécurité & Administration
- **Code PIN administrateur** pour protéger les réglages
- **Modal de modification sécurisé** (requiert l'ancien code)
- **Accès restreint** aux paramètres sensibles
- **Timer d'inactivité** : Retour au splash après 5 minutes

### 📤 Partage & Stockage
- **Cloud Storage** : Upload automatique vers Supabase
- **QR Codes** : Génération instantanée pour partage mobile
- **Téléchargement direct** : Format WebM universel
- **Stockage local** : IndexedDB comme fallback
- **URLs publiques** : Partage cross-device

### 🖼️ Galerie Interactive
- **Affichage adaptatif** : 1 col mobile → 5 cols desktop
- **Lecture au scroll** : Autoplay intelligent (Intersection Observer)
- **Modal plein écran** : Visionnage détaillé avec contrôles
- **Tri chronologique** : Vidéos les plus récentes en premier
- **Pagination** : Jusqu'à 1000 vidéos

### ⚙️ Réglages Avancés
- **Personnalisation complète** de l'événement
- **Upload de logo** pour l'écran d'accueil
- **Synchronisation cloud** des paramètres (Supabase)
- **Fallback localStorage** si cloud indisponible
- **Présets multiples** pour chaque paramètre

## 🛠 Stack Technique

### Frontend
- **React 19** - Framework moderne avec Server Components
- **TypeScript 5.8** - Typage fort et IntelliSense
- **Vite 6** - Build ultra-rapide et HMR instantané
- **Tailwind CSS 4** - Utility-first CSS avec design system
- **Lucide React** - Bibliothèque d'icônes SVG légères

### Backend & Services
- **Supabase** - BaaS pour authentification, storage et database
- **Supabase Storage** - CDN pour vidéos et images
- **IndexedDB** - Stockage local navigateur

### Bibliothèques
- **React Router DOM 6** - Navigation SPA avec routes dynamiques
- **QRCode.react** - Génération de QR codes SVG
- **Motion 12** - Animations et transitions fluides
- **@supabase/supabase-js** - Client Supabase TypeScript

### APIs Web Natives
- **MediaDevices API** - Accès caméra/micro
- **MediaRecorder API** - Enregistrement audio/vidéo
- **Intersection Observer API** - Détection de visibilité
- **Blob & File APIs** - Manipulation de fichiers binaires

## 📦 Installation et Lancement

### Prérequis
- **Node.js** 18+ 
- **npm** ou **yarn**
- **Compte Supabase** (optionnel, pour le cloud)

### Installation

```bash
# Cloner le projet
git clone https://github.com/votre-username/photobooth-360.git
cd photobooth-360

# Installer les dépendances
npm install
```

### Configuration

Créez un fichier `.env` à la racine du projet :

```env
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_cle_anonyme
```

> **Note** : Sans configuration Supabase, l'app fonctionne en mode local avec IndexedDB.

### Lancement

```bash
# Développement (port 3000)
npm run dev

# Build de production
npm run build

# Preview du build
npm run preview

# Vérification TypeScript
npm run lint
```

L'application sera accessible sur `http://localhost:3000`

> ⚠️ **Important** : L'accès caméra requiert HTTPS en production ou `localhost` en développement.

## 🏗 Structure du Projet

```
photobooth-360/
├── src/
│   ├── components/          # Composants React réutilisables
│   │   ├── CameraView.tsx   # Flux vidéo en direct
│   │   ├── PlaybackView.tsx # Lecteur vidéo enregistrée
│   │   ├── RecordButton.tsx # Bouton d'enregistrement animé
│   │   ├── SplashScreen.tsx # Écran d'accueil
│   │   ├── SettingsModal.tsx # Modal de configuration
│   │   ├── PinModal.tsx     # Modal de code PIN
│   │   ├── ShareSection.tsx # Section de partage
│   │   └── GalleryStrip.tsx # Bande de galerie
│   │
│   ├── hooks/               # Hooks React personnalisés
│   │   ├── useCamera.ts     # Gestion de la caméra
│   │   ├── useRecorder.ts   # Logique d'enregistrement
│   │   ├── useSettings.ts   # Persistance des réglages
│   │   ├── useUpload.ts     # Upload vers Supabase
│   │   └── useSlowMotion.ts # Effets slow-motion
│   │
│   ├── lib/                 # Utilitaires et services
│   │   ├── supabase.ts      # Client Supabase
│   │   ├── videoStore.ts    # IndexedDB pour vidéos
│   │   ├── settingsStore.ts # Stockage des réglages
│   │   ├── uploadVideo.ts   # Upload vidéo cloud
│   │   └── uploadLogo.ts    # Upload logo événement
│   │
│   ├── pages/               # Pages de l'application
│   │   ├── GalleryPage.tsx  # Galerie complète
│   │   └── SharePage.tsx    # Page de partage
│   │
│   ├── App.tsx              # Composant racine
│   ├── main.tsx             # Point d'entrée
│   └── index.css            # Styles globaux
│
├── public/                  # Assets statiques
├── supabase/               # Configuration Supabase
│   └── setup.sql           # Schéma SQL
├── .env.example            # Template variables d'env
├── package.json            # Dépendances npm
├── tsconfig.json           # Configuration TypeScript
├── vite.config.ts          # Configuration Vite
├── tailwind.config.js      # Configuration Tailwind
├── README.md               # Ce fichier
└── ROADMAP.md             # Feuille de route

```

## 🚀 Déploiement

### Vercel (Recommandé)

```bash
# Installer Vercel CLI
npm i -g vercel

# Déployer
vercel --prod
```

### Netlify

```bash
# Build
npm run build

# Déployer le dossier dist/
```

### Variables d'environnement

N'oubliez pas de configurer les variables d'environnement sur votre plateforme :
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 📱 Utilisation

### Pour les Organisateurs

1. **Configuration initiale**
   - Accédez aux réglages avec le code PIN (défaut: `1234`)
   - Personnalisez le nom de l'événement
   - Uploadez votre logo
   - Choisissez la durée et le compte à rebours
   - Sélectionnez votre thème de couleur

2. **Installation borne**
   - Utilisez un iPad/tablette en mode paysage
   - Fixez-le sur un pied stable
   - Assurez-vous d'un bon éclairage
   - Testez la caméra et le micro

3. **Pendant l'événement**
   - L'app retourne au splash après 5min d'inactivité
   - Les vidéos sont sauvegardées automatiquement
   - Les invités peuvent scanner le QR code pour récupérer leur vidéo

### Pour les Invités

1. Tapez sur l'écran splash pour commencer
2. Appuyez sur le bouton rouge pour enregistrer
3. Regardez le compte à rebours
4. Profitez de votre moment !
5. Scannez le QR code pour obtenir votre vidéo

## 🔧 Configuration Supabase

### 1. Créer un projet

Allez sur [supabase.com](https://supabase.com) et créez un nouveau projet.

### 2. Créer le bucket de storage

```sql
-- Exécutez dans l'éditeur SQL Supabase
INSERT INTO storage.buckets (id, name, public) 
VALUES ('photobooth360', 'photobooth360', true);
```

### 3. Créer la table settings (optionnel)

```sql
-- Pour la synchronisation des réglages
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🎯 Roadmap

Consultez le fichier `ROADMAP.md` pour les fonctionnalités à venir :
- ✅ Phase 1 : Capture vidéo de base
- ✅ Phase 2 : Réglages et personnalisation
- ✅ Phase 3 : Cloud storage et partage
- ✅ Phase 4 : Galerie et visualisation
- 🚧 Phase 5 : Effets et filtres
- 📋 Phase 6 : Analytics et statistiques

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
- Ouvrir une issue pour signaler un bug
- Proposer une nouvelle fonctionnalité
- Soumettre une pull request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 💡 Support

Pour toute question ou problème :
- 📧 Email : support@neurobooth360.com
- 🐛 Issues : [GitHub Issues](https://github.com/votre-username/photobooth-360/issues)
- 📖 Documentation : [Wiki](https://github.com/votre-username/photobooth-360/wiki)

## 🙏 Remerciements

- [React](https://react.dev) - Framework UI
- [Supabase](https://supabase.com) - Backend as a Service
- [Tailwind CSS](https://tailwindcss.com) - Framework CSS
- [Lucide](https://lucide.dev) - Bibliothèque d'icônes

---

Développé avec ❤️ pour créer des souvenirs inoubliables
