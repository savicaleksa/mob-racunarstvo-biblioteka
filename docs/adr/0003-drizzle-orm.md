# Drizzle ORM over Prisma/TypeORM

We use **Drizzle** as the data layer instead of the more common NestJS pairings. A future reader expecting Prisma or `@nestjs/typeorm` should know this was deliberate: the rubric explicitly rewards a visible multi-table JOIN and a relational schema with foreign keys, and Drizzle's query builder writes those as explicit, type-safe SQL (`.innerJoin(...)`) rather than hiding them behind an ORM abstraction. The schema is plain TypeScript with no code-generation step.

## Considered Options

- **Prisma** — best hand-holding and biggest community, but abstracts SQL away; the showcase JOIN would need `$queryRaw` to be made visible.
- **TypeORM** — the "official" Nest companion, but more footguns (relation config, `synchronize` vs migrations) and still less SQL-transparent than Drizzle.

## Consequences

- No official NestJS Drizzle module — a small hand-written `DrizzleModule` provider wires the `better-sqlite3` client into DI. Accepted as a one-time cost.
