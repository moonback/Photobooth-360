# Roadmap — NeuroBooth 360 Rotatif
### Solution vidéo événementielle professionnelle

> **Vision produit :** Offrir une expérience NeuroBooth 360° clé-en-main, déployable sur n'importe quel événement (mariage, gala, lancement de marque, festival, soirée d'entreprise) sans infrastructure lourde — uniquement un navigateur, une connexion et une borne tournante.

---

## ✅ Phase 1 — MVP Core *(Livrée)*

Fondations techniques et première expérience utilisateur fonctionnelle.

- [x] Accès à la caméra via l'API Web native (`getUserMedia`)
- [x] Interface responsive, thème sombre immersif (Tailwind CSS)
- [x] Compte à rebours visuel avant enregistrement
- [x] Enregistrement vidéo natif (`MediaRecorder`, format `.webm`)
- [x] Prévisualisation immédiate de la vidéo capturée
- [x] Téléchargement local de la vidéo

---

## ✅ Phase 2 — Personnalisation & UX Événementielle *(Livrée)*

Adaptation aux contraintes réelles d'un événement.

- [x] **Durée configurable** — 10s, 15s, 30s, 60s, 2min
- [x] **Bascule caméra** — frontale / arrière (tablette, borne, smartphone)
- [x] **Filigrane dynamique** — nom de l'événement en surimpression sur le flux en direct
- [x] **Flash visuel** — animation d'appareil photo au démarrage de la capture
- [x] **Galerie de session** — toutes les prises de la session courante accessibles instantanément
- [x] **QR Code de récupération** — généré après chaque prise (prêt pour lien distant)
- [x] **Modal de réglages** — configuration complète sans toucher au code (nom événement, durée, compte à rebours, résolution, couleur d'accentuation)
- [x] **Thème couleur dynamique** — 5 palettes d'accentuation adaptables à la charte graphique de l'événement

---

## 🔄 Phase 3 — Infrastructure Cloud & Distribution *(En cours)*

Permettre aux invités de recevoir leur vidéo instantanément sur leur téléphone.

- [x] **Upload automatique post-enregistrement** — intégration d'un backend de stockage (Supabase Storage) avec barre de progression
- [x] **Lien de partage unique** — URL courte et sécurisée générée par vidéo, encodée dans le QR Code
- [x] **Page de récupération mobile** — landing page légère accessible depuis le QR Code, avec aperçu et bouton de téléchargement natif (iOS / Android)
- [ ] **Expiration configurable des liens** — paramétrer la durée de vie des fichiers (24h, 7j, permanent) selon le forfait événement
- [ ] **Mode hors-ligne avec sync différée** — stocker localement (`IndexedDB`) en cas de coupure réseau, puis uploader automatiquement dès reconnexion

---

## 🎬 Phase 4 — Effets Vidéo & Post-Traitement In-Browser *(Haute valeur ajoutée)*

Traitement vidéo professionnel directement dans le navigateur, sans serveur de rendu.

- [x] **Slow-Motion automatique** — relecturer à 0.5× ou 0.25× via `FFmpeg.wasm` pour l'effet signature des NeuroBooth 360
- [ ] **Effet Boomerang** — boucle aller-retour de la séquence (style Instagram)
- [ ] **Incrustation de logo HD** — logo vectoriel ou image PNG de l'événement composité sur la vidéo finale (pas seulement en overlay CSS)
- [ ] **Intro / Outro animés** — jingle vidéo de marque ajouté automatiquement en pré et post-roll
- [ ] **Formats d'export multiples** — recadrage automatique en :
  - `16:9` — projection et écrans d'ambiance
  - `9:16` — Instagram Reels, TikTok, Stories
  - `1:1` — feed Instagram, affichage bornes
- [ ] **Musique de fond** — bibliothèque de pistes audio mixées sur la vidéo finale (muxing `FFmpeg.wasm`)

---

## 🖥️ Phase 5 — Mode Borne & Expérience Opérateur *(Déploiement Professionnel)*

Transformer l'app en un produit opérable sans technicien sur site.

- [ ] **Mode Kiosque** — application plein écran verrouillée, sans accès au navigateur ni aux paramètres système
- [x] **Écran d'accueil personnalisable** — splash screen avec logo, nom et thème de l'événement configurable depuis reglage et je veut un code pin pour acces reglage
- [ ] **Idle screen** — écran d'attente animé avec compteur "dernière prise il y a X min" pour attirer les invités
- [ ] **Flux de capture guidé** — séquence d'étapes animées (approche → positionnement → compte à rebours → prise → récupération) pour une utilisation 100% autonome
- [ ] **Panneau opérateur sécurisé** — accès via code PIN pour modifier les réglages sans quitter le mode kiosque
- [ ] **Compteur de prises en temps réel** — statistiques live (nombre de vidéos, partages, téléchargements) accessibles à l'organisateur
- [ ] **Support multi-langue** — FR / EN / ES / DE pour les événements internationaux

---

## 📊 Phase 6 — Analytics & Rapport Événement *(Valeur Business)*

Données exploitables pour les organisateurs et les équipes marketing.

- [ ] **Dashboard post-événement** — rapport PDF automatique avec nombre de prises, pics d'utilisation, taux de partage
- [ ] **Heatmap temporelle** — visualisation de l'activité sur la timeline de l'événement
- [ ] **Collecte opt-in** — formulaire de recueil d'email ou numéro de téléphone avant récupération de la vidéo (RGPD conforme)
- [ ] **Intégrations marketing** — envoi automatique par email / SMS via Mailgun, Brevo ou Twilio
- [ ] **Webhook événement** — notification en temps réel vers un CRM ou outil de gestion de l'événement à chaque nouvelle prise

---

## 🔌 Phase 7 — Intégrations Matérielles & API Partenaires *(Long terme)*

Connecter l'app à l'écosystème physique du NeuroBooth 360.

- [ ] **Contrôle motorisé du plateau tournant** — API WebSerial / WebUSB pour piloter le moteur de rotation (vitesse, sens, nombre de tours) directement depuis l'interface
- [ ] **Synchronisation déclenchement / rotation** — lancer l'enregistrement exactement en phase avec le départ du plateau pour une capture 360° parfaite
- [ ] **Impression instantanée** — intégration avec des imprimantes photo (DNP, HiTi) via API d'impression navigateur ou backend léger
- [ ] **Affichage miroir** — mode "mirror display" sur un second écran (HDMI) pour que le sujet se voit en direct pendant la rotation
- [ ] **API publique** — endpoints REST pour intégrer le NeuroBooth dans des plateformes tierces (gestionnaires d'événements, plateformes SaaS)

---

## Architecture technique cible

```
┌─────────────────────────────────────────────┐
│              Borne / Tablette                │
│  React PWA  ·  Mode Kiosque  ·  Offline-first│
└──────────────────┬──────────────────────────┘
                   │ HTTPS / WebSocket
┌──────────────────▼──────────────────────────┐
│              Backend Léger                   │
│  Supabase / Firebase  ·  Webhooks  ·  Auth   │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│           Stockage & Delivery                │
│  CDN  ·  Liens QR courts  ·  Expiration auto │
└─────────────────────────────────────────────┘
```

---

*L'architecture modulaire actuelle (hooks personnalisés, composants isolés, settings externalisés) a été conçue dès le départ pour absorber chaque phase sans refonte majeure.*
