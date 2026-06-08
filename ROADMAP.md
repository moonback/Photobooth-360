# Roadmap — NeuroBooth 360
### Solution vidéo événementielle professionnelle

> **Vision produit :** Une expérience NeuroBooth 360° clé-en-main, déployable sur n'importe quel événement sans infrastructure lourde — navigateur, connexion, borne tournante. Zéro technicien requis sur site.

---

## 📊 Statut rapide des phases

| Phase | Nom | Statut | Progression |
|-------|-----|--------|-------------|
| 1 | MVP Core | ✅ Livrée | 100% |
| 2 | Personnalisation & UX Événementielle | ✅ Livrée | 100% |
| 3 | Cloud & Distribution | ✅ Livrée | 100% |
| 4 | Galerie & Playback | ✅ Livrée | 100% |
| 5 | Mode Kiosque & Opérateur | ✅ Livrée | 100% |
| 6 | Matériel & Moteur ESP32 | ✅ Livrée | 100% |
| 7 | Effets & Post-Traitement In-Browser | 🚧 En cours | ~60% |
| 8 | Analytics Avancés & Rapport | 📋 Planifiée | 0% |
| 9 | Expérience Invité Premium | 📋 Planifiée | 0% |
| 10 | Intégrations & API | 📋 Planifiée | 0% |
| 11 | IA & Fonctionnalités Intelligentes | 🚀 En réflexion | 0% |

---

## ✅ Phase 1 — MVP Core *(Livrée)*

Fonctionnalités de base pour capturer et partager des vidéos.

- [x] Accès caméra via `getUserMedia`
- [x] Interface responsive, thème sombre (Tailwind CSS)
- [x] Compte à rebours visuel configurable
- [x] Enregistrement natif (`MediaRecorder`, `.webm`)
- [x] Prévisualisation immédiate après capture
- [x] Téléchargement local de la vidéo

---

## ✅ Phase 2 — Personnalisation & UX Événementielle *(Livrée)*

Amélioration de l'expérience utilisateur et personnalisation de l'événement.

