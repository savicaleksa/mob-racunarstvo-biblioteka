# A Loan names its borrower by email, confirmed through a librarian-only existence lookup

Issuing a Loan takes the borrower's **email** (`POST /loans` `{ bookId, memberEmail, dueDate? }`), not their numeric user id. The API resolves that email to a `users.id` and stores the id, as before — the `loans.member_id` foreign key is unchanged.

The id was unusable in practice. `GET /users` is Owner-only ([ADR-0006](0006-three-role-rbac-bootstrap.md)), so a Librarian has **no route that lists users** and therefore no way to discover the number the form was asking for. An email, by contrast, is something the member at the counter can simply say out loud.

The cost of that swap is that a typo no longer fails loudly — a mistyped id was very likely to hit no row, but a mistyped email is just as likely to hit no row *while looking perfectly plausible on screen*. So the Librarian gets a way to check before committing: **`GET /users/lookup?email=…`**, librarian-or-Owner, answering `200 { exists: boolean }` and nothing else. The mobile Issue Loan form calls it when the email field loses focus and keeps the submit button disabled until it answers `true`.

Three properties of that endpoint are deliberate:

- **It returns a bare boolean.** Not the id, not the role, not the registration date. The Librarian needs to know the address resolves to somebody; anything more would hand them the read on the user table that `GET /users` deliberately reserves for the Owner. It is also all the form can use — there is no `name` column on `users`, so richer output could not have confirmed *which person* it is anyway, only that somebody is there.
- **It always answers 200, including for `false`.** "That email is not registered" is a successful answer to a valid question. Encoding it as a 404 would land it in TanStack Query's `isError` beside genuine failures — offline, expired token — and a client that got that discrimination wrong would tell a Librarian "no such member" when the real problem was that the server was unreachable. That is a lie at exactly the wrong moment. A malformed address is still a 400: *that is not an email* and *that email is not registered* are different answers, and the form renders them differently.
- **Any registered user may borrow, whatever their role.** The lookup does not filter on `role = MEMBER`. Staff read books too, and `GET /loans/me` has always been open to every authenticated caller. Filtering would also force the boolean to lie — a Librarian typing the Owner's address would be told no account exists when one plainly does.

## Emails are normalised

Because an email is now an identifier that two different people type into two different screens, it needs one canonical form. Every DTO carrying an email (register, login, lookup, issue) trims and lowercases it before validation, and `users.email` is unique under `COLLATE NOCASE` rather than SQLite's default BINARY collation.

Normalising alone would have been enough while every write path remembers to do it; the NOCASE index is the backstop that keeps the invariant true if one ever forgets, and it makes a case-variant duplicate account impossible rather than merely unlikely. Without it, `Ana@x.com` and `ana@x.com` could both register, and an email would no longer identify one account.

The migration lowercases existing rows before rebuilding the index, and it has to: every lookup compares with SQLite's default BINARY collation against an already-lowercased input, so a row left as `Ana@x.com` would be unreachable — that member could no longer log in, and the Librarian's check would report them unregistered. If a database somehow already holds two addresses differing only in case, creating the NOCASE index fails and the migration aborts rather than silently discarding one of them; that is a data problem a person has to settle.

## The trade-off we accepted

`AuthService.login` deliberately returns the same 401 for an unknown email and a wrong password, *"so the response cannot be used to probe which emails are registered."* This endpoint answers precisely that question. That is a real inconsistency and it is chosen, not overlooked.

The alternatives were worse for this system. Widening `GET /users` to librarian+ so the form could offer a member picker would remove typos entirely, but discloses **every** user's email and role to every Librarian — far more than confirming one address that was handed over in person. Leaving the check out and letting the issue attempt fail turns a preventable mistake into a submit-time error, which is what the form exists to avoid.

What remains is that a compromised or malicious Librarian account can enumerate registered emails, at whatever rate the network allows — the API has no rate limiting. We accepted this rather than adding `@nestjs/throttler`: the disclosure already requires a privileged token, and a hostile Librarian is a larger problem than the email list they could extract. Throttling would also give the on-blur check a 429 failure mode that a fast-working Librarian could hit legitimately.

## Consequences

- The wire contract is **breaking**: `IssueLoanRequest.memberId` is gone. With `forbidNonWhitelisted: true` on the global `ValidationPipe`, a caller still sending `memberId` gets a hard 400 rather than silently issuing a Loan to nobody — so `@repo/shared`, the API, and the mobile app must ship together.
- `UsersController` no longer carries a class-level `@Roles(OWNER)`; each route declares its own, since they no longer share one allow-list. `list` and `updateRole` stay Owner-only.
- Email enters the domain as an identifier, not just a credential. Anything that would let a user change their email must now consider the Loans that were issued against it — the stored FK is an id, so existing Loans survive, but a member's old address stops resolving.
