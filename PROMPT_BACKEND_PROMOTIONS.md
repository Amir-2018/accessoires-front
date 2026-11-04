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
- Le formulaire frontend associe une promotion à un article via `promotionId` (ou `null` pour retirer la promotion) et attend les articles avec `promotion: { id, slug, title, discountPercent, startDate, endDate } | null`.
- Une promotion peut être associée à plusieurs articles ; un article peut avoir zéro ou une promotion. L’image appartient à l’article, pas à la promotion.
- Les quatre champs du formulaire de promotion sont `title`, `discountPercent`, `startDate` et `endDate`. L’administration affiche toutes les promotions en tableau et propose en plus une case à cocher pour activer/désactiver individuellement une promotion.
- Le `slug` est un identifiant technique généré automatiquement par le backend depuis le titre, rendu unique (ajouter un suffixe en cas de doublon), et utilisé pour les URLs publiques ; l’administrateur ne le saisit pas. Le backend conserve `isActive` (par défaut `true`) pour cette case à cocher, mais ce n’est pas un cinquième champ du formulaire de création.

## Travail demandé

1. Ajouter un modèle Prisma `Promotion` avec un identifiant `cuid`, un slug unique généré depuis le titre, les champs `title`, `discountPercent`, `startDate`, `endDate`, `isActive` (`Boolean @default(true)`), ainsi que `createdAt` et `updatedAt`. Ne pas ajouter d’autres champs de contenu ou d’image. `discountPercent` doit être un entier de 0 à 100. Stocker les dates comme dates MySQL (`@db.Date` si compatible avec la configuration actuelle). Le formulaire envoie `YYYY-MM-DD`; la période est inclusive des deux dates et `endDate` doit être égal ou postérieur à `startDate`.
2. Associer chaque article à zéro ou une promotion via `Article.promotionId` optionnel et une relation Prisma `Promotion.articles` un-à-plusieurs : une promotion peut couvrir plusieurs articles, mais chaque article a au plus une promotion. Le formulaire article envoie `promotionId` ou `null`; `null` doit retirer l’association. Valider que la promotion existe; lors de la désactivation ou suppression, traiter les références proprement (`SetNull` ou mise à jour transactionnelle).
3. Créer `src/routes/promotions.ts` et l’enregistrer dans `src/app.ts`.
4. Fournir ces endpoints :
   - `GET /api/promotions` : liste publique des promotions activées dont la période inclut la date courante, triée de façon stable ; réponse `{ promotions }`.
   - `GET /api/promotions/:slug` : détail d’une promotion activée dont la période inclut la date courante ; réponse `{ promotion }`, sinon 404.
   - `GET /api/promotions/admin` : superviseur uniquement, toutes les promotions (activées, désactivées, à venir, en cours et expirées) pour les tableaux de gestion ; réponse `{ promotions }`, y compris `isActive`.
   - `POST /api/promotions` : superviseur uniquement ; valide `title`, `discountPercent`, `startDate` et `endDate`, laisse `isActive` à `true` par défaut, génère un slug unique côté backend et crée la promotion ; réponse 201 `{ promotion }`.
   - `PATCH /api/promotions/:id` : superviseur uniquement ; accepte les champs de modification et `isActive: boolean` pour la case activer/désactiver. Retourne `{ promotion }`. `DELETE` garde ses erreurs 404/409 cohérentes et ne laisse pas de références invalides.
5. Adapter les routes `POST/PATCH /api/articles` pour accepter `promotionId` optionnel/null. Adapter `GET /api/articles` pour filtrer réellement par slug de promotion et inclure sur chaque article l’objet attendu : `promotion: { id, slug, title, discountPercent, startDate, endDate, isActive } | null`. Garder l’association même si la promotion est désactivée ou hors dates afin que l’administration puisse l’afficher et la retirer ; la boutique et les commandes ne doivent appliquer que les promotions activées et actuellement valides. Garder les filtres et la pagination existants.
6. Dans le catalogue et le détail produit, le frontend barre `Article.prix` puis montre le prix remisé lorsqu’une promotion associée est activée et dans sa période. Le panier applique ces remises par article. Appliquer le pourcentage réel de manière uniforme, notamment pour `15 %` (par exemple `349` devient `296.65` à l’unité), sans branche spéciale réservée à certaines remises. Adapter `src/routes/orders.ts` pour calculer exactement la même règle côté serveur à partir des articles et promotions en base. Valider `promotionSlug` s’il est fourni, mais ne jamais faire confiance à un prix, total ou pourcentage envoyé par le client. Persister les prix/remises appliqués au moment de la commande afin que l’historique ne change pas si l’article ou la promotion est modifié plus tard. Refuser proprement un slug invalide ou un panier qui ne satisfait pas les règles de l’offre.
7. Prévoir une migration Prisma et mettre à jour le seed avec les trois promotions de `app/lib/promotions.ts`, en ne reprenant que `title`, `discountPercent`, `startDate` et `endDate`. Générer un slug technique unique depuis chaque titre et éviter les doublons si le seed est relancé.
8. Les pages publiques frontend consomment les endpoints de liste et de détail. Garder leur contrat compatible avec les quatre champs métier et le slug technique généré : la vitrine affiche le titre, la remise et la période ; `/promotions/[slug]` affiche les mêmes informations et filtre les articles associés.

