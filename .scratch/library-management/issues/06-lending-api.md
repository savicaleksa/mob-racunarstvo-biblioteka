# 06 — Lending API

**What to build:** A Librarian (or Owner) can Issue a Loan of a Book to a Member, record a Return, and see everything currently out on loan at a glance with Book, Author, Member, and Due Date joined into one view (Overdue flagged). A Member can see their own current and past Loans. Issuing is rejected when the Book has no Availability; Returning frees a copy and moves the Loan into history without destroying it.

**Blocked by:** 03, 05

**Status:** ready-for-agent

- [ ] `POST /loans` [librarian+] Issues a Loan; body `{ bookId, memberId, dueDate? }`. Due Date defaults to borrow date + 14 days and may be overridden. Rejected when `count(active loans) === totalCopies`.
- [ ] `PATCH /loans/:id/return` [librarian+] sets `returnedAt`, restoring Availability and moving the Loan to history.
- [ ] `GET /loans/active` [librarian+] returns the showcase JOIN: each Active Loan row carries Book, Author, Member, and Due Date, with Overdue flagged. Keep it an explicit, readable Drizzle join (the assignment's required multi-table query).
- [ ] `GET /loans/me` [auth/member] returns the caller's own Active + historical Loans, each with Book and Author, Overdue distinguished for Active ones.
- [ ] Loan request/response DTOs live in `packages/shared`.
- [ ] e2e: Issue decrements Availability as observed via `GET /books`; Issue is rejected at `activeLoans === totalCopies`; Return restores Availability and moves the Loan to history; `GET /loans/active` returns Book/Author/Member/Due Date together and only for Active Loans; `GET /loans/me` shows Active vs returned correctly.
