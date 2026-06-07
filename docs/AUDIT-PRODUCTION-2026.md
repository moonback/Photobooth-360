# Audit professionnel NeuroBooth 360 — production 2026

Date d'audit : 2026-06-07
Stack auditée : React 19, TypeScript, Vite, Tailwind CSS 4, Supabase, PWA, Web Serial/WebUSB, MediaRecorder, FFmpeg WASM.

## Synthèse exécutive

L'application dispose déjà d'une base fonctionnelle avancée : capture caméra, MediaRecorder, galerie locale/cloud, écran public, PWA, Supabase Storage, analytics, email capture, ESP32/Web Serial et WebUSB. Les risques principaux constatés avant correction étaient : compilation TypeScript non fiable, absence d'Error Boundary global, bundle principal trop volumineux, service worker sans fallback offline de navigation, intervalle PWA non maîtrisé, types Web Serial/WebUSB absents, logs de debug trop verbeux, et sécurité HTTP insuffisamment durcie côté déploiement.

Après correction, le build de production est découpé en chunks dédiés, la compilation TypeScript passe en mode strict, la PWA inclut une page offline navigable, l'application est protégée par un Error Boundary global, les headers de sécurité Vercel sont renforcés, et les APIs Supabase sont encapsulées par un client typé non-nullable.

## Score estimé

| Domaine | Avant audit | Après corrections appliquées | Commentaire |
| --- | ---: | ---: | --- |
| Stabilité critique | 72/100 | 90/100 | TypeScript strict, Error Boundary, cleanup recorder/PWA. |
| Performance bundle | 68/100 | 88/100 | Le chunk initial de 572 kB a été remplacé par des chunks ciblés ; le plus gros vendor restant est React à 213 kB. |
| PWA | 78/100 | 92/100 | Fallback offline, assets offline précachés, stratégies cache existantes conservées. |
| Accessibilité | 78/100 | 84/100 | Focus visible et ARIA déjà présents ; Error Boundary accessible ajouté. Reste un audit manuel clavier complet. |
| Sécurité | 60/100 | 82/100 | CSP, Permissions-Policy, COOP/COEP, client Supabase sûr. RLS Supabase reste à durcir avec auth/admin. |
| Architecture | 65/100 | 78/100 | Début de structure `app/`, `shared/`, `types/`. Refactor feature-based complet à planifier par lots. |

## Findings classés

### Critique

1. **Compilation TypeScript non fiable** : `npm run lint` échouait à cause des types `SerialPort` / `USBDevice` absents et de la fonction Edge Supabase Deno incluse dans le `tsconfig`. Correction : types matériels Web Serial/WebUSB ajoutés et `supabase/functions` exclu du build navigateur.
2. **Absence d'Error Boundary global** : une exception React pouvait faire tomber l'expérience kiosque entière. Correction : Error Boundary global avec écran de reprise accessible.
3. **Sécurité HTTP insuffisante** : pas de CSP, Permissions-Policy, COOP/COEP de production dans `vercel.json`. Correction : headers durcis tout en conservant camera, micro, USB, serial et FFmpeg WASM.
4. **Bundle initial trop lourd** : build initial avec chunk principal de 572 kB minifié. Correction : lazy routes et chunks manuels React, Motion, Supabase, FFmpeg, JSZip.
5. **RLS Supabase permissive dans le SQL d'installation** : `email_captures` et `event_settings` sont lisibles/modifiables publiquement dans `supabase/setup.sql`. Non corrigé automatiquement pour ne pas casser le dashboard anonyme existant ; recommandation : ajouter authentification admin + policies par rôle avant mise en production publique.

### Majeur

