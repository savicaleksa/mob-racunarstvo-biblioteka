# 09 — Mobile Member screens

**What to build:** A Member, on their phone, can browse the Catalog, filter it to only available Books, search Books and Authors by partial/reordered tokens, open a Book to see full details and Availability, and review their own current and past Loans — with Overdue Loans clearly distinguished — each showing the Book and Author. A Member never sees Librarian or Owner functionality.

**Blocked by:** 08, 03, 06

**Status:** ready-for-agent

- [ ] Catalog screen: list of Books with title, Author, and current Availability; an availability filter and a tokenized search box (over Books; Authors searchable too).
- [ ] Book detail screen: Author, Availability, description, published year, ISBN if present.
- [ ] My Loans screen: current (Active) Loans with Due Dates and past (returned) Loans, each showing Book and Author; Overdue Active Loans distinguished from those within their Due Date.
- [ ] The Member cannot navigate to any Librarian or Owner screen (role gating from 08 enforced).
- [ ] Verified manually as a Member through the demo flow.
