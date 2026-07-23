# Library Management

A mobile application for running a library — managing the Book catalog, tracking
Members, and recording Loans and returns — backed by an HTTP API. Access is
governed by role (`OWNER` / `LIBRARIAN` / `MEMBER`). See [`CONTEXT.md`](./CONTEXT.md)
for the domain vocabulary, [`.scratch/library-management/spec.md`](./.scratch/library-management/spec.md)
for the full spec, and [`docs/adr/`](./docs/adr) for the architectural decisions.

> Status: **walking skeleton** (issue 01). The toolchain, the shared-types
> seam, the Drizzle wiring, and the HTTP e2e test seam are all wired end to end;
> no domain features are implemented yet.

## Workspaces

A single [pnpm](https://pnpm.io) + [Turborepo](https://turborepo.dev) monorepo
(ADR-0001):

- **`apps/api`** — [NestJS](https://nestjs.com) HTTP API over
  [Drizzle ORM](https://orm.drizzle.team) + `better-sqlite3` (ADR-0002/0003/0004).
- **`apps/mobile`** — [Expo](https://expo.dev) Router app (React Native Paper),
  runs in Expo Go (ADR-0010).
- **`packages/shared`** — TypeScript single source of truth for the `Role` enum
  and the API contract shapes, imported by both API and mobile.
- **`packages/eslint-config`**, **`packages/typescript-config`** — shared config.

## Prerequisites

- Node.js >= 18 (developed on Node 22)
- pnpm 9 (`corepack enable`)

The repo uses a **hoisted** `node_modules` (`.npmrc` `node-linker=hoisted`) — the
ADR-0001 documented fallback so Expo/Metro reliably resolves React Native under
pnpm.

## Getting started

```sh
pnpm install
```

Run any of these from the repo root; Turborepo fans them out across every
workspace that defines the task:

```sh
pnpm build         # build shared + api
pnpm lint          # eslint across all workspaces
pnpm check-types   # tsc --noEmit across all workspaces
pnpm test          # api e2e suite (supertest against an ephemeral SQLite DB)
```

## API (`apps/api`)

The SQLite database file is **never committed** (`*.db` / `*.sqlite` are
gitignored — ADR-0004); it is reproduced from drizzle-kit migrations that live
in `apps/api/drizzle/`.

```sh
# from apps/api
pnpm db:generate   # regenerate a migration after editing src/db/schema.ts
pnpm db:migrate    # apply migrations to the DATABASE_URL database
pnpm start:dev     # boot the API in watch mode
pnpm test          # run the e2e suite
```

Config via env vars: `DATABASE_URL` (default `library.db`), `PORT` (default `3000`).

## Mobile (`apps/mobile`)

```sh
# from apps/mobile
pnpm start         # start the Expo dev server; open in Expo Go over LAN
```

The API base URL is overridable via `EXPO_PUBLIC_API_URL` (used by later
tickets; the phone and the machine running the API must share a network).
