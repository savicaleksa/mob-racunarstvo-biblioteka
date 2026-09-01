# Seeded demo accounts, one per role

The seed creates **three accounts — `owner@example.com`, `librarian@example.com`, `member@example.com`, all with the password `password123`** — alongside the Catalog. This **revises the "no users are seeded" clause** of [ADR-0004](0004-sqlite-uncommitted-db.md) and [ADR-0006](0006-three-role-rbac-bootstrap.md).

Those ADRs left the users table empty so the first-user-becomes-Owner bootstrap would be the live demo path: register (→ Owner), register again (→ Member), promote to Librarian. In practice that makes the _shortest_ path to seeing the app — open it and log in — the one path that does not exist, and it puts a four-step setup ritual in front of every reviewer before any role-gated screen can be reached. Reproducibility argues the same way: an account that comes from the seed is identical on every machine, where a registered one depends on what the last person typed.

The bootstrap itself is **unchanged code** — `AuthService.register` still promotes the first account in an empty users table. Seeding simply means that slot is already taken, so accounts registered from the app come out `MEMBER`, which is the useful default for a demo anyway. Deleting the database file and booting without the seed still exercises the bootstrap live.

## Considered Options

- **Keep the catalog-only seed** — preserves ADR-0004/0006 as written, at the cost of no way to log in on a fresh clone without a registration ritual first.
- **Seed only a Librarian and Member, register the Owner** — still forces the ritual for the one role that governs the others, and leaves the Owner's credentials machine-specific.
- **A separate `db:seed:users` script** — an extra command to document and forget; the fresh-clone story is worth more than the granularity.

## Consequences

- The `OWNER` role is still **never assignable through the API** — `PATCH /users/:id/role` refuses it as a target, unchanged from ADR-0006. The seed writes to the database directly, which is a different surface with different trust; the escalation path the ADR closed stays closed.
- The seed's two halves stay separate functions (`seedCatalog` / `seedDemoUsers`) because the e2e suite seeds only the Catalog: its tests register their own users and several depend on the bootstrap firing into an empty table.
- Demo credentials are public in the README by design. This is a graded demo over HTTP with a default JWT secret; it is not a deployment posture, and nothing here should be reused as one.
- Seeded users make the seed idempotency rule matter more: `seedDemoUsers` skips entirely when _any_ user exists, so it can never overwrite a real account or collide with the unique email index.
