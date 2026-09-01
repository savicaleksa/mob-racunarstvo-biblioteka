# 10 — Mobile Librarian screens

**What to build:** A Librarian, on their phone, can keep the Catalog correct and run lending: full CRUD on Authors and Books (seeing each Book's computed Availability), Issue a Loan to a Member with a defaulted-but-overridable Due Date, record Returns, and view all Active Loans in one place — Book, Author, Member, and Due Date together, with Overdue surfaced for follow-up.

**Blocked by:** 08, 04, 05, 06

**Status:** ready-for-agent

- [ ] Author management screens: list/view, create, edit, delete — with the RESTRICT-delete error shown clearly when the Author still has Books.
- [ ] Book management screens: list/view (with computed Availability), create, edit (including Total Copies), delete — with the RESTRICT-delete error shown clearly when the Book has any Loan.
- [ ] Issue Loan screen: pick a Book and a Member; Due Date defaults to 14 days and can be overridden; Issuing a Book with no Availability is rejected with a clear message.
- [ ] Active Loans screen: every Active Loan showing Book, Author, Member, and Due Date, with Overdue surfaced; record a Return from here.
- [ ] Verified manually as a Librarian through the demo flow.

## Comments

**Amended — the Issue Loan screen identifies the member by email (ADR-0011).**

"pick a Book and a Member" above is now: pick a Book, and type the member's
**email**. There is no librarian-accessible user list to pick from, so the screen
checks the address instead — on blur it calls `GET /users/lookup`, and **Issue
loan** stays disabled until that confirms the email is registered. Editing the
field clears the confirmation, so the email submitted is always the one checked.

Three states are kept distinct on purpose: *not registered*, *could not check*
(the request failed — the email may be fine), and *confirmed*.
