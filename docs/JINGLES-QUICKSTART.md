# Quick Start - Intro/Outro Jingles

## Configuration rapide en 5 minutes

### 1. Prérequis
- Supabase configuré (voir `.env.example`)
- Application déployée ou en développement local

### 2. Configuration Supabase

Exécutez le script SQL pour configurer les permissions :
```bash
# Depuis le dashboard Supabase > SQL Editor
# Exécuter le contenu de : supabase/setup-jingles-storage.sql
```

Ou via CLI :
```bash
supabase db push
```

### 3. Préparer vos jingles

#### Recommandations format
- **Intro**: 2-3 secondes max
- **Outro**: 3-5 secondes max
- **Résolution**: 1280x720 (720p) recommandé
- **Format**: MP4 (H.264) ou image PNG/JPG
- **Audio**: Silencieux ou audio faible (sera muet dans le jingle)

#### Exemple de structure
```
jingles/
├── intro.mp4       # Logo animé avec fadeIn
├── outro.mp4       # Call-to-action avec QR code
└── fallback.png    # Image statique de backup
```

### 4. Upload via l'interface

1. Ouvrir l'application
2. Geste secret (5 taps en haut centre) → Code PIN admin
3. Faire défiler jusqu'à **"Intro / Outro animés"**
4. Activer le toggle
5. Cliquer sur **"Intro"** → Sélectionner votre fichier
6. Cliquer sur **"Outro"** → Sélectionner votre fichier
7. Sauvegarder

### 5. Tester

1. Retourner à l'écran de capture
2. Enregistrer une vidéo courte (10s)
3. Observer l'indicateur de composition après l'enregistrement
4. Visionner la vidéo finale avec intro + vidéo + outro

### 6. Vérifier le résultat

La vidéo finale devrait contenir :
- ✅ Intro de 2-3s
- ✅ Votre capture (durée définie)
- ✅ Outro de 3-5s
- ✅ Audio préservé sur la partie principale
- ✅ Transitions fluides

## Troubleshooting rapide

### Le jingle ne s'affiche pas
```bash
# Vérifier dans la console navigateur (F12)
# Erreur de chargement ? → Vérifier l'URL Supabase
# CORS error ? → Vérifier les politiques RLS
```

### La composition est lente
- Réduire la résolution à 720p ou 480p
- Utiliser des jingles optimisés (format web)
- Utiliser des images fixes plutôt que des vidéos

### Erreur "not configured"
```bash
# Vérifier le fichier .env.local
VITE_SUPABASE_URL=https://[PROJECT].supabase.co
VITE_SUPABASE_ANON_KEY=[KEY]
```

## Exemples de jingles

### Intro simple (2s)
```
- Frame 0-30: Logo fadeIn
- Frame 31-60: Logo statique
```

### Outro avec CTA (5s)
```
- Frame 0-60: "Merci!" avec animation
- Frame 61-120: QR code + "Scannez pour télécharger"
- Frame 121-150: FadeOut
```

## Ressources

- Documentation complète: [docs/JINGLES.md](./JINGLES.md)
- Configuration Supabase: [supabase/setup-jingles-storage.sql](../supabase/setup-jingles-storage.sql)
- Exemple de firmware: [firmware/esp32_photobooth360/](../firmware/esp32_photobooth360/)

## Support

Pour toute question ou problème :
1. Vérifier la console navigateur (F12 > Console)
2. Consulter les logs Supabase (Dashboard > Logs)
3. Ouvrir une issue sur GitHub avec les logs
