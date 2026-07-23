import type { AssignableRole, Role } from "./roles";

/**
 * Shared HTTP contract shapes — the single source of truth imported by both
 * `apps/api` and `apps/mobile`, so a change to a shape is a compile error on
 * both sides (ADR-0001).
 *
 * Issue 01 (the walking skeleton) only wires up the health-check contract.
 * Later tickets extend this barrel with the auth, catalog, and lending shapes
 * described in `spec.md`; the types below sketch that seam without adding any
 * behaviour.
 */

/** Response of `GET /health` — the trivial liveness probe. */
export interface HealthResponse {
  status: "ok";
  /** ISO-8601 timestamp of when the response was produced. */
  timestamp: string;
}

/**
 * A user as exposed over the API. The password hash is never serialised —
 * it is deliberately absent from this shape, which is the only user
 * representation that crosses the HTTP boundary.
 */
export interface ApiUser {
  id: number;
  email: string;
  role: Role;
  /** ISO-8601 timestamp of when the account was created. */
  createdAt: string;
}

/**
 * Decoded JWT access-token payload (ADR-0005). `sub` is the user id and `role`
 * is their role at issue time; the token carries nothing else. Both `apps/api`
 * (signing/verifying) and `apps/mobile` (decoding for UI hints) rely on it.
 */
export interface JwtPayload {
  /** Subject — the authenticated user's id. */
  sub: number;
  role: Role;
}

/** Body of `POST /auth/register` [public]. */
export interface RegisterRequest {
  email: string;
  password: string;
}

/** Body of `POST /auth/login` [public]. */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Response of `POST /auth/register` and `POST /auth/login`: a single JWT access
 * token (ADR-0005) plus the authenticated user's public profile.
 */
export interface AuthResponse {
  token: string;
  user: ApiUser;
}

/** Response of `GET /auth/me` [auth] — the caller's own profile. */
export interface MeResponse {
  user: ApiUser;
}

/**
 * An Author as exposed over the API (Catalog read surface, issue 03). Mirrors
 * the `authors` table minus nothing — every column is public. `bio` and
 * `birthYear` are nullable. Reused by Author CRUD (ticket 04) and embedded in
 * {@link ApiBook}.
 */
export interface ApiAuthor {
  id: number;
  name: string;
  /** Free-text biography, or `null` when unknown. */
  bio: string | null;
  /** Year of birth, or `null` when unknown. */
  birthYear: number | null;
}

/**
 * A Book as exposed over the API (Catalog read surface, issue 03). Carries its
 * {@link ApiAuthor} inline and its **derived Availability** — computed on read
 * as `totalCopies − count(active loans)` (ADR-0007), never stored. The same
 * shape is used for both the list (`GET /books`) and detail (`GET /books/:id`)
 * responses; every field the detail view needs (Author, Availability,
 * description, publishedYear, ISBN) is always present. Reused by Book CRUD
 * (ticket 05) and the lending views (ticket 06).
 */
export interface ApiBook {
  id: number;
  title: string;
  /** The Book's single Author, joined in. */
  author: ApiAuthor;
  /** Number of physical copies the library owns (defaults to 1). */
  totalCopies: number;
  /** Derived on read: `totalCopies − count(active loans)`. Never stored. */
  availability: number;
  /** ISBN, or `null` when unknown. */
  isbn: string | null;
  /** Year of publication, or `null` when unknown. */
  publishedYear: number | null;
  /** Free-text description, or `null` when unknown. */
  description: string | null;
}

/**
 * Query parameters for `GET /authors` [auth]. `search` is a tokenized query
 * (ADR-0009) matched over the Author `name`; absent/empty means no filter.
 */
export interface ListAuthorsQuery {
  search?: string;
}

/** Response of `GET /authors` [auth] — the (optionally filtered) Author list. */
export type AuthorsListResponse = ApiAuthor[];

/** Response of `GET /authors/:id` [auth] — one Author. */
export type AuthorDetailResponse = ApiAuthor;

