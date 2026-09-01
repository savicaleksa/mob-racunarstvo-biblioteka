# 07 — Owner user & role management API

**What to build:** An Owner can view all registered users and their roles and change any user's role between Librarian and Member, so they can grant and revoke staff powers. The Owner role can never be granted through the app. These routes are Owner-only, which also proves the role guard rejects Members and Librarians.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] `GET /users` [owner] lists all users with their roles.
- [ ] `PATCH /users/:id/role` [owner] changes a user's role; body `{ role: LIBRARIAN | MEMBER }`. `OWNER` is never accepted as a target role.
- [ ] Request/response DTOs live in `packages/shared`.
- [ ] e2e: a MEMBER token is rejected (403) and a LIBRARIAN token is rejected (403) from these owner-only routes; an Owner can promote a Member to Librarian and demote a Librarian to Member; `OWNER` as a target role is refused.

## Comments

**Amended — one librarian+ route was added here (ADR-0011).**

`GET /users/lookup?email=` answers `{ exists: boolean }` for a Librarian or the
Owner, so a Librarian can confirm a member's email before issuing a Loan
(ticket 06). It discloses nothing else — no id, no role, no `createdAt` — and
always returns 200, including for `false`.

`GET /users` and `PATCH /users/:id/role` remain Owner-only, so this ticket's
403-for-LIBRARIAN acceptance criteria still hold as written; `UsersController`
just declares `@Roles` per route now instead of once on the class.
