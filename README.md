# Library Management

A mobile application for running a library — managing the Book catalog, tracking
Members, and recording Loans and returns — backed by an HTTP API. Access is
governed by role (`OWNER` / `LIBRARIAN` / `MEMBER`). See [`CONTEXT.md`](./CONTEXT.md)
for the domain vocabulary, [`.scratch/library-management/spec.md`](./.scratch/library-management/spec.md)
for the full spec, and [`docs/adr/`](./docs/adr) for the architectural decisions.

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

## Grader quickstart

Four steps from a fresh clone to exercising all three roles on a phone.

```sh
# 1. Prerequisites (below), then install every workspace:
pnpm install

# 2. Recreate the database from migrations + seed it (one command):
pnpm --filter @repo/api db:reset

# 3. Start the API (port 3000) and the Expo dev server together:
pnpm dev

# 4. Open the printed QR code in Expo Go on a phone sharing the same Wi-Fi.
```

Step 2 leaves you with a 100-Book Catalog and one account per role, all sharing
the password `password123`:

| Email                   | Role        | Password      |
| ----------------------- | ----------- | ------------- |
| `owner@example.com`     | `OWNER`     | `password123` |
| `librarian@example.com` | `LIBRARIAN` | `password123` |
| `member@example.com`    | `MEMBER`    | `password123` |

