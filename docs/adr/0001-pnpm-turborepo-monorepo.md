# pnpm + Turborepo monorepo with a shared types package

The assignment requires one monorepo housing a Node backend and an Expo mobile app. We use **pnpm workspaces** orchestrated by **Turborepo**, laid out as `apps/api` (NestJS), `apps/mobile` (Expo), and `packages/shared` for TypeScript types imported by both sides. The shared package is what makes the monorepo earn its keep: the `Role` enum, DTOs, and API response contracts are defined once, so a shape change is a compile error on both the API and the app.

## Considered Options

- **npm workspaces** — zero extra install for a grader, but pnpm was requested and is more efficient for a workspace.
- **Nx** — heavier and more enterprise than a school project needs.

## Consequences

- pnpm's isolated `node_modules` is only trouble-free on Expo SDK 54+. If Metro ever fails to resolve React Native, the documented fallback is an `.npmrc` with `node-linker=hoisted`.
