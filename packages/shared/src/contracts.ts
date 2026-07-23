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
 * A user as exposed over the API. The password hash is never serialised.
 * (Fleshed out by ticket 02 — Auth API; kept minimal here.)
 */
export interface ApiUser {
  id: number;
  email: string;
  role: Role;
  createdAt: string;
}