## Sécurité et qualité

- Toutes les écritures sont réservées au rôle `supervisor` avec les middlewares existants.
- Ne pas ajouter de champ image ni de champs de contenu aux promotions. Les images des articles restent gérées par le contrat Article existant. Valider le titre, le pourcentage, les dates et `isActive` avec Zod ; le client ne transmet pas de slug et le backend le génère de façon stable et unique.
- Valider `startDate <= endDate`, utiliser une règle de fuseau horaire documentée et exclure les promotions désactivées ou hors période des remises et de la vitrine. Une désactivation doit s’appliquer immédiatement aux articles associés et aux commandes.
- Ne pas exposer les erreurs Prisma brutes au client ; préserver le gestionnaire d’erreurs actuel.
- Respecter les transactions pour l’association des articles et la création des commandes.
- Ajouter des tests ciblés pour permissions, validation, filtres, association article/promotion et calcul serveur des remises.
- Terminer par la migration/génération Prisma et vérifier `pnpm build` ainsi que les tests disponibles. Rapporter les fichiers modifiés, le contrat final de l’API et toute étape de migration manuelle requise.

## Diagnostic backend ciblé : remises de 15 % et 50 % non appliquées

Le backend de promotions est déjà implémenté. Ne repars pas du contexte initial ci-dessus et ne réécris pas les routes sans avoir d’abord inspecté leur état actuel. L’incident observé est : une promotion à 70 % fonctionne dans l’interface, mais des promotions à 15 % ou 50 % semblent laisser les prix inchangés.

Le frontend transmet `discountPercent` comme un nombre (`Number(form.discountPercent)`) et applique la même formule pour tout pourcentage positif :

`prixRemisé = arrondi à 3 décimales(prix × (1 - discountPercent / 100))`

Exemples pour un article à 349 DT : 15 % → 296,65 DT ; 50 % → 174,50 DT ; 70 % → 104,70 DT.

Inspecte et corrige la cause dans le backend existant, sans logique spéciale pour une remise donnée :

1. Suis une promotion de bout en bout pour les valeurs 15, 50 et 70 : payload POST/PATCH, valeur stockée en base, réponse des endpoints de promotions, association de l’article et réponse `GET /api/articles` (avec `promotion.discountPercent` numérique, `isActive` et dates correctes).
2. Vérifie que le calcul d’article et le calcul des commandes utilisent tous deux le pourcentage réellement stocké, sans seuil implicite, arrondi prématuré, conversion de type ou branche qui ne fonctionnerait que pour 70. Confirme que le catalogue ne perd pas l’association de promotion et que le panier/checkout applique le même résultat.
3. Vérifie particulièrement l’activation et la période inclusive, ainsi que l’ordre des routes publiques/admin et les champs renvoyés par les serialiseurs. Ne considère pas une remise valide comme active si la base ou la réponse API la renvoie avec une autre valeur.
4. Ajoute des tests de régression aux tests existants : calcul par unité et total de commande pour 15 %, 50 % et 70 % (349 DT, quantités 1 et 2), persistance/relecture de la remise et sérialisation de la réponse article/commande. Les tests doivent échouer si 15 % ou 50 % sont ignorés.
5. Lance les tests backend et le build TypeScript. Rapporte la cause racine exacte, les fichiers modifiés et les réponses API observées avant/après. Si le défaut dépend des données de production, fournis les vérifications SQL/API nécessaires sans modifier ni supprimer des données de production.
