# 03 — Catalog schema + read API (Authors & Books)

**What to build:** Any authenticated user can browse the Catalog: list and open Books (with their Author and truthful Availability), list and open Authors, filter Books to only those currently available, and find Books or Authors by tokenized search that matches partial, reordered words. Availability is derived on read from Active Loans, never stored.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] `authors` (id, name, bio nullable, birthYear nullable), `books` (id, title, authorId FK→authors RESTRICT, totalCopies default 1, isbn/publishedYear/description nullable), and `loans` (id, bookId FK→books RESTRICT, memberId FK→users RESTRICT, borrowedAt, dueDate, returnedAt nullable) tables all exist with migrations — the `loans` table is created here so Availability is genuinely derived even before lending endpoints exist.
- [ ] A seed script populates **Catalog only** (Authors + Books); **no users are seeded**. Tests use it.
- [ ] `GET /authors` [auth] and `GET /authors/:id` [auth]; list supports tokenized `search` over `name`.
- [ ] `GET /books` [auth] and `GET /books/:id` [auth]; each Book carries derived Availability (`totalCopies − count(active loans)`). List supports tokenized `search` over `title + author name` and an `available` filter (Availability > 0). Book detail exposes Author, Availability, description, publishedYear, ISBN.
- [ ] Tokenized search (ADR-0009): query split on whitespace; every token must appear as a case-insensitive substring of the target, ANDed, order-independent; one escaped `LIKE '%' || :token || '%'` per token with `%`/`_` escaped; empty/absent query → no filter.
- [ ] Read/response DTOs live in `packages/shared`.
- [ ] e2e: `pet petr`, `Petrovic Petar` (reordered), and `eta etro` each return "Petar Petrovic"; a non-matching token excludes it; Availability is computed and reflected in `GET /books`.