Log in as any of them and follow the [demo flow](#demo-flow-all-three-roles).

## Prerequisites

- **Node.js >= 18** (developed on Node 22).
- **pnpm 9** — `corepack enable` picks up the pinned version.
- **Expo Go** on a physical phone (iOS App Store / Google Play), on the **same
  Wi-Fi** as the machine running the API.

The repo uses a **hoisted** `node_modules` (`.npmrc` `node-linker=hoisted`) — the
ADR-0001 documented fallback so Expo/Metro reliably resolves React Native under
pnpm.

## Database setup — one command

The SQLite database file is **never committed** (`*.db` / `*.sqlite` are
gitignored — ADR-0004); it is reproduced from the drizzle-kit migrations in
`apps/api/drizzle/`. A single command recreates it from scratch:

```sh
pnpm --filter @repo/api db:reset
```

This deletes any existing dev database (cross-platform, via Node `fs` — works on
Windows/macOS/Linux), reapplies every migration, and runs the seed. That is all
a fresh clone needs: no `.env`, no manual migration step, no fixtures to import.

### What the seed contains

Both halves live in [`apps/api/src/db/seed.ts`](./apps/api/src/db/seed.ts):

- **The Catalog** — **100 real Books by 76 real Authors**, from Dostoevsky and
  Austen through Le Guin, Murakami and Harari. Every Book carries a real
  publication year, a one-line description and a Total Copies between 1 and 5;
  `isbn` is filled in only where a widely-circulated edition's ISBN-13 is known
  and left `null` otherwise, rather than invented.
- **Three demo accounts**, one per role, all with the password `password123`:
  `owner@example.com` (`OWNER`), `librarian@example.com` (`LIBRARIAN`) and
  `member@example.com` (`MEMBER`).

Seeding the Owner **claims the first-user bootstrap slot**. Because the users
table is no longer empty, an account registered through the app is a `MEMBER` —
which is what you want for a demo: the three roles are there to log into from the
first launch instead of having to be registered into existence.
[ADR-0012](./docs/adr/0012-seeded-demo-accounts.md) records that decision, which
revises the catalog-only seed of ADR-0004/0006.

> These are demo credentials, published on purpose for a graded demo running over
> HTTP with a default JWT secret. Don't carry them, or this posture, into anything
> deployed.

Re-running is safe: each half is idempotent and skips itself if the Catalog (any
Author) or the users table is already populated, so it never duplicates rows or
overwrites an account you created yourself. To genuinely start over — e.g. after
issuing loans — use `db:reset`, which deletes the file first.

### Lower-level scripts

If you want the steps individually:

```sh
pnpm --filter @repo/api db:generate   # regenerate a migration after editing src/db/schema.ts
pnpm --filter @repo/api db:migrate    # apply migrations to the DATABASE_URL database
pnpm --filter @repo/api db:seed       # seed Catalog + demo users without deleting the DB first
```

`db:seed` and `db:reset` both honour `DATABASE_URL`, so you can seed a database
somewhere other than the default `apps/api/library.db`:

```sh
DATABASE_URL=demo.db pnpm --filter @repo/api db:reset
```

> Migrations are also applied automatically when the API boots (the connection
> factory runs them on connect), so `db:reset` is about starting from a clean,
> Catalog-seeded database — not a prerequisite for the schema to exist.

## Running the API (`apps/api`)

```sh
pnpm --filter @repo/api dev         # boot in watch mode (this app only)
# or, after `pnpm --filter @repo/api build`:
pnpm --filter @repo/api start       # node dist/main.js
```

The API listens on **`http://localhost:3000`** and prints the URL on boot.

Config via env vars:

| Variable       | Default                | Purpose                                    |
| -------------- | ---------------------- | ------------------------------------------ |
| `PORT`         | `3000`                 | Port the API listens on.                   |
| `DATABASE_URL` | `library.db`           | SQLite file path (relative to `apps/api`). |
| `JWT_SECRET`   | `dev-secret-change-me` | HMAC secret for signing JWTs.              |

The defaults are fine for grading — no `.env` file is required.

## Running the mobile app (`apps/mobile`)

```sh
pnpm --filter @repo/mobile dev      # start the Expo dev server (expo start)
```

Scan the QR with Expo Go on a physical phone, or use `pnpm --filter @repo/mobile
android` / `... ios` for an emulator/simulator. The app registers / logs in,
stays signed in across launches (the JWT lives in Expo SecureStore and is
attached to every request), and lands on role-gated screens (`/member`,
`/librarian`, `/owner`). When the token expires or is invalid, a `401` clears
the session and returns you to login.

### Pointing the app at your machine

In development the API base URL **auto-detects the dev machine's LAN IP** from
Expo's manifest (`hostUri`) and targets port `3000`, so a physical phone in Expo
Go on the same network reaches your API with **no configuration**.

Override it with `EXPO_PUBLIC_API_URL` when auto-detect does not fit — a
different host/port, an Android emulator, or a tunnel:

```sh
# Android emulator (host loopback):
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000 pnpm --filter @repo/mobile start

# Explicit LAN IP (e.g. if auto-detect picks the wrong interface):
EXPO_PUBLIC_API_URL=http://192.168.1.23:3000 pnpm --filter @repo/mobile start

# An `expo start --tunnel` session or other host:
EXPO_PUBLIC_API_URL=https://<your-tunnel-host> pnpm --filter @repo/mobile start
```

The phone and the machine running the API must share a network (unless tunneling).

## Demo flow (all three roles)

The seed creates one account per role, so every tier is reachable from the login
screen — all three use the password `password123`:

1. **Log in as `member@example.com` → Member.** It sees only the catalog (100
   Books) and its own loans.
2. **Log in as `librarian@example.com` → Librarian.** It manages the catalog
   (books and authors), issues loans and records returns.
3. **Log in as `owner@example.com` → Owner.** It lands on the Owner **Users**
   screen, which lists every user with their numeric **ID**, and can promote a
   Member to **Librarian** or demote one back. The Owner also reaches the
   Librarian screens via the **"Library management"** button there.

To see role management do something, register a new account from the app: the
seeded users table is not empty, so it comes out a **Member**. Then promote it to
Librarian from the Owner Users screen, and demote it back.

`OWNER` remains **unassignable through the API** — `PATCH /users/:id/role` refuses
it as a target ([ADR-0006](docs/adr/0006-three-role-rbac-bootstrap.md)). The one
Owner comes from the seed writing to the database directly, which is why
[ADR-0012](docs/adr/0012-seeded-demo-accounts.md) records seeding accounts as a
deliberate revision of the original "register your way in" flow.

> Want to watch the bootstrap itself — first registered account becomes the
> Owner? Delete `apps/api/library.db` and start the API without seeding: the
> connection factory applies the migrations on boot, so the first account you
> register into that empty users table is the Owner.

### Issuing a loan — identify the borrower by email

There is no librarian-facing user-list route by design, so in the Librarian
**Issue Loan** flow the borrower is identified by their **email** — the address
they registered with, which at a real counter they would simply tell you.

Type it into **Member email** and tap outside the field: the app checks the
address against the API and shows a ✓ once it resolves to a registered account.
**Issue loan** stays disabled until it does, so an unregistered or mistyped email
cannot be submitted. Editing the field clears the ✓ — leave the field again to
re-check — so the email that gets submitted is always the one that was verified.
Emails are matched case-insensitively and surrounding whitespace is ignored, so
casing does not have to match how the member registered.

Any registered account can borrow, including a Librarian or the Owner. Overdue
Active Loans (past their due date) are flagged by the API and highlighted in the
UI.

See [ADR-0011](docs/adr/0011-librarian-email-lookup.md) for why the check
discloses only whether the email exists, and nothing else about the user.

## Repo-wide scripts

Run from the repo root; Turborepo fans each task out across every workspace that
defines it:

```sh
pnpm build         # build shared + api
pnpm lint          # eslint across all workspaces
pnpm check-types   # tsc --noEmit across all workspaces
pnpm test          # api e2e suite (supertest against an ephemeral SQLite DB)
pnpm dev           # api in watch mode + Expo dev server, side by side
```
