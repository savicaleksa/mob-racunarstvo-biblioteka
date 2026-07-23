# 05 — Book CRUD [librarian+]

**What to build:** A Librarian (or Owner) can add Books to the Catalog, edit their details including Total Copies, and delete Books that have never been lent. Deleting a Book that has any Loan (Active or historical) is blocked so lending history is preserved; a Member cannot reach any of these actions.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] `POST /books` [librarian+] creates a Book with a title, an Author, and Total Copies, optionally ISBN, published year, description.
- [ ] `PATCH /books/:id` [librarian+] edits a Book's details including Total Copies.
- [ ] `DELETE /books/:id` [librarian+] deletes a Book that has never been part of any Loan.
- [ ] Deleting a Book that has any Loan (Active or historical) is blocked (RESTRICT, ADR-0008) and surfaced as a 409-style domain error; the data is left intact.
- [ ] Computed Availability is visible while managing Books (reuses the read API from 03).
- [ ] Request DTOs live in `packages/shared`.
- [ ] e2e: a MEMBER token is rejected (403); deleting a Book with a Loan returns the domain error and leaves data intact.
