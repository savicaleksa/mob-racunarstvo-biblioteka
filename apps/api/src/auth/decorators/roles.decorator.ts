import { SetMetadata } from "@nestjs/common";
import type { Role } from "@repo/shared";

/** Metadata key under which {@link Roles} stores its allow-list. */
export const ROLES_KEY = "roles";

/**
 * Declare which roles may access a route (or controller). Pair it with
 * {@link RolesGuard}, which reads this metadata and 403s any authenticated
 * caller whose role is not in the list.
 *
 * The list is an explicit allow-list — there is no role hierarchy baked into
 * the guard — so a "Librarian or above" route is written by naming both:
 * `@Roles(Role.LIBRARIAN, Role.OWNER)`. An Owner-only route is `@Roles(Role.OWNER)`.
 * A route with no `@Roles` is open to any authenticated user (the guard is a
 * no-op). This is the RBAC primitive tickets 03–07 reuse.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
