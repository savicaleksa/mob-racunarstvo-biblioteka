# Spec: Library Management mobile app + API

Status: ready-for-agent

Vocabulary follows `CONTEXT.md`; architectural decisions follow `docs/adr/0001`–`0010`.

## Problem Statement

A library runs its catalog, membership, and lending on paper or ad-hoc spreadsheets. Staff have no reliable way to know which Books are available, who currently holds what, or what is Overdue; and there is no controlled separation between what staff can do and what an ordinary reader can do. Readers, in turn, have no self-service way to browse what the library holds or to see what they have borrowed and when it is due back.

The people involved:
- A **Member** wants to browse the Catalog from their phone and see their own current and past Loans without asking a staff member.
- A **Librarian** wants to keep the Catalog correct (Books and Authors), lend Books to Members, take them back, and see everything currently out on loan at a glance.
- An **Owner** wants to stand up the system and decide who among the users is trusted staff.

## Solution

A mobile application (Expo, run on a physical phone via Expo Go) backed by an HTTP API (NestJS + Drizzle + SQLite), delivered as a single pnpm + Turborepo monorepo with a shared types package.

Users register and log in; authentication is JWT-based with hashed passwords. The **first** person to register becomes the **Owner**; everyone else becomes a **Member**. The Owner promotes trusted users to **Librarian**. Access to every feature is gated by role:

- **Members** browse the available Catalog, search it, open a Book to see details and Availability, and review their own current and past Loans.
- **Librarians** additionally perform full CRUD on Books and Authors, Issue Loans to Members, record Returns, and view all Active Loans (with Book, Author, Member, and Due Date joined in one view).
- **Owners** can do everything a Librarian can, plus view all users and change any user's role between Librarian and Member.

Availability is always truthful because it is derived from Active Loans rather than stored, and lending history is never destroyed.

## User Stories

### Authentication & onboarding
1. As a new user, I want to register with an email and password, so that I can access the application.
2. As the very first user to register, I want to automatically become the Owner, so that the system has an administrator without any manual database seeding.
3. As a subsequent registrant, I want to be created as a Member by default, so that I get self-service access without being granted staff powers.
4. As a registered user, I want my password stored only as a hash, so that my credentials are not exposed if the data is seen.
5. As a returning user, I want to log in with my email and password and receive a token, so that my session is authenticated.
6. As a logged-in user, I want my token stored securely on the device and attached to my requests automatically, so that I stay signed in without re-entering credentials.
7. As a logged-in user, I want to retrieve my own profile (identity and role), so that the app can show me the correct screens for my role.
8. As a user whose token has expired or is invalid, I want to be redirected to log in again, so that I am never stuck on a broken authenticated screen.
9. As a user, I want to log out, so that my token is cleared from the device.
10. As a user registering with an email that already exists, I want a clear error, so that I know to log in instead.

### Member — Catalog & search
11. As a Member, I want to browse the Catalog of Books, so that I can see what the library holds.
12. As a Member, I want to see each Book's title, Author, and current Availability, so that I know whether it can be borrowed.
13. As a Member, I want to filter the Catalog to only Books that are currently available, so that I do not waste time on Books that are all out on loan.
14. As a Member, I want to search Books by typing tokens that match anywhere in the title or Author name in any order, so that I can find a Book from partial or reordered memory (e.g. "eta etro" finds "Petar Petrovic").
15. As a Member, I want to open a Book to see its full details (Author, Availability, description, published year, ISBN if present), so that I can decide whether I want it.
16. As a Member, I want to search Authors by the same tokenized matching, so that I can find everything by a writer even if I only remember part of their name.

### Member — own Loans
17. As a Member, I want to see my current (Active) Loans with their Due Dates, so that I know what I hold and when to return it.
18. As a Member, I want my Overdue Loans clearly distinguished from those still within their Due Date, so that I know which to prioritise.
19. As a Member, I want to see my past (returned) Loans, so that I have a record of what I have read.
20. As a Member, I want each of my Loans to show the Book and Author, so that the history is meaningful without extra lookups.
21. As a Member, I want to be prevented from accessing any Librarian or Owner functionality, so that the role boundary is enforced.

