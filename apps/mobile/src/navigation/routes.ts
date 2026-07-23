import { Role } from "@repo/shared";
import type { Href } from "expo-router";

/**
 * The landing route each role lands on after authenticating — the single place
 * that maps a {@link Role} to its home area. Each area is a role-gated route
 * group under `app/(app)/` that later tickets fill in:
 *
 * - `MEMBER`    → `/member`    — Catalog, Book detail, My Loans (ticket 09)
 * - `LIBRARIAN` → `/librarian` — Book/Author CRUD, Issue Loan, Active Loans (ticket 10)
 * - `OWNER`     → `/owner`     — Users list + role management (ticket 11)
 *
 * Keeping this mapping in one module means the redirect hub, the auth guards,
 * and {@link RoleGuard} all agree on where a given role belongs.
 */
export const ROLE_HOME: Record<Role, Href> = {
  [Role.MEMBER]: "/member",
  [Role.LIBRARIAN]: "/librarian",
  [Role.OWNER]: "/owner",
};

/** The route a user of the given role should land on / be redirected to. */
export function roleHome(role: Role): Href {
  return ROLE_HOME[role];
}

/** The public login route — where unauthenticated users and expired sessions go. */
export const LOGIN_ROUTE = "/login" as const satisfies Href;
