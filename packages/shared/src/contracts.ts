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