### Librarian — Author management
22. As a Librarian, I want to create an Author with a name (and optionally a bio and birth year), so that I can attribute Books to them.
23. As a Librarian, I want to edit an Author's details, so that I can correct mistakes.
24. As a Librarian, I want to list and view Authors, so that I can manage the roster.
25. As a Librarian, I want to delete an Author who has no Books, so that I can remove erroneous entries.
26. As a Librarian, I want deletion of an Author who still has Books to be blocked with a clear message, so that I do not orphan or lose catalog data.

### Librarian — Book management
27. As a Librarian, I want to create a Book with a title, an Author, and a number of Total Copies (optionally ISBN, published year, description), so that it appears in the Catalog.
28. As a Librarian, I want to edit a Book's details including its Total Copies, so that the Catalog stays accurate.
29. As a Librarian, I want to delete a Book that has never been part of any Loan, so that I can remove mistakes.
30. As a Librarian, I want deletion of a Book that has any Loan (Active or historical) to be blocked with a clear message, so that lending history is preserved.
31. As a Librarian, I want to see each Book's computed Availability while managing the Catalog, so that I understand its lending state.

### Librarian — lending
32. As a Librarian, I want to Issue a Loan of a Book to a Member, so that the Member can borrow it.
33. As a Librarian, I want a Loan's Due Date to default to 14 days from the borrow date, so that I do not have to set it every time.
34. As a Librarian, I want to override the Due Date when Issuing, so that I can handle special cases.
35. As a Librarian, I want Issuing to be rejected when the Book has no Availability (Active Loans already equal Total Copies), so that I cannot lend a copy that does not exist.
36. As a Librarian, I want to record a Return for an Active Loan, so that the copy becomes available again and the Loan moves into history.
37. As a Librarian, I want to view all Active Loans in one place, each showing Book, Author, Member, and Due Date, so that I can see everything currently out at a glance.
38. As a Librarian, I want Overdue Active Loans surfaced in that view, so that I can follow them up.

### Owner — user & role management
39. As an Owner, I want to view all registered users and their roles, so that I can manage who has access.
40. As an Owner, I want to promote a Member to Librarian, so that I can grant trusted staff their powers.
41. As an Owner, I want to demote a Librarian back to Member, so that I can revoke staff powers.
42. As an Owner, I want to be unable to grant the Owner role to anyone through the app, so that the administrator identity cannot be escalated to.
43. As an Owner, I want to do everything a Librarian can do, so that I can operate the library directly as well as administer it.

### Cross-cutting
44. As any user, I want all text and labels in English, so that the interface is consistent.
45. As a grader cloning the repository, I want the database recreated from migrations and a Catalog seed with a single command, so that the app runs without a committed database file.
46. As a grader, I want documented instructions for the first-user/promote demo flow and for pointing the app at my machine's IP, so that I can exercise all three roles on a physical phone.

## Implementation Decisions

### Monorepo & shared types (ADR-0001)
- pnpm + Turborepo. Workspaces: `apps/api` (NestJS), `apps/mobile` (Expo), `packages/shared` (TypeScript types).
- `packages/shared` is the single source of truth for the `Role` enum, request/response DTOs, and API contract shapes; both API and mobile import it so a shape change breaks compilation on both sides.
- The existing create-turbo placeholder apps (`apps/web`, `apps/docs`) are removed and replaced by `apps/api` and `apps/mobile`. Placeholder `packages/eslint-config` and `packages/typescript-config` may be reused.