- [x] Durée d'enregistrement configurable (10s → 2min)
- [x] Bascule caméra frontale / arrière
- [x] Filigrane dynamique (nom de l'événement)
- [x] Flash visuel au démarrage de la capture
- [x] Galerie de session avec strip de vignettes
- [x] QR Code de récupération post-capture
- [x] Modal de réglages complets (nom, durée, résolution, thème)
- [x] 5 palettes de couleur d'accentuation

---

## ✅ Phase 3 — Cloud & Distribution *(Livrée)*

Partage multi-appareils et stockage cloud.

- [x] Upload automatique vers Supabase Storage
- [x] Barre de progression d'upload
- [x] Lien de partage unique encodé dans le QR Code
- [x] Page de récupération mobile (iOS / Android)
- [x] Fallback IndexedDB hors-ligne
- [x] Capture email avec envoi automatique de la vidéo via Resend
- [x] Dashboard liste des emails collectés

---

## ✅ Phase 4 — Galerie & Playback *(Livrée)*

Gestion et lecture des vidéos capturées.

- [x] Galerie complète avec affichage adaptatif (1 → 5 colonnes)
- [x] Autoplay au scroll (Intersection Observer)
- [x] Modal plein écran avec contrôles vidéo
- [x] Tri chronologique, pagination jusqu'à 1000 vidéos
- [x] Sélection et relecture depuis la strip galerie

---

## ✅ Phase 5 — Mode Kiosque & Opérateur *(Livrée)*

Verrouillage de la borne et accès sécurisé aux réglages.

- [x] Mode kiosque plein écran avec Wake Lock
- [x] Geste secret haut-centre : 5 taps → réglages (PIN), 10 taps → exit (PIN)
- [x] Feedback visuel : 5 puces indigo + 5 puces rouges
- [x] Code PIN admin pour protéger réglages ET sortie kiosque
- [x] Bannière de reprise si plein écran interrompu
- [x] Badge kiosque et statut veille
- [x] Splash screen personnalisable (logo, nom, thème)
- [x] Timer d'inactivité (retour splash après 5 min)
- [x] Stats live (captures, partages, téléchargements)

---

## ✅ Phase 6 — Matériel & Moteur ESP32 *(Livrée)*

Contrôle d'un plateau motorisé pour des captures 360°.

- [x] Contrôle moteur via WebSerial / Bluetooth (ESP32)
- [x] Réglage vitesse, direction et nombre de tours
- [x] Synchronisation plateau / déclenchement (modes : ACK, délai, immédiat)
- [x] Panneau de contrôle moteur in-app
- [x] Firmware Arduino open-source (`firmware/esp32_photobooth360/`)
- [x] [Documentation matériel](./firmware/WIRING.md)

---

## 🚧 Phase 7 — Effets & Post-Traitement In-Browser *(En cours)*

Traitement vidéo directement dans le navigateur sans serveur de rendu.

- [x] Slow-motion (0.5× / 0.25×) via playback rate
- [x] **Intro / Outro animés** — jingle de marque en pré/post-roll modifiable dans les réglages
- [x] **Recadrage automatique** — export 16:9, 9:16, 1:1 selon destination
- [x] **Musique de fond** — bibliothèque de pistes mixées sur la vidéo (muxing FFmpeg.wasm)
- [ ] **Effet Boomerang** — boucle aller-retour style Instagram
- [ ] **Incrustation logo HD** — compositing PNG sur la vidéo finale (FFmpeg.wasm)
- [ ] **Filtres couleur** — LUT basiques (noir & blanc, sépia, vintage, vivid)
- [ ] **Stabilisation** — correction de tremblement par analyse de frames

---

## 📋 Phase 8 — Analytics Avancés & Rapport *(Planifiée)*

Analyse des performances de l'événement et rapports.

- [ ] **Dashboard post-événement** — rapport PDF avec métriques complètes
- [ ] **Heatmap temporelle** — activité sur la timeline de l'événement
- [ ] **Taux de partage** — ratio captures / QR scannés / emails collectés
- [ ] **Webhook CRM** — notification en temps réel à chaque nouvelle prise
- [ ] **Export CSV** — liste complète des captures et emails pour le client
- [ ] **Comparaison multi-événements** — suivi de performance sur la durée

---

## 📋 Phase 9 — Expérience Invité Premium *(Planifiée)*

Transformer le parcours invité en expérience mémorable.

- [ ] **Écran miroir secondaire** — affichage HDMI du flux en direct pour que le sujet se voit
- [ ] **Flux de capture guidé** — étapes animées (approche → positionnement → prise → récupération)
- [ ] **Idle screen animé** — écran d'attente avec "dernière prise il y a X min"
- [ ] **Page de récupération personnalisée** — branding événement sur la page QR
- [ ] **Réactions en temps réel** — le sujet voit son QR s'activer sur l'écran
- [ ] **Mode duo** — capture simultanée depuis deux caméras (avant/arrière)

---

## 📋 Phase 10 — Intégrations & API *(Long terme)*

Intégrations avec des services tiers et API publique.

- [ ] **Impression instantanée** — imprimantes photo DNP/HiTi via API impression
- [ ] **API publique REST** — intégration dans plateformes tierces (gestionnaires d'événements)
- [ ] **Support multi-langue** — FR / EN / ES / DE / AR
- [ ] **Expiration configurable des liens** — 24h, 7j, permanent selon forfait
- [ ] **Mode hors-ligne complet** — sync différée au retour réseau
- [ ] **Authentification opérateur** — multi-compte avec rôles (admin, opérateur, viewer)
- [ ] **Webhooks Zapier / Make** — automatisation no-code post-événement

---

## 🚀 Phase 11 — IA & Fonctionnalités Intelligentes *(En réflexion)*

Fonctionnalités basées sur l'intelligence artificielle pour rendre l'expérience encore plus magique.

- [ ] **Remplacement de fond IA** — suppression et remplacement du fond en temps réel sans fond vert (chroma key intelligent)
- [ ] **Amélioration de visage IA** — lissage de peau, correction de teint, réduction des rides automatiques
- [ ] **Sous-titres automatiques IA** — génération de sous-titres en plusieurs langues à partir de l'audio de la vidéo
- [ ] **Détection de scène IA** — détection automatique du type d'événement (mariage, anniversaire, soirée d'entreprise) et ajustement des paramètres (thème, effets, durée)
- [ ] **Highlights vidéo IA** — création automatique d'un reel de l'événement en assemblant les meilleures captures (selon l'expression des visages, l'action, etc.)
- [ ] **Suggestions d'emojis/stickers IA** — propositions d'emojis ou de stickers personnalisés selon l'expression du visage et le contexte
- [ ] **Commandes vocales IA** — contrôle de la borne par la voix (ex: "Démarre l'enregistrement", "Change le thème")
- [ ] **Suggestions de pose IA** — guide visuel avec suggestions de poses pour les invités (basé sur le nombre de personnes et le type d'événement)
- [ ] **Génération de texte IA** — messages personnalisés pour les vidéos (ex: "Joyeux anniversaire Lucas ! 🎉")
- [ ] **Analyse de sentiment IA** — détection de l'humeur des invités et ajustement des effets en temps réel

---

## 🆕 Nouvelles Fonctionnalités Proposées (Backlog)

Plus de 30 idées prioritaires pour les prochains sprints, classées par catégorie !

### 🎬 Vidéo & Capture
1. **Recadrage live 9:16** — preview en temps réel dans le format Stories/Reels avant la capture
2. **Mode rafale photo** — série de photos JPG haute résolution en plus de la vidéo
3. **Détection de visage** — cadrage automatique pour centrer le sujet (API Shape Detection)
4. **Contrôle d'exposition** — slider manuel ISO/luminosité pour adapter à l'éclairage de la salle
5. **Zoom numérique** — pinch-to-zoom sur le flux caméra avant l'enregistrement
6. **Mode time-lapse** — capture accélérée de l'événement sur plusieurs heures
7. **Slow-motion en direct** — enregistrement en haute vitesse (120fps/240fps) pour un rendu ultra fluide

### 🎨 Personnalisation & Branding
8. **Overlays thématiques** — cadres animés saisonniers (Noël, St-Valentin, Halloween…) configurables
9. **Texte animé sur vidéo** — sous-titre ou hashtag d'événement incrusté avec animation d'entrée
10. **Palette de couleurs custom** — import de couleurs HEX pour coller exactement à la charte du client
11. **Son de déclenchement** — son personnalisable (flash photo, bip, musique courte) au démarrage
12. **Fond virtuel (chroma)** — remplacement du fond vert par une image/vidéo de marque
13. **Watermark custom** — ajout d'un logo/watermark personnalisable sur la vidéo (position et opacité)
14. **Templates de vidéo** — templates prédéfinis avec intros/outros, transitions et musique

### 🤖 IA & Interactivité Intelligente
15. **Remplacement de fond IA (lite)** — version légère pour exécution locale (sans cloud)
16. **Amélioration de visage IA (lite)** — retouche légère du visage en temps réel
17. **Reconnaissance faciale** — identification des invités répétés (avec consentement) pour personnaliser l'expérience
18. **Génération de hashtags IA** — suggestions de hashtags personnalisés selon l'événement
19. **Traduction IA** — traduction instantanée des textes de l'interface dans plusieurs langues

### 🔗 Partage & Distribution
20. **Partage direct Instagram/TikTok** — bouton natif vers les apps via Web Share API
21. **Galerie publique événement** — page web partageable avec toutes les vidéos du soir (protégée par code)
22. **NFC tag** — écriture du lien vidéo sur une puce NFC pour récupération sans QR code
23. **Notification push** — envoi d'une notif sur le téléphone de l'invité quand sa vidéo est prête
24. **Mode multi-device** — plusieurs bornes synchronisées sur le même événement (même bucket Supabase)
25. **Partage social batch** — partage de plusieurs vidéos en même temps vers les réseaux sociaux

### ⚙️ Opérationnel & Gestion
26. **Planning d'événement** — activation/désactivation automatique de la borne selon un créneau horaire
27. **Compteur de quota** — alerte opérateur quand le stockage ou le nombre de captures approche la limite
28. **Sauvegarde des réglages par QR** — exporter/importer la config complète via QR code pour setup rapide
29. **Journal d'activité** — log horodaté de toutes les actions (captures, accès admin, erreurs) exportable
30. **Mode démo / test** — session sandbox sans upload ni stockage pour formation des opérateurs
31. **Monitoring à distance** — dashboard de monitoring en temps réel de plusieurs bornes via Supabase
32. **Mise à jour OTA** — mise à jour automatique de la PWA sans intervention de l'opérateur

### 🎪 Fun & Expérience Utilisateur
33. **Mode Photobooth classique** — mode photo simple avec 4 poses et un strip photo imprimable
34. **Jeux intégrés** — mini-jeux interactifs pendant le compte à rebours (ex: attraper un emoji)
35. **AR Filters** — filtres de réalité augmentée simples (oreilles de lapin, lunettes de soleil, etc.)
36. **Collage vidéo** — assemblage de plusieurs captures en un seul montage avec musique
37. **Signature digitale** — ajout d'une signature digitale de l'invité sur la vidéo

---

## 🎯 Architecture technique cible

```mermaid
graph TB
    A[Borne / Tablette / PWA] -->|HTTPS / WebSocket| B[Supabase Backend]
    B -->|Stockage| C[(Supabase Storage)]
    B -->|Données| D[(Supabase Database)]
    B -->|Fonctions| E[Edge Functions]
    B -->|Temps réel| F[Realtime]
    A -->|WebSerial / Bluetooth| G[Plateau ESP32]
    A -->|QR Code / NFC| H[Invité]
    E -->|Envoi emails| I[Resend]
    A -->|IA locale| J[IA en Edge (TensorFlow.js)]
    E -->|IA cloud| K[API IA (Gemini, OpenAI)]
    K -->|Retouche vidéo| A
    K -->|Génération texte| E
```

---

## 📚 Liens utiles

- [README.md](./README.md) : Documentation principale
- [ARCHITECTURE.md](./ARCHITECTURE.md) : Architecture technique détaillée
- [DB_SCHEMA.md](./DB_SCHEMA.md) : Schéma de la base de données
- [API_DOCS.md](./API_DOCS.md) : Documentation API
- [CONTRIBUTING.md](./CONTRIBUTING.md) : Guide de contribution

---

*L'architecture modulaire (hooks isolés, composants découplés, settings externalisés) a été conçue dès le départ pour absorber chaque phase sans refonte majeure.*
