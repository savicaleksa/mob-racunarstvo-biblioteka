# 04 — Author CRUD [librarian+]

**What to build:** A Librarian (or Owner) can create, edit, and delete Authors so the roster stays correct. Deleting an Author who still has Books is blocked with a clear message so catalog data is never orphaned; a Member cannot reach any of these actions.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] `POST /authors` [librarian+] creates an Author with a name and optional bio and birth year.
- [ ] `PATCH /authors/:id` [librarian+] edits an Author's details.
- [ ] `DELETE /authors/:id` [librarian+] deletes an Author who has no Books.
- [ ] Deleting an Author who still has Books is blocked (RESTRICT, ADR-0008) and surfaced as a 409-style domain error, not a cascade; the data is left intact.
- [ ] Request DTOs live in `packages/shared`.
- [ ] e2e: a MEMBER token is rejected (403) from these routes; deleting a referenced Author returns the domain error and leaves the Author and its Books intact.
