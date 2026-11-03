# Prompt backend : gestion des promotions

Tu travailles dans le backend existant `e:\ouou-back` de ZEN. Implémente la persistance et l’API des promotions en respectant les conventions déjà utilisées par le projet. Ne pars pas d’un backend neuf.

## Contexte à vérifier

- Stack actuelle : Express 5, TypeScript ESM, Prisma 6 et MySQL.
- Les routes sont enregistrées dans `src/app.ts` et utilisent `zod`, `asyncHandler`, `authenticate` et `requireRoles`.
- Il n’existe actuellement ni modèle Prisma ni route `/api/promotions`.
- `Article` ne stocke actuellement aucune promotion.
- `GET /api/articles` ignore le paramètre `promotion`, alors que la boutique appelle déjà `/api/articles?promotion=<slug>`.
- Le checkout transmet `promotionSlug`, mais `src/routes/orders.ts` ne le valide pas et calcule les commandes sans remise.
- L’écran superviseur frontend attend `GET /api/promotions/admin` sous la forme `{ promotions: [...] }`, `POST /api/promotions` et `PATCH /api/promotions/:id` sous la forme `{ promotion: ... }`, ainsi que `DELETE /api/promotions/:id` avec réponse 204.
- Le formulaire frontend associe une promotion à un article via `promotionId` et attend les articles avec `promotion: { id, slug, title, discountPercent, startDate, endDate, isActive } | null`.
- Les champs de promotion utilisés par le frontend sont : `slug`, `discountPercent`, `badge`, `kicker`, `title`, `description`, `image`, `imageAlt`, `detailTitle`, `detailDescription`, `highlights`, `startDate`, `endDate` et `isActive`.
- L’image de promotion est choisie depuis l’ordinateur (PNG, JPG/JPEG, WebP ou GIF, maximum 6 Mo), lue côté navigateur puis envoyée dans le JSON `image` comme data URL base64 (`data:image/<mime>;base64,...`). En modification, si aucune nouvelle image n’est choisie, le frontend renvoie l’image existante.

## Travail demandé

1. Ajouter un modèle Prisma `Promotion` avec un identifiant `cuid`, un slug unique, tous les champs ci-dessus, `isActive` par défaut à `true`, ainsi que `createdAt` et `updatedAt`. `discountPercent` doit être un entier de 0 à 100. Stocker `highlights` dans un champ JSON MySQL et le valider comme tableau de chaînes non vides. Stocker `image` dans une colonne adaptée aux images encodées (par exemple `String @db.LongText`, cohérent avec `Article.image`). Stocker `startDate` et `endDate` comme dates MySQL (`@db.Date` si compatible avec la configuration actuelle). Le formulaire envoie `YYYY-MM-DD`; la période est inclusive des deux dates et `endDate` doit être égal ou postérieur à `startDate`.
2. Associer chaque article à zéro ou une promotion via `Article.promotionId` optionnel et une relation Prisma `Promotion.articles`. Le formulaire article envoie `promotionId` ou `null`. Valider que la promotion existe; lors de la désactivation ou suppression, traiter les références proprement (`SetNull` ou mise à jour transactionnelle). Si le produit exige plusieurs promotions par article, arrêter et proposer une évolution du contrat frontend au lieu d’implémenter silencieusement une relation différente.
3. Créer `src/routes/promotions.ts` et l’enregistrer dans `src/app.ts`.
4. Fournir ces endpoints :
   - `GET /api/promotions` : liste publique des promotions actives à la date courante, triée de façon stable ; réponse `{ promotions }`.
   - `GET /api/promotions/:slug` : détail d’une promotion active dont la date courante est comprise entre début et fin inclus ; réponse `{ promotion }`, sinon 404.
   - `GET /api/promotions/admin` : superviseur uniquement, toutes les promotions (actives, programmées, expirées et désactivées) pour l’écran de gestion ; réponse `{ promotions }`.
   - `POST /api/promotions` : superviseur uniquement ; valide tous les champs du formulaire et crée la promotion ; réponse 201 `{ promotion }`.
   - `PATCH /api/promotions/:id` et `DELETE /api/promotions/:id` : superviseur uniquement, validation Zod, erreurs 404/409 cohérentes. Empêcher la suppression de laisser des références invalides.
5. Adapter les routes `POST/PATCH /api/articles` pour accepter `promotionId` optionnel/null. Adapter `GET /api/articles` pour filtrer réellement par slug de promotion et inclure sur chaque article l’objet attendu : `promotion: { id, slug, title, discountPercent, startDate, endDate, isActive } | null`. Ne joindre une promotion désactivée ou hors période que si nécessaire à l’écran admin; la boutique ne doit appliquer que les promotions actives et valides en date. Garder les filtres et la pagination existants.
6. Dans le catalogue et le détail produit, le frontend barre `Article.prix` puis montre le prix remisé lorsqu’une promotion associée est active et dans sa période. Le panier applique ces remises par article. Adapter `src/routes/orders.ts` pour calculer exactement la même règle côté serveur à partir des articles et promotions en base. Valider `promotionSlug` s’il est fourni, mais ne jamais faire confiance à un prix, total ou pourcentage envoyé par le client. Persister les prix/remises appliqués au moment de la commande afin que l’historique ne change pas si l’article ou la promotion est modifié plus tard. Refuser proprement un slug invalide ou un panier qui ne satisfait pas les règles de l’offre.
7. Prévoir une migration Prisma et mettre à jour le seed avec les trois promotions actuellement dans `app/lib/promotions.ts` : `details-qui-changent-tout`, `eclat-au-quotidien` et `sac-ideal`. Donner aux offres seedées des périodes de validité explicites et éviter les doublons si le seed est relancé.
8. Les pages publiques frontend utilisent encore des données statiques. Les connecter à l’API pour charger la liste et le détail, y compris les métadonnées et le rendu de `/promotions/[slug]`. Le contrat doit rester compatible avec l’écran superviseur et le sélecteur d’article déjà ajoutés.

## Sécurité et qualité

- Toutes les écritures sont réservées au rôle `supervisor` avec les middlewares existants.
- Valider les images reçues : n’accepter que les data URLs base64 PNG, JPEG, WebP ou GIF, vérifier la syntaxe et la taille décodée (6 Mo maximum), rejeter tout type ou contenu invalide, et ne jamais interpréter les données comme un chemin local arbitraire. Sur modification sans nouvelle image, conserver l’image existante. Valider aussi les longueurs de texte, le slug et le pourcentage avec Zod.
- Valider `startDate <= endDate`, calculer l’état en utilisant une règle de fuseau horaire documentée, et exclure les promotions hors période des remises et de la vitrine.
- Ne pas exposer les erreurs Prisma brutes au client ; préserver le gestionnaire d’erreurs actuel.
- Respecter les transactions pour l’association des articles et la création des commandes.
- Ajouter des tests ciblés pour permissions, validation, filtres, association article/promotion et calcul serveur des remises.
- Terminer par la migration/génération Prisma et vérifier `pnpm build` ainsi que les tests disponibles. Rapporter les fichiers modifiés, le contrat final de l’API et toute étape de migration manuelle requise.