/**
 * Body of `POST /authors` [librarian+] (Author CRUD, issue 04). `name` is
 * required; `bio` and `birthYear` are optional and default to `null` when
 * omitted, mirroring their nullable columns.
 */
export interface CreateAuthorRequest {
  name: string;
  /** Free-text biography; `null`/omitted when unknown. */
  bio?: string | null;
  /** Year of birth; `null`/omitted when unknown. */
  birthYear?: number | null;
}

/**
 * Body of `PATCH /authors/:id` [librarian+] (Author CRUD, issue 04). Every
 * field is optional — only the keys present are updated; `bio` and `birthYear`
 * may be set to `null` to clear them.
 */
export type UpdateAuthorRequest = Partial<CreateAuthorRequest>;

/** Response of `POST /authors` [librarian+] — the created Author. */
export type CreateAuthorResponse = ApiAuthor;

/** Response of `PATCH /authors/:id` [librarian+] — the updated Author. */
export type UpdateAuthorResponse = ApiAuthor;

/**
 * Query parameters for `GET /books` [auth]. `search` is a tokenized query
 * (ADR-0009) matched over `title + author name`; `available`, when true,
 * restricts the list to Books whose Availability is greater than zero.
 */
export interface ListBooksQuery {
  search?: string;
  available?: boolean;
}

/** Response of `GET /books` [auth] — the (optionally filtered) Book list. */
export type BooksListResponse = ApiBook[];

/** Response of `GET /books/:id` [auth] — one Book with Author + Availability. */
export type BookDetailResponse = ApiBook;

/**
 * Body of `POST /books` [librarian+] (Book CRUD, issue 05). `title` and
 * `authorId` are required — `authorId` must reference an existing Author or the
 * request is rejected with a clean domain error (never a raw 500). `totalCopies`
 * is optional and defaults to 1 (the Total Copies column default); `isbn`,
 * `publishedYear` and `description` are optional (nullable) and default to
 * `null` when omitted. Availability is never accepted here — it is derived on
 * read (ADR-0007).
 */
export interface CreateBookRequest {
  title: string;
  /** The Author this Book is by; must reference an existing Author. */
  authorId: number;
  /** Number of physical copies the library owns; defaults to 1 when omitted. */
  totalCopies?: number;
  /** ISBN; `null`/omitted when unknown. */
  isbn?: string | null;
  /** Year of publication; `null`/omitted when unknown. */
  publishedYear?: number | null;
  /** Free-text description; `null`/omitted when unknown. */
  description?: string | null;
}

/**
 * Body of `PATCH /books/:id` [librarian+] (Book CRUD, issue 05). Every field is
 * optional — only the keys present are updated, including `totalCopies`. A
 * present `authorId` must still reference an existing Author; `isbn`,
 * `publishedYear` and `description` may be set to `null` to clear them.
 */
export type UpdateBookRequest = Partial<CreateBookRequest>;

/** Response of `POST /books` [librarian+] — the created Book (Author + derived Availability). */
export type CreateBookResponse = ApiBook;

/** Response of `PATCH /books/:id` [librarian+] — the updated Book (Author + derived Availability). */
export type UpdateBookResponse = ApiBook;

/**
 * A Book as embedded in a Loan row (Lending, issue 06): its title and its
 * {@link ApiAuthor} joined in, so a Loan is meaningful without a second lookup.
 * Deliberately omits derived Availability — a Loan view is about who holds what,
 * not the Catalog's free-copy count — so the showcase JOIN stays a clean
 * loans→books→authors→users join with no correlated availability subquery.
 */
export interface LoanBook {
  id: number;
  title: string;
  /** The Book's single Author, joined in. */
  author: ApiAuthor;
}

/**
 * The borrowing Member as embedded in a Loan row (Lending, issue 06). Only the
 * fields a Librarian needs to identify who holds a Book — never the password
 * hash. Used by the Active Loans view (`GET /loans/active`).
 */
export interface LoanMember {
  id: number;
  email: string;
}

