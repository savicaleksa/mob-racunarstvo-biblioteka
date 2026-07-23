# Library Management

A mobile application for running a library: managing the book catalog, tracking members, and recording loans and returns. Access is governed by role. All code, database identifiers, API, and UI copy are in **English** (the domain terms below are the canonical spelling — the Serbian originals from the assignment are listed under `_Avoid_`).

## Language

### Roles

**Member**:
An end user who browses the catalog and views their own current and past loans. The default role for anyone who registers.
_Avoid_: Client, Reader, Patron, User (in domain copy), Član

**Librarian**:
A staff user who manages the catalog (books and authors) and records loans and returns.
_Avoid_: Staff, Admin, Bibliotekar

**Owner**:
The single bootstrap administrator — the first user to register. Can do everything a Librarian can, plus change other users' roles between Librarian and Member. The Owner role is never assignable through the API; it exists only via the first-user bootstrap.
_Avoid_: Superadmin, Root, Administrator

### Catalog

**Author**:
A person who wrote one or more books. Referenced by a Book via foreign key.
_Avoid_: Writer, Autor

**Book**:
A catalog title the library owns, written by one Author. A Book may have several physical copies (see Total Copies); it represents the title, not an individual copy.
_Avoid_: Title, Publication, Knjiga

**Catalog**:
The browseable set of Books. "Available catalog" means Books whose Availability is greater than zero.

**Total Copies**:
The number of physical copies of a Book the library owns. Defaults to 1.

**Availability**:
The number of copies of a Book currently free to borrow, computed as `Total Copies − (count of that Book's Active Loans)`. **Derived on read, never stored** as a column.

### Loans

**Loan**:
A record that a Member has borrowed a Book. Joins a Book and a Member, and carries a borrow date, a due date, and a nullable return date. Retained after return to form loan history.
_Avoid_: Borrowing, Checkout, Rental, Zaduženje

**Issue (a loan)**:
The Librarian action that creates a Loan for a Member. Rejected when the Book has no Availability (Active Loans ≥ Total Copies).
_Avoid_: Lend, Check out, Give

**Return**:
Recording that a borrowed Book has come back, by setting the Loan's return date. Does not delete the Loan.

**Active Loan**:
A Loan that has not yet been returned (`returnedAt IS NULL`). Active Loans are what consume Availability.
_Avoid_: Open loan, Outstanding loan

**Overdue**:
An Active Loan whose Due Date is in the past.

**Due Date**:
When a Loan must be returned. Defaults to the borrow date plus 14 days; a Librarian may override it when issuing.
