# Roadmap - Photobooth 360

Cette feuille de route détaille les différentes phases d'implémentation pour transformer le prototype et MVP actuel en une solution d'événementiel professionnelle complète.

## Phase 1 : MVP Core (✅ Terminée)
- [x] Accès à la webcam / caméra du smartphone.
- [x] Interface utilisateur propre et responsive (Tailwind CSS, Thème Sombre).
- [x] Décompte avant enregistrement (3 secondes).
- [x] Enregistrement vidéo natif via flux média (format `.webm`).
- [x] Prévisualisation de la vidéo capturée.
- [x] Téléchargement local de la vidéo.

## Phase 2 : Personnalisation & Amélioration UX (✅ Terminée)
- [x] **Sélection de durée** : Ajout du choix de la durée d'enregistrement dynamique (15s, 30s, 60s).
- [x] **Sélecteur de caméra** : Permettre de basculer entre la caméra frontale et la caméra arrière (indispensable sur mobile, tablettes et bornes pro).
- [x] **Filtres et Incrustation (Watermark)** : Incruster le logo de l'événement en surimpression sur le flux vidéo.
- [x] **Flash visuel** : Animation visuelle blanche émulant un "flash" d'appareil photo lors de la capture.

## Phase 3 : Déploiement Cloud & Distribution (À venir)
- [ ] **Stockage Distant** : Intégration d'un backend (ex: Firebase Storage, Supabase Storage, AWS S3) pour uploader les vidéos de façon transparente après l'enregistrement.
- [x] **Génération de QR Code** : Interface de récupération par scan prête (connexion au backend requise pour le vrai lien).
- [ ] **Galerie de l'événement** : Une page accessible (avec URL secrète ou mot de passe) regroupant de manière élégante toutes les captations prises lors de l'événement.

## Phase 4 : Processing Vidéo & Avancé (WebAssembly)
- [ ] **Slow-Motion / Boomerang** : Utilisation de `FFmpeg.wasm` pour post-traiter la vidéo directement dans le navigateur du client avant l'upload au serveur pour des effets dignes des Photobooth 360 premium.
- [ ] **Effets sonores automatisés** : Ajout d'une musique de fond intégrée (muxing audio/vidéo).
- [ ] **Formats d'Export Flexibles** : Recadrage proportionnel ciblant le format Portrait (9:16 pour Instagram Reels / TikTok) ou Carré (1:1).

---

*L'architecture en place (Hooks personnalisés, interfaces modulaires) a été préparée pour faciliter l'intégration future de ces étapes sans détruire le code existant.*
