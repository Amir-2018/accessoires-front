# Prompt backend — tableau de bord commercial superviseur

À exécuter dans le dépôt backend existant `E:\ouou-back` de ZEN. Implémente le contrat consommé par le frontend dans `E:\ouou-front`. Commence par inspecter le backend actuel (schéma, commandes, clients, articles, promotions, authentification, conventions de routes, fuseau horaire et tests) ; adapte-toi à son architecture et ne pars pas d’un backend neuf.

## Contexte frontend

- L’espace superviseur ouvre maintenant le tableau de bord et charge `GET /api/dashboard/overview?period=30d` via `apiFetch`.
- Les périodes admises par le frontend sont `7d`, `30d` et `90d`.
- L’écran utilise les montants dans la devise déjà affichée par le frontend (`DT`), et expose : montant et nombre de commandes, panier moyen, total/nouveaux clients, articles au catalogue, articles à stock faible ou épuisé, promotions actives, évolution quotidienne, répartition des commandes par statut, articles les plus vendus et commandes récentes.
- Le seuil visuel de stock faible est fixé à 1–5 unités ; le stock épuisé correspond à 0.
- Les statuts connus sont `en-attente`, `validee`, `expediee` et `livree`.

## Endpoint à implémenter

Ajouter `GET /api/dashboard/overview` et l’enregistrer selon les conventions existantes.

- Réserver l’accès au rôle `supervisor`, avec les middlewares d’authentification/autorisation existants.
- Valider `period` avec Zod ou l’outil standard du projet ; accepter seulement `7d`, `30d`, `90d`. En cas de valeur invalide, répondre avec l’erreur de validation standard, sans remplacer silencieusement la période.
- Calculer une période de calendrier cohérente dans le fuseau horaire déjà configuré par le backend. Pour `7d`, inclure aujourd’hui et les six jours précédents ; même règle pour `30d` et `90d`. Inclure la date de début et la date du jour ; utiliser des bornes temporelles non ambiguës (`début inclus, lendemain de la fin exclu`) pour les requêtes. Documenter brièvement la règle choisie.
- Répondre directement avec l’objet ci-dessous, sans enveloppe supplémentaire : c’est la forme attendue par le frontend.
- Renvoyer les compteurs à zéro, les tableaux vides et les jours sans commande également, afin que le frontend puisse afficher un état vide normal.
- Éviter de charger toutes les commandes en mémoire pour les agréger ; utiliser les agrégations et requêtes ciblées adaptées à la base existante. Les résultats doivent être cohérents avec une même période et des données persistées côté serveur.

Contrat JSON attendu :

```json
{
  "period": {
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD"
  },
  "metrics": {
    "orderCount": 0,
    "orderAmount": 0,
    "averageOrderAmount": 0,
    "clientCount": 0,
    "newClientCount": 0,
    "articleCount": 0,
    "lowStockCount": 0,
    "outOfStockCount": 0,
    "activePromotionCount": 0
  },
  "ordersByStatus": [
    { "status": "en-attente", "count": 0 },
    { "status": "validee", "count": 0 },
    { "status": "expediee", "count": 0 },
    { "status": "livree", "count": 0 }
  ],
  "dailySales": [
    { "date": "YYYY-MM-DD", "orderCount": 0, "amount": 0 }
  ],
  "topArticles": [
    { "id": "article-id", "nom": "Nom de l’article", "quantity": 0, "amount": 0 }
  ],
  "recentOrders": [
    {
      "id": "order-id",
      "clientNom": "Nom du client",
      "total": 0,
      "status": "en-attente",
      "createdAt": "ISO-8601"
    }
  ]
}
```

## Règles de calcul

1. `orderCount` et `orderAmount` portent sur les commandes créées dans la période, tous statuts connus confondus. `orderAmount` est la somme des totaux réellement enregistrés pour ces commandes, remise déjà appliquée si elle existe. Le frontend l’étiquette « Montant des commandes » et non « chiffre d’affaires encaissé ».
2. `averageOrderAmount = orderAmount / orderCount`, arrondi selon les conventions monétaires du projet ; retourner `0` si aucune commande.
3. `clientCount` est le nombre total de comptes clients ; `newClientCount` compte les comptes créés dans la période.
4. `articleCount` compte les articles du catalogue. `lowStockCount` compte les articles dont le stock est strictement supérieur à 0 et inférieur ou égal à 5 ; `outOfStockCount` compte ceux dont le stock vaut 0. Ne pas compter deux fois une rupture dans le stock faible.
5. `activePromotionCount` compte les promotions activées dont la période de validité inclut la date actuelle, selon les règles de fuseau horaire utilisées par les endpoints de promotions existants.
6. `ordersByStatus` contient toujours les quatre statuts dans l’ordre du contrat, y compris les statuts à zéro ; appliquer la période sélectionnée.
7. `dailySales` contient une entrée pour chaque jour de la période, dans l’ordre chronologique. Les jours sans commande ont `orderCount: 0` et `amount: 0`. Les bornes quotidiennes doivent utiliser le fuseau horaire métier choisi.
8. `topArticles` contient au plus cinq articles triés par quantité vendue décroissante, puis montant décroissant et nom/identifiant de manière stable. Agréger à partir des lignes de commandes conservées en base (pas des prix actuels des articles) ; `amount` est la somme des montants historiques facturés pour ces lignes.
9. `recentOrders` contient au plus cinq commandes, tous statuts, triées par date de création décroissante puis identifiant de manière stable. Inclure uniquement les champs du contrat ; ne pas exposer les données personnelles non nécessaires.
10. Utiliser les totaux et lignes de commande historiques persistés. Ne pas recalculer les anciens montants avec le prix courant d’un article ou une promotion modifiée après la commande.

## Qualité et vérifications

- Suivre les conventions de réponses d’erreur et de validation du backend ; ne pas exposer d’erreur SQL/ORM brute.
- Vérifier les permissions (non authentifié, rôle non autorisé, superviseur), les trois périodes, la période vide, les jours sans vente, les agrégats par statut, les seuils de stock (0, 1, 5, 6), les promotions expirées/désactivées, le tri stable et l’arrondi du panier moyen.
- Réutiliser les modèles/types et helpers existants. Si le backend ne persiste pas encore les commandes, les clients ou les lignes de commande nécessaires, signaler précisément ce blocage et proposer les changements minimaux compatibles avec ses routes actuelles ; ne pas inventer de chiffres ni lire des données frontend/localStorage.
- L’écran « Commandes » du frontend utilise actuellement un stockage local dans `app/lib/store.ts`, alors que le tableau de bord doit agréger les données du backend. Vérifier les routes de commande existantes et signaler toute divergence de source de vérité ; ne pas déclarer les indicateurs cohérents si les commandes ne sont pas persistées dans la même source.
- Ajouter des tests ciblés et exécuter les vérifications disponibles du backend. Rapporter les fichiers modifiés, le contrat effectif, le fuseau horaire retenu, les commandes de test exécutées et toute migration requise.
