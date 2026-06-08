
# Guide de contribution — NeuroBooth 360

Merci de contribuer à NeuroBooth 360 ! 🎉

## Prérequis pour contribuer

Avant de commencer, assurez-vous d'avoir installé :

- Node.js 18+
- npm ou yarn
- Un compte Supabase (pour tester les fonctionnalités cloud (optionnel)
- Git

## Workflow Git

1. **Forkez le dépôt
2. Clonez votre fork localement
3. Créez une branche de feature : `git checkout -b feature/nom-de-la-feature`
4. Effectuez vos modifications
5. Commitez avec des messages conformes à Conventional Commits
6. Poussez votre branche sur votre fork
7. Ouvrez une Pull Request vers le dépôt principal

## Conventional Commits

Nous utilisons la spécification Conventional Commits pour nos messages de commit :

```
<type>(<scope>): <description>

<optional body>

<optional footer>
```

### Types autorisés

- `feat` : Nouvelle fonctionnalité
- `fix` : Correction de bug
- `docs` : Mise à jour de la documentation
- `style` : Modifications de formatage (espacement, points virgules, etc.
- `refactor` : Refactorisation du code sans modifier le comportement
- `perf` : Amélioration des performances
- `test` : Ajout ou modification de tests
- `chore` : Mise à jour des dépendances, scripts de build, etc.

### Exemples

```
feat: add slow-motion feature
fix(motor): fix WebSerial connection timeout
docs: update README with new setup steps
```

## Standards de code

### Généraux

- Utilisez TypeScript strict (pas de `any`
- Évitez les fonctions trop longues
- Commentez seulement quand nécessaire
- Utilisez des noms de variables et de fonctions explicites
- Respectez le principe Single Responsibility

### React

- Utilisez des composants fonctionnels avec Hooks
- Préférez `useCallback` et `useMemo` pour optimiser les performances
- Évitez les effets de bord dans le render
- Utilisez TypeScript pour typer props et state

### Style

Nous utilisons Tailwind CSS 4 pour le styling
- Respectez les conventions Tailwind existantes
- Évitez le CSS inline

## Configuration dupliqué
## Comment lancer les tests

À ce jour, nous n'avons pas de tests automatisés (bientôt !). Pour l'instant, testez manuellement :

- `npm run dev` et vérifiez que tout fonctionne correctement
- `npm run lint` pour vérifier les erreurs TypeScript
- `npm run build` pour vérifier que le build fonctionne

## Processus de review

1. Votre Pull Request sera revue par un mainteneur
2. Vous devrez peut-être apporter des modifications
3. Une fois approuvée, votre Pull Request sera fusionnée

## Code de conduite

- Soyez respectueux envers les autres contributeurs
- Évitez les commentaires offensants ou désobligeants
- Acceptez les critiques constructives
- Aidez les nouveaux contributeurs

## Licence

En contribuant, vous acceptez que vos modifications soient publiées sous la licence MIT (voir fichier LICENSE).

## Besoin d'aide ?

Si vous avez des questions, n'hésitez pas à ouvrir une Issue !
