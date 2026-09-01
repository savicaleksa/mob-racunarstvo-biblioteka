# SQLite via better-sqlite3, database not committed, reproduced from migrations + seed

The relational store is **SQLite** through the `better-sqlite3` driver: a single file, no server process, so the project clones and runs on any machine with no external services — the highest-value property for a graded demo. It fully supports the required foreign keys and the active-loans JOIN.

The `.db` file is **not committed to git**. The schema is reproduced from drizzle-kit migrations, and a **seed** populates demo data.

> **Revised by [ADR-0012](0012-seeded-demo-accounts.md).** This ADR originally specified a _catalog-only_ seed (authors + books, no users), so that the first-user-becomes-Owner bootstrap ([ADR-0006](0006-three-role-rbac-bootstrap.md)) would be the live demo path. The seed now also creates one demo account per role; the bootstrap code is unchanged, but its slot is taken by the seeded Owner.

## Consequences

- The database is only reproducible if migrations and the seed script are kept current — they are first-class deliverables, not afterthoughts.
- `*.db` / `*.sqlite` must be added to `.gitignore`.
- Because Drizzle sits behind the data layer, switching to Postgres later is a config/dialect change, not a rewrite.