### Backend framework & data layer (ADR-0002, ADR-0003, ADR-0004)
- NestJS with `class-validator` DTOs and a global validation pipe.
- Drizzle ORM over `better-sqlite3`; schema defined in TypeScript; migrations via drizzle-kit. A small hand-written Drizzle provider module wires the client into Nest DI.
- SQLite database file is gitignored (`*.db` / `*.sqlite`) and reproduced from migrations. A seed script populates **Catalog only** (Authors + Books); **no users are seeded**.
- Referential integrity: foreign keys are `RESTRICT` on delete (ADR-0008). Delete attempts on referenced Authors/Books return a 409-style domain error surfaced to the client, not a cascade.

### Schema
- `users`: id, email (unique under `COLLATE NOCASE`; trimmed + lowercased on every write, ADR-0011), passwordHash, role (`OWNER | LIBRARIAN | MEMBER`), createdAt.
- `authors`: id, name, bio (nullable), birthYear (nullable).
- `books`: id, title, authorId (FK → authors, RESTRICT), totalCopies (default 1), isbn (nullable), publishedYear (nullable), description (nullable).
- `loans`: id, bookId (FK → books, RESTRICT), memberId (FK → users, RESTRICT — resolved from the member's email at Issue, ADR-0011), borrowedAt, dueDate, returnedAt (nullable).
- Invariants: **Active Loan** = `returnedAt IS NULL`; **Overdue** = Active AND `dueDate < now`.

### Availability (ADR-0007)
- Availability is **derived on read**: `totalCopies − count(active loans for that book)`. There is no stored availability column.
- Issue is permitted only while `count(active loans) < totalCopies`; otherwise rejected.

### Authentication & authorization (ADR-0005, ADR-0006)
- Passwords hashed with `bcryptjs`. Login/register return a **single JWT access token** (~7-day expiry, payload `{ sub, role }`). No refresh tokens.
- First-user bootstrap: registration assigns `OWNER` when the users table is empty, otherwise `MEMBER`.
- RBAC via a role guard + decorator. Route access:
  - Public: register, login.
  - Any authenticated: read Catalog/Books/Authors, own profile, own Loans.
  - Librarian+ (Librarian or Owner): Book/Author CRUD, Issue Loan, Return, view Active Loans.
  - Owner only: list users, change a user's role.
- `PATCH /users/:id/role` accepts only `LIBRARIAN` or `MEMBER`. `OWNER` is never accepted as a target role.

### API contract (routes, guard in brackets)
- `POST /auth/register` [public] → `{ token, user }`
- `POST /auth/login` [public] → `{ token, user }`
- `GET /auth/me` [auth] → `{ user }`
- `GET /users` [owner] → users list
- `GET /users/lookup?email=` [librarian+] → `{ exists }` — whether an email is registered, and nothing more; always 200 (ADR-0011)
- `PATCH /users/:id/role` [owner] → updated user; body `{ role: LIBRARIAN | MEMBER }`
- `GET /authors` [auth] (supports tokenized `search`) · `GET /authors/:id` [auth]
- `POST /authors` · `PATCH /authors/:id` · `DELETE /authors/:id` [librarian+]
- `GET /books` [auth] (supports `search` and an `available` filter, availability computed) · `GET /books/:id` [auth]
- `POST /books` · `PATCH /books/:id` · `DELETE /books/:id` [librarian+]
- `GET /loans/active` [librarian+] → the showcase JOIN: each row carries Book, Author, Member, Due Date; Overdue flagged
- `POST /loans` [librarian+] → Issue; body `{ bookId, memberEmail, dueDate? }`; rejects when no Availability, or when no account has that email (ADR-0011)
- `PATCH /loans/:id/return` [librarian+] → sets returnedAt
- `GET /loans/me` [member/auth] → own Active + historical Loans, each with Book and Author

### Tokenized search (ADR-0009)
- Query split on whitespace into tokens; **every** token must appear as a case-insensitive substring of the target; ANDed; order-independent. Books match over `title + author name`; Authors over `name`.
- Implemented as one escaped `LIKE '%' || :token || '%'` per token (escape `%` and `_` in user input). Empty/absent query → no filter.

### Mobile app (ADR-0010)
- Expo Router with role-gated route groups; TanStack Query for server state; axios instance with a request interceptor attaching the JWT from SecureStore and a response interceptor redirecting to login on 401; React Context holding the authenticated user/token hydrated from SecureStore on launch; React Native Paper for UI. Plain controlled inputs for forms.
- Runs in Expo Go (no custom native modules) on a physical phone over LAN.
- API base URL auto-detects the dev machine's LAN IP in development, overridable via `EXPO_PUBLIC_API_URL`.
- Screens: Login, Register; Member (Catalog + availability filter + search, Book detail, My Loans current/history); Librarian (Book CRUD, Author CRUD, Issue Loan, Active Loans + Return); Owner (all Librarian screens + Users list with role change).

## Testing Decisions

- **What a good test asserts here:** external behavior observed at the HTTP boundary — status codes, response bodies, and DB-observable outcomes of a request — never internal service methods, private helpers, or Drizzle query construction. A test should survive an internal refactor that keeps the API contract stable.
- **Single seam:** the NestJS HTTP API, exercised end-to-end with supertest against the built Nest application, backed by a **real but ephemeral SQLite database** (fresh `:memory:` or temp file per suite), migrated and seeded before each run. This one seam covers every behavior-rich requirement; no separate unit tests of internal services.
- **Modules/behaviors under test:**
  - Auth: register issues a token; first registrant is `OWNER`, second is `MEMBER`; duplicate email rejected; login succeeds/fails correctly; `/auth/me` reflects role.
  - RBAC: a MEMBER token is rejected (403) from librarian+ and owner routes; a LIBRARIAN token is rejected from owner routes; role change is owner-only and refuses `OWNER` as a target.
  - Availability & lending: Issue decrements Availability as observed via `GET /books`; Issue is rejected at `activeLoans === totalCopies`; Return restores Availability and moves the Loan to history; `GET /loans/me` shows Active vs returned correctly.
  - Active-loans JOIN: `GET /loans/active` returns Book, Author, Member, and Due Date together, and only for Active Loans.
  - Tokenized search: `pet petr`, `Petrovic Petar` (reordered), and `eta etro` each return "Petar Petrovic"; a non-matching token excludes it.
  - RESTRICT deletes: deleting a referenced Author or Book returns the domain error and leaves data intact.
- **Prior art:** none in-repo yet (greenfield). Follow the standard NestJS e2e pattern (`Test.createTestingModule` → `app.init()` → supertest against `app.getHttpServer()`); this establishes the prior art for later tickets.
- **Mobile:** no automated tests. Verified manually through the documented demo flow.

## Out of Scope

- Automated testing of the mobile UI (component, snapshot, or Detox/E2E).
- Refresh tokens, password reset, email verification, account deletion.
- Typo-tolerant / edit-distance fuzzy search (only reorder + substring tokens are supported).
- Reservations/holds/waitlists, fines or fees, renewals, notifications/reminders.
- Multiple libraries/branches, per-copy tracking (a Book tracks a count, not individual physical copies).
- Pagination/infinite scroll of the Catalog, sorting options beyond a sensible default.
- Soft deletes / archiving.
- Production deployment, hosting, CI/CD; a client-server DBMS (SQLite is deliberate).
- Committing the database file to git.

## Further Notes

- Optional stretches, explicitly deferred: Overdue highlighting in the Member view, dark mode toggle, pull-to-refresh. (Overdue is computed and returned by the API regardless; the stretch is only its visual treatment.)
- Grading/demo flow to document in the README: register (→ Owner), register a second account (→ Member), promote it to Librarian to demonstrate all three tiers and role management; run migrations + Catalog seed; set `EXPO_PUBLIC_API_URL` (or rely on LAN auto-detect) and open in Expo Go on a phone sharing the network.
- The active-loans JOIN is the assignment's required "more complex" multi-table query; keep it an explicit, readable Drizzle join.
- pnpm isolated `node_modules` + Expo caveat: if Metro fails to resolve React Native, fall back to `.npmrc` `node-linker=hoisted` (noted in ADR-0001).
