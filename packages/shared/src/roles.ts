/**
 * The three access roles in the system (ADR-0006).
 *
 * - `OWNER`    — the single bootstrap administrator (first user to register).
 *                Never assignable through the API.
 * - `LIBRARIAN` — staff who manage the Catalog and record Loans.
 * - `MEMBER`   — the default role; browses the Catalog and views own Loans.
 *
 * Modelled as a const object plus a union type rather than a TS `enum` so the
 * value survives `isolatedModules` and is safe to share across the NestJS
 * (CommonJS) and Expo/Metro (bundler) toolchains.
 */
export const Role = {
  OWNER: "OWNER",
  LIBRARIAN: "LIBRARIAN",
  MEMBER: "MEMBER",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

/**
 * Roles that an Owner may assign to another user via `PATCH /users/:id/role`.
 * `OWNER` is deliberately excluded — it only ever comes from the first-user
 * bootstrap, closing the privilege-escalation path (ADR-0006).
 */
export const ASSIGNABLE_ROLES = [Role.LIBRARIAN, Role.MEMBER] as const;

export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];
