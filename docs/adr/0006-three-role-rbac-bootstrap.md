# Three-role RBAC with a first-user-becomes-Owner bootstrap

The assignment names two roles (Bibliotekar, Član). We add a third administrative tier — **Owner** — on top, giving `OWNER / LIBRARIAN / MEMBER`. The required two roles are unchanged (Librarian = Bibliotekar, Member = Član); Owner is a superset that can additionally change other users' roles.

Role assignment works by bootstrap: **the first user to register becomes `OWNER`; everyone after is `MEMBER`.** An Owner can promote/demote other users between `LIBRARIAN` and `MEMBER` via `PATCH /users/:id/role`. The `OWNER` role is **never assignable through the API** — it only ever comes from the bootstrap — which closes the obvious privilege-escalation path.

## Considered Options

- **Registration form picks the role** — simplest, but lets anyone self-register as staff and undercuts the point of RBAC.
- **Only the two assignment roles** — no way to provision a librarian without seeding or manual DB edits; the bootstrap turns role management into a demonstrable feature.

## Consequences

- No users are seeded ([ADR-0004](0004-sqlite-uncommitted-db.md)) so that the bootstrap is exercised live: register (→ Owner), register again (→ Member), promote to Librarian.
