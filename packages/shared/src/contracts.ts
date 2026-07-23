import type { Role } from "./roles";

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
