# ZEN

ZEN est une application de service client omnicanal : boutique, suivi de commandes, chatbot authentifié, Inbox agent, escalades Supervisor, FAQ et pilotage support.

## Installation

Prérequis : Node.js 20+, pnpm 12+, PostgreSQL accessible.

```bash
pnpm install
cp backend/.env.example backend/.env
```

Renseigner `DATABASE_URL` et `JWT_SECRET` dans `backend/.env`. Les valeurs de `.env.example` sont uniquement des placeholders.

Pour le frontend déployé séparément, définir `NEXT_PUBLIC_API_URL` avant le build avec l’URL publique du backend, par exemple `https://zen-backend.onrender.com`. Cette variable est intégrée au bundle Next.js au moment du build.

Initialiser Prisma et les données de démonstration :

```bash
pnpm --dir backend prisma:generate
pnpm --dir backend prisma:push
pnpm --dir backend prisma:seed
```

Lancer frontend et backend :

```bash
pnpm dev:full
```

- Frontend : `http://localhost:3000`
- API : `http://localhost:4000`

Sur Render, créer deux services :

- Frontend : `pnpm install --frozen-lockfile && pnpm build`, puis `pnpm start`, avec `NEXT_PUBLIC_API_URL` réglée sur l’URL publique backend.
- Backend : `pnpm install --frozen-lockfile && pnpm --dir backend prisma:generate && pnpm --dir backend build`, puis `pnpm --dir backend start`, avec `FRONTEND_URL` réglée sur l’URL publique frontend.

Le build de production génère automatiquement Prisma Client :

```bash
pnpm build
pnpm start
```

## Comptes de démonstration

Le seed crée les comptes locaux suivants :

| Rôle | Email | Mot de passe |
| --- | --- | --- |
| Client | `client@zen.local` | `password123` |
| Agent | `agent@zen.local` | `password123` |
| Supervisor | `oumaima@gmail.com` | `oumaima2026` |

Ces comptes sont réservés au développement et ne doivent jamais être utilisés en production.

## Architecture

```text
app/                  Next.js App Router, écrans et composants client
app/components/       Boutique, Inbox, FAQ, Pilotage et navigation
app/lib/               API frontend, authentification et état local de compatibilité
backend/src/           API Express, middleware, sécurité et routes métier
backend/prisma/        Schéma PostgreSQL et seed de démonstration
examples/              Exports JSON des workflows et données de démonstration
```

Le frontend utilise Next.js/React. Le backend expose une API Express protégée par cookie JWT. Prisma gère PostgreSQL. Les conversations, réponses IA, validations, envois et escalades sont persistés côté backend.

## Choix techniques

- **Next.js App Router** pour les espaces Client, Agent et Supervisor.
- **Express + Prisma** pour séparer les règles métier et l’accès PostgreSQL.
- **Cookie JWT HttpOnly** pour protéger les routes authentifiées.
- **Zod** pour valider les entrées HTTP.
- **FAQ avec recherche pondérée** sur titre, catégorie et contenu ; le provider IA reste optionnel.
- **Réponses IA sous forme de brouillon** : l’agent ou le Supervisor doit valider avant envoi.
- **Données locales de compatibilité** pour certains écrans historiques de boutique ; les conversations support utilisent l’API et les contrôles d’accès backend.

## Workflows et données de démonstration

- [examples/workflows.json](examples/workflows.json) décrit les parcours client, agent, Supervisor et FAQ.
- [examples/demo-data.json](examples/demo-data.json) contient un catalogue, des comptes et des FAQ fictifs, sans commandes ni conversations initiales.
- Le seed exécutable est [backend/prisma/seed.ts](backend/prisma/seed.ts).

## Limites connues

- Le provider IA par défaut est `fallback` et produit des réponses déterministes à partir de la base FAQ.
- Les indicateurs Pilotage dépendent des conversations persistées et restent vides tant qu’aucune conversation n’est créée.
- Les commandes invité sont suivies par référence/token ; elles ne donnent pas accès aux messages privés d’un compte client.
- Les médias du catalogue utilisent des URLs externes Unsplash.
- Aucun système de stockage de fichiers, de notifications temps réel ou de gestion avancée des rôles n’est inclus.
- La disponibilité de PostgreSQL dépend du fournisseur configuré dans `DATABASE_URL`.

## Vérification

```bash
pnpm exec tsc --noEmit
pnpm --dir backend build
pnpm build
```
