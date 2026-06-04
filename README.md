# Photobooth 360 🎥

Une application web moderne de type "Photomaton 360", permettant de capturer des vidéos directement depuis le navigateur. Conçue pour être utilisée lors d'événements, soirées et mariages sur une borne ou une tablette.

## Fonctionnalités 🚀
- 🔴 **Enregistrement Vidéo** interactif et sans module complémentaire (via l'API `MediaRecorder` native).
- ⏱ **Compte à rebours** visuel pour se préparer avant la capture.
- ⏳ **Durée personnalisable** (15, 30 ou 60 secondes).
- 📱 **Responsive & Mobile-first**, parfait pour des iPad ou terminaux tactiles, mode paysage ou portrait.
- 📥 **Téléchargement immédiat** de la vidéo sur l'appareil au format universel WebM.

## Stack Technique 🛠
- **React 19** & **TypeScript**
- **Vite** pour des performances de build et un démarrage instantané.
- **Tailwind CSS 4** pour l'interface graphique moderne et le thème sombre immersif.
- **Lucide React** pour des icônes légères et esthétiques.
- **APIs Web Natives** : `navigator.mediaDevices.getUserMedia` & `MediaRecorder`.

## Installation et Lancement Local 💻

1. **Installation des dépendances**
   ```bash
   npm install
   ```
2. **Démarrage du serveur de développement**
   ```bash
   npm run dev
   ```
3. Ouvrez votre navigateur à l'adresse indiquée (généralement `http://localhost:3000`).

*Note importante : L'accès à la caméra (`getUserMedia`) requiert généralement un environnement sécurisé (HTTPS) ou un environnement de développement local (`localhost`).*

## Structure du Projet 📂
- `/src/components/` *(À venir selon roadmap)* : Composants d'interface (UI, Modals, Camera).
- `/src/hooks/useRecorder.ts` : Hook React encapsulant toute la logique complexe de l'enregistrement média.
- `/src/App.tsx` : Page principale de l'application et composition visuelle de la scène.

Consultez le fichier `ROADMAP.md` pour suivre l'évolution des fonctionnalités à travers les différentes phases de développement.
