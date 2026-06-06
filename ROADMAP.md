# Roadmap — NeuroBooth 360
### Solution vidéo événementielle professionnelle

> **Vision produit :** Une expérience NeuroBooth 360° clé-en-main, déployable sur n'importe quel événement sans infrastructure lourde — navigateur, connexion, borne tournante. Zéro technicien requis sur site.

---

## ✅ Phase 1 — MVP Core *(Livrée)*

- [x] Accès caméra via `getUserMedia`
- [x] Interface responsive, thème sombre (Tailwind CSS)
- [x] Compte à rebours visuel configurable
- [x] Enregistrement natif (`MediaRecorder`, `.webm`)
- [x] Prévisualisation immédiate après capture
- [x] Téléchargement local de la vidéo

---

## ✅ Phase 2 — Personnalisation & UX Événementielle *(Livrée)*

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

- [x] Upload automatique vers Supabase Storage
- [x] Barre de progression d'upload
- [x] Lien de partage unique encodé dans le QR Code
- [x] Page de récupération mobile (iOS / Android)
- [x] Fallback IndexedDB hors-ligne
- [x] Capture email avec envoi automatique de la vidéo
- [x] Dashboard liste des emails collectés

---

## ✅ Phase 4 — Galerie & Playback *(Livrée)*

- [x] Galerie complète avec affichage adaptatif (1 → 5 colonnes)
- [x] Autoplay au scroll (Intersection Observer)
- [x] Modal plein écran avec contrôles vidéo
- [x] Tri chronologique, pagination jusqu'à 1000 vidéos
- [x] Sélection et relecture depuis la strip galerie

---

## ✅ Phase 5 — Mode Kiosque & Opérateur *(Livrée)*

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

- [x] Contrôle moteur via WebSerial / Bluetooth (ESP32)
- [x] Réglage vitesse, direction, nombre de tours
- [x] Synchronisation plateau / déclenchement (modes : ACK, délai, immédiat)
- [x] Panneau de contrôle moteur in-app
- [x] Firmware Arduino open-source (`firmware/esp32_photobooth360/`)

---

## 🚧 Phase 7 — Effets & Post-Traitement In-Browser *(En cours)*

Traitement vidéo directement dans le navigateur sans serveur de rendu.

- [x] Slow-motion (0.5× / 0.25×) via playback rate
- [ ] **Effet Boomerang** — boucle aller-retour style Instagram
- [ ] **Incrustation logo HD** — compositing PNG sur la vidéo finale (FFmpeg.wasm)
- [ ] **Intro / Outro animés** — jingle de marque en pré/post-roll
- [ ] **Recadrage automatique** — export 16:9, 9:16, 1:1 selon destination
- [ ] **Musique de fond** — bibliothèque de pistes mixées sur la vidéo (muxing FFmpeg.wasm)
- [ ] **Filtres couleur** — LUT basiques (noir & blanc, sépia, vintage, vivid)
- [ ] **Stabilisation** — correction de tremblement par analyse de frames

---

## 📋 Phase 8 — Analytics Avancés & Rapport *(Planifiée)*

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

- [ ] **Impression instantanée** — imprimantes photo DNP/HiTi via API impression
- [ ] **API publique REST** — intégration dans plateformes tierces (gestionnaires d'événements)
- [ ] **Support multi-langue** — FR / EN / ES / DE / AR
- [ ] **Expiration configurable des liens** — 24h, 7j, permanent selon forfait
- [ ] **Mode hors-ligne complet** — sync différée au retour réseau
- [ ] **Authentification opérateur** — multi-compte avec rôles (admin, opérateur, viewer)
- [ ] **Webhooks Zapier / Make** — automatisation no-code post-événement

---

## 🆕 Nouvelles Fonctionnalités Proposées

> 20 idées prioritaires pour les prochains sprints

### 🎬 Vidéo & Capture
1. **Recadrage live 9:16** — preview en temps réel dans le format Stories/Reels avant la capture
2. **Mode rafale photo** — série de photos JPG haute résolution en plus de la vidéo
3. **Détection de visage** — cadrage automatique pour centrer le sujet (API Shape Detection)
4. **Contrôle d'exposition** — slider manuel ISO/luminosité pour adapter à l'éclairage de la salle
5. **Zoom numérique** — pinch-to-zoom sur le flux caméra avant l'enregistrement

### 🎨 Personnalisation & Branding
6. **Overlays thématiques** — cadres animés saisonniers (Noël, St-Valentin, Halloween…) configurables
7. **Texte animé sur vidéo** — sous-titre ou hashtag d'événement incrusté avec animation d'entrée
8. **Palette de couleurs custom** — import de couleurs HEX pour coller exactement à la charte du client
9. **Son de déclenchement** — son personnalisable (flash photo, bip, musique courte) au démarrage
10. **Fond virtuel (chroma)** — remplacement du fond vert par une image/vidéo de marque

### 🔗 Partage & Distribution
11. **Partage direct Instagram/TikTok** — bouton natif vers les apps via Web Share API
12. **Galerie publique événement** — page web partageable avec toutes les vidéos du soir (protégée par code)
13. **NFC tag** — écriture du lien vidéo sur une puce NFC pour récupération sans QR code
14. **Notification push** — envoi d'une notif sur le téléphone de l'invité quand sa vidéo est prête
15. **Mode multi-device** — plusieurs bornes synchronisées sur le même événement (même bucket Supabase)

### ⚙️ Opérationnel & Gestion
16. **Planning d'événement** — activation/désactivation automatique de la borne selon un créneau horaire
17. **Compteur de quota** — alerte opérateur quand le stockage ou le nombre de captures approche la limite
18. **Sauvegarde des réglages par QR** — exporter/importer la config complète via QR code pour setup rapide
19. **Journal d'activité** — log horodaté de toutes les actions (captures, accès admin, erreurs) exportable
20. **Mode démo / test** — session sandbox sans upload ni stockage pour formation des opérateurs

---

## Architecture technique cible

```
┌─────────────────────────────────────────────┐
│         Borne / Tablette / PWA              │
│  React 19  ·  Mode Kiosque  ·  Offline-first │
│  WebSerial (ESP32)  ·  WebShare  ·  NFC      │
└──────────────────┬──────────────────────────┘
                   │ HTTPS / WebSocket
┌──────────────────▼──────────────────────────┐
│            Backend Supabase                  │
│  Storage  ·  Database  ·  Edge Functions     │
│  Auth  ·  Realtime  ·  Webhooks              │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│          Distribution & Delivery             │
│  CDN  ·  QR courts  ·  NFC  ·  Push notifs  │
└─────────────────────────────────────────────┘
```

---

*L'architecture modulaire (hooks isolés, composants découplés, settings externalisés) a été conçue dès le départ pour absorber chaque phase sans refonte majeure.*
