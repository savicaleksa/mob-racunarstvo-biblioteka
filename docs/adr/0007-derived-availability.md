# Book availability is derived, never stored

A Book carries a `totalCopies` count (default 1). Its **Availability is computed on read** as `totalCopies − count(active loans for that book)` — there is no `availableCopies` column. The obvious alternative (a mutable counter decremented on issue and incremented on return) can drift out of sync with the loans table whenever a code path forgets to update it; deriving from the Active Loans that already exist makes availability correct by construction, with the single source of truth being the `loans` table.

A loan is issued only while `active loans < totalCopies`.

## Consequences

- Catalog and issue-eligibility queries carry a small aggregation (count of active loans) rather than reading a column. Acceptable at this scale, and it pairs naturally with the showcase JOIN.