/**
 * Body of `POST /loans` [librarian+] (Lending, issue 06). Issues a Loan of a
 * Book to a Member. `bookId` and `memberId` must reference an existing Book and
 * an existing user (validated in the service — a clean domain error, never a raw
 * 500). `dueDate` is optional: when omitted the Loan's Due Date defaults to the
 * borrow date plus 14 days; when present (an ISO-8601 date-time) it overrides
 * that default. Issuing is rejected when the Book has no Availability
 * (`count(active loans) === totalCopies`, ADR-0007).
 */
export interface IssueLoanRequest {
  bookId: number;
  memberId: number;
  /** ISO-8601 Due Date override; defaults to borrow date + 14 days when omitted. */
  dueDate?: string;
}

/**
 * One row of the Active Loans view (`GET /loans/active` [librarian+], issue 06):
 * the showcase multi-table JOIN. Each row carries the borrowed {@link LoanBook}
 * (with its Author), the borrowing {@link LoanMember}, the Due Date, and an
 * `overdue` flag (Active AND `dueDate < now`). Only Active Loans
 * (`returnedAt IS NULL`) appear. Rendered by the Librarian Active Loans screen
 * (ticket 10).
 */
export interface ActiveLoanRow {
  id: number;
  book: LoanBook;
  member: LoanMember;
  /** ISO-8601 borrow date. */
  borrowedAt: string;
  /** ISO-8601 Due Date. */
  dueDate: string;
  /** True when this Active Loan's Due Date is in the past. */
  overdue: boolean;
}

/** Response of `GET /loans/active` [librarian+] — the Active Loans showcase JOIN. */
export type ActiveLoansResponse = ActiveLoanRow[];

/** Response of `POST /loans` [librarian+] — the freshly issued (Active) Loan. */
export type IssueLoanResponse = ActiveLoanRow;

/** Response of `PATCH /loans/:id/return` [librarian+] — the recorded Return. */
export interface ReturnLoanResponse {
  id: number;
  /** ISO-8601 timestamp the Loan was returned at. */
  returnedAt: string;
}

/**
 * One of the caller's own Loans (`GET /loans/me` [auth], issue 06): each carries
 * its {@link LoanBook} (with Author). Active Loans have `returnedAt: null` and
 * an `overdue` flag; historical (returned) Loans carry their `returnedAt` and
 * are never `overdue`. Rendered by the Member My Loans screen (ticket 09).
 */
export interface MyLoan {
  id: number;
  book: LoanBook;
  /** ISO-8601 borrow date. */
  borrowedAt: string;
  /** ISO-8601 Due Date. */
  dueDate: string;
  /** ISO-8601 return date, or `null` while the Loan is still Active. */
  returnedAt: string | null;
  /** True when this Loan is Active (not returned) AND its Due Date is in the past. */
  overdue: boolean;
}

/** Response of `GET /loans/me` [auth] — the caller's own Active + historical Loans. */
export type MyLoansResponse = MyLoan[];

/**
 * Response of `GET /users` [owner] (Owner user & role management, issue 07): the
 * full roster of registered users, each as the public {@link ApiUser} shape
 * (`id`, `email`, `role`, `createdAt`) — the password hash is never included.
 * An Owner reads this to see who holds which role; rendered by the Owner Users
 * screen (ticket 11).
 */
export type UsersListResponse = ApiUser[];

/**
 * Body of `PATCH /users/:id/role` [owner] (Owner user & role management, issue
 * 07). Changes a user's role. `role` is constrained to {@link AssignableRole}
 * (`LIBRARIAN | MEMBER`) — `OWNER` is deliberately not a member of the type, so
 * it can never be requested as a target (the API validates against
 * `ASSIGNABLE_ROLES` and rejects `OWNER` with a 400). The bootstrap Owner is the
 * only source of the `OWNER` role (ADR-0006).
 */
export interface UpdateUserRoleRequest {
  role: AssignableRole;
}

/**
 * Response of `PATCH /users/:id/role` [owner] — the updated user as the public
 * {@link ApiUser} shape, reflecting the new role. A fresh login for that user
 * will carry the new role in its JWT.
 */
export type UpdateUserRoleResponse = ApiUser;
