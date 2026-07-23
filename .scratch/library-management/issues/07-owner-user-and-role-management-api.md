# 07 — Owner user & role management API

**What to build:** An Owner can view all registered users and their roles and change any user's role between Librarian and Member, so they can grant and revoke staff powers. The Owner role can never be granted through the app. These routes are Owner-only, which also proves the role guard rejects Members and Librarians.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] `GET /users` [owner] lists all users with their roles.
- [ ] `PATCH /users/:id/role` [owner] changes a user's role; body `{ role: LIBRARIAN | MEMBER }`. `OWNER` is never accepted as a target role.
- [ ] Request/response DTOs live in `packages/shared`.
- [ ] e2e: a MEMBER token is rejected (403) and a LIBRARIAN token is rejected (403) from these owner-only routes; an Owner can promote a Member to Librarian and demote a Librarian to Member; `OWNER` as a target role is refused.
