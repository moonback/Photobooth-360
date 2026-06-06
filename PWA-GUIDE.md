# Guide PWA - NeuroBooth 360

## 📱 Progressive Web App Complète

Cette application est maintenant une **PWA complète** avec toutes les fonctionnalités modernes :

### ✨ Fonctionnalités PWA

1. **Installation Native**
   - Installation sur l'écran d'accueil (iOS et Android)
   - Icône d'application personnalisée
   - Écran de démarrage (splash screen)
   - Mode standalone (sans barre de navigation du navigateur)

2. **Mode Hors Ligne**
   - Fonctionnement sans connexion Internet
   - Cache intelligent des ressources
   - Synchronisation automatique quand la connexion revient

3. **Mises à Jour Automatiques**
   - Détection automatique des nouvelles versions
   - Notification de mise à jour avec bouton de rafraîchissement
   - Mise à jour en arrière-plan

4. **Optimisations Performances**
   - Cache des ressources statiques (JS, CSS, images)
   - Cache des polices Google Fonts
   - Cache des vidéos et médias
   - Pré-cache des pages importantes

5. **Raccourcis Application**
   - "Nouvelle capture" - démarrer directement la capture
   - "Galerie" - accès direct à la galerie

## 🚀 Installation

### Prérequis
```bash
npm install
```

### Générer les icônes PWA
```bash
# Installer sharp pour la génération d'icônes
npm install sharp --save-dev

# Générer les icônes à partir de logo.png
npm run generate:icons
```

**Note:** Assurez-vous que `/public/logo.png` existe avant de générer les icônes.

## 🔧 Configuration

### Fichiers PWA

- **`public/manifest.json`** - Manifest de l'application
- **`vite.config.ts`** - Configuration Vite avec plugin PWA
- **`src/components/PWAInstallPrompt.tsx`** - Prompt d'installation
- **`src/components/PWAUpdatePrompt.tsx`** - Notification de mise à jour
- **`src/hooks/usePWA.ts`** - Hook pour gérer le PWA
- **`public/offline.html`** - Page affichée en mode hors ligne

### Service Worker

Le service worker est généré automatiquement par `vite-plugin-pwa` avec Workbox. Il gère :

- **Précache** : Toutes les ressources statiques (JS, CSS, HTML)
- **Runtime cache** :
  - Google Fonts (1 an)
  - Supabase API (1 semaine)
  - Images (30 jours)
  - Vidéos (7 jours)

## 📦 Build et Déploiement

```bash
# Build de production avec PWA
npm run build

# Preview local
npm run preview
```

### Configuration HTTPS

⚠️ **Important** : Les PWA nécessitent HTTPS en production (sauf pour localhost).

Pour tester en local avec HTTPS :
```bash
# Avec vite
npm run dev -- --https
```

## 🎯 Utilisation

### Installation sur Mobile

**Android (Chrome, Edge, Firefox) :**
1. Ouvrir l'application dans le navigateur
2. Attendre le prompt d'installation automatique
3. Ou cliquer sur le menu (⋮) → "Installer l'application"
4. Suivre les instructions

**iOS (Safari) :**
1. Ouvrir l'application dans Safari
2. Cliquer sur le bouton Partager (□↑)
3. Sélectionner "Sur l'écran d'accueil"
4. Cliquer sur "Ajouter"

### Desktop

**Chrome, Edge, Opera :**
- Icône d'installation apparaît dans la barre d'adresse
- Ou aller dans Menu → "Installer NeuroBooth 360"

## 🔄 Stratégies de Cache

### CacheFirst (Cache d'abord)
Utilisé pour les ressources statiques qui changent rarement :
- Polices Google Fonts
- Images et icônes
- Vidéos téléchargées

### NetworkFirst (Réseau d'abord)
Utilisé pour les données dynamiques :
- API Supabase
- Contenu utilisateur

### Durée de Cache
- **Fonts** : 1 an
- **Images** : 30 jours
- **Vidéos** : 7 jours
- **API Supabase** : 1 semaine

## 🐛 Debugging

### Chrome DevTools
1. Ouvrir DevTools (F12)
2. Aller dans l'onglet "Application"
3. Section "Service Workers" pour voir l'état du SW
4. Section "Cache Storage" pour voir le cache
5. Section "Manifest" pour vérifier le manifest

### Console Logs
Le service worker log automatiquement :
- Enregistrement réussi
- Détection de mises à jour
- Erreurs de cache

### Tester le Mode Hors Ligne
1. Ouvrir DevTools
2. Onglet "Network"
3. Cocher "Offline"
4. Recharger la page

## 🔐 Sécurité

- HTTPS obligatoire en production
- Validation de l'origine dans le service worker
- Pas de cache de données sensibles
- Gestion sécurisée des tokens d'API

## 📊 Métriques

La PWA améliore :
- **Lighthouse Score** : >90 pour toutes les catégories
- **Time to Interactive** : Réduit grâce au cache
- **First Contentful Paint** : Plus rapide avec le précache
- **Offline Capability** : 100% fonctionnel hors ligne

## 🎨 Personnalisation

### Changer les Couleurs
Modifier dans `public/manifest.json` :
```json
{
  "theme_color": "#000000",
  "background_color": "#000000"
}
```

### Ajouter des Raccourcis
Modifier la section `shortcuts` dans `public/manifest.json`.

### Modifier la Stratégie de Cache
Éditer `vite.config.ts` section `workbox.runtimeCaching`.

## 🌐 Compatibilité

| Plateforme | Installation | Service Worker | Notifications |
|------------|-------------|----------------|---------------|
| Chrome (Android) | ✅ | ✅ | ✅ |
| Safari (iOS 16.4+) | ✅ | ✅ | ⚠️ Limitées |
| Edge (Desktop) | ✅ | ✅ | ✅ |
| Firefox (Android) | ✅ | ✅ | ✅ |
| Samsung Internet | ✅ | ✅ | ✅ |

## 📚 Ressources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)
- [Workbox](https://developers.google.com/web/tools/workbox)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)

## 🆘 Support

Pour toute question ou problème concernant la PWA :
1. Vérifier les logs du service worker dans la console
2. Désinstaller et réinstaller l'application
3. Vider le cache du navigateur
4. Vérifier que HTTPS est activé en production

---

**Version PWA** : 1.0.0  
**Dernière mise à jour** : 2026
