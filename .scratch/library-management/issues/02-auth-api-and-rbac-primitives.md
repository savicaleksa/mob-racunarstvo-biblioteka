# 02 — Auth API + RBAC primitives

**What to build:** A person can register and log in over HTTP and receive a JWT, and the app can fetch their own profile to learn their role. The very first registrant becomes the Owner with no manual seeding; everyone after is a Member. The role-guard machinery that later routes depend on is put in place here and proven on the profile route.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] `users` table (id, email unique, passwordHash, role, createdAt) with a migration.
- [ ] `POST /auth/register` [public] hashes the password with `bcryptjs`, assigns `OWNER` when the users table is empty and `MEMBER` otherwise, and returns `{ token, user }` with a single JWT access token (~7-day expiry, payload `{ sub, role }`).
- [ ] `POST /auth/login` [public] verifies email + password and returns `{ token, user }`; wrong credentials are rejected.
- [ ] `GET /auth/me` [auth] returns `{ user }` (identity + role) for the bearer of a valid token.
- [ ] Registering with an already-registered email returns a clear error.
- [ ] A JWT auth guard plus a role guard + decorator exist; `/auth/me` is protected by the auth guard as the proving ground for the RBAC primitives later tickets reuse.
- [ ] Auth request/response DTOs live in `packages/shared`.
- [ ] e2e: register issues a token; first registrant is `OWNER`, second is `MEMBER`; duplicate email rejected; login succeeds and fails correctly; `/auth/me` reflects role.
