# 01 — Monorepo scaffold & e2e test harness

**What to build:** The walking skeleton for the whole system. A developer can clone the repo, install with pnpm, and run `build` / `lint` / `check-types` / the API e2e suite across every workspace, plus open the mobile app in Expo Go and see a placeholder screen. Nothing is functional yet — this proves the toolchain, the shared-types seam, the Drizzle wiring, and the HTTP test seam all work end to end.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The create-turbo placeholder apps `apps/web` and `apps/docs` are removed (ADR-0001). `packages/eslint-config` and `packages/typescript-config` may be reused.
- [ ] `packages/shared` exists as a TypeScript package and is the single source of truth for the `Role` enum (`OWNER | LIBRARIAN | MEMBER`) and a DTO/contract barrel that both API and mobile import.
- [ ] `apps/api` is a booting NestJS app with a global validation pipe, a hand-written Drizzle provider module wiring `better-sqlite3` into Nest DI, and drizzle-kit configured for migrations.
- [ ] `apps/api` has a supertest e2e harness (`Test.createTestingModule` → `app.init()` → supertest against `app.getHttpServer()`) backed by a fresh ephemeral SQLite DB (`:memory:` or temp file) migrated before each run, with one trivial health-check test passing. This establishes the prior art for later e2e tickets.
- [ ] `apps/mobile` is a booting Expo Router app (React Native Paper available) that opens in Expo Go on a physical phone and renders a placeholder screen; no custom native modules.
- [ ] All three workspaces are wired into Turborepo so `build`, `lint`, and `check-types` run across the monorepo; `*.db` / `*.sqlite` are gitignored.