1. **Service worker / navigation SPA** : `offline.html` ne doit pas être utilisé comme `navigateFallback`, sinon le service worker peut servir l'écran hors-ligne malgré une connexion active. Correction : `offline.html` reste précaché, mais le fallback de navigation pointe vers `index.html`.
2. **Intervalle PWA sans garde** : l'enregistrement du service worker pouvait créer plusieurs timers d'update. Correction : timer module-level unique et update seulement si l'onglet est visible.
3. **MediaRecorder sans cleanup unmount** : timers et enregistrement pouvaient rester actifs au démontage. Correction : clear timers et arrêt du recorder au cleanup.
4. **Supabase nullable propagé** : plusieurs modules appelaient `supabase` sans narrowing TypeScript. Correction : `getSupabaseClient()` centralise le contrôle.
5. **Logs de debug caméra/app en production** : risque de bruit console et exposition d'informations techniques. Correction partielle : logger partagé silencieux en production pour debug/info.
6. **Architecture encore trop centrée composants racine** : `App.tsx`, `GalleryPage.tsx`, `SharePage.tsx`, `useMotor.ts`, `videoComposer.ts` restent volumineux. Recommandation : migration progressive vers `features/capture`, `features/gallery`, `features/kiosk`, `features/motor`, `features/sharing`, `features/settings`.

### Mineur

1. **`any` résiduels** : quelques types analytics/email/camera diagnostic restent à spécialiser.
2. **CSS global très large** : styles premium et safe areas existent, mais le design system gagnerait à extraire tokens et composants primitives.
3. **Tests absents** : tentative d'installation Vitest/Playwright bloquée par la registry npm avec HTTP 403. Les scripts de tests doivent être ajoutés dès que l'accès registry est restauré.
4. **Supabase Storage public** : adapté au partage photobooth, mais nécessite des chemins non devinables, quotas, nettoyage automatique et rate limiting.
5. **Lighthouse réel non mesuré** : le contexte ne fournit pas Chromium/audit Lighthouse lancé contre serveur preview. Les scores ci-dessus sont estimés d'après build et inspection statique.

## Architecture cible recommandée

Structure cible :

```text
src/
  app/                 # bootstrap, routes, providers, fallbacks
  features/
    capture/           # caméra, recorder, playback, CTA
    gallery/           # galerie locale/cloud, export zip
    kiosk/             # guard, PIN, plein écran
    motor/             # Web Serial/WebUSB ESP32
    sharing/           # QR, email, pages publiques
    settings/          # panneaux paramètres et persistence
  shared/
    components/        # ErrorBoundary, primitives UI, navigation
    hooks/             # hooks transverses
    lib/               # clients externes typés
    utils/             # logger, formatters, guards
  types/               # déclarations navigateur et modèles partagés
```

Les dossiers `app/`, `shared/` et `types/` ont été initialisés. La migration complète doit rester incrémentale pour préserver la logique métier existante.

## Correctifs appliqués

- Ajout d'un Error Boundary global et d'un fallback de route Suspense.
- Lazy loading des pages `/`, `/gallery`, `/share/:id`, `/ecran`.
- Chunks manuels Vite pour React, Motion, Supabase, JSZip et FFmpeg.
- Configuration PWA renforcée avec `offline.html` précaché et fallback de navigation maintenu sur l'app shell `index.html`.
- TypeScript strict activé pour l'application navigateur, avec exclusion des Edge Functions Deno.
- Types Web Serial/WebUSB ajoutés pour ESP32.
- Logger partagé ajouté pour limiter les logs debug/info en production.
- Cleanup MediaRecorder/timers ajouté.
- Timer PWA d'update rendu unique et conditionné à la visibilité de l'onglet.
- Supabase encapsulé dans `getSupabaseClient()` pour éviter les accès nullable.
- Headers Vercel renforcés : CSP, COOP, COEP, Referrer-Policy, Permissions-Policy, X-Content-Type-Options.

## Tests et vérifications réalisés

- `npm run lint` : passe après correction ; correspond à `tsc --noEmit`.
- `npm run build` : passe ; build PWA généré avec chunks manuels.
- `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom playwright` : bloqué par la registry npm avec HTTP 403.
- `npm install -D vitest` : bloqué par la registry npm avec HTTP 403.

## Plan de suite recommandé

1. Ajouter auth admin Supabase, puis remplacer les policies publiques de `email_captures` et `event_settings`.
2. Migrer les modules volumineux vers `features/*` par vertical slices avec tests de non-régression.
3. Ajouter Vitest + React Testing Library + Playwright dès que la registry npm est disponible.
4. Lancer Lighthouse réel en preview HTTPS avec caméra simulée et service worker actif.
5. Ajouter monitoring Sentry/LogRocket via providers optionnels et DSN env-only.
6. Ajouter quotas Storage, lifecycle cleanup et compression vidéo adaptative.
