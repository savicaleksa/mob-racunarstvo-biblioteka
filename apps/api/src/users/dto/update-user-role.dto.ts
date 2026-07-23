import { ASSIGNABLE_ROLES, type AssignableRole, type UpdateUserRoleRequest } from "@repo/shared";
import { IsIn } from "class-validator";

/**
 * Validated body of `PATCH /users/:id/role` [owner] (Owner user & role
 * management, issue 07). Implements the shared {@link UpdateUserRoleRequest}
 * contract so the wire shape stays in lockstep with `apps/mobile`.
 *
 * `role` is checked against `ASSIGNABLE_ROLES` (`LIBRARIAN | MEMBER`) with
 * `@IsIn`, which means `OWNER` — deliberately absent from that list (ADR-0006) —
 * is rejected with a clean 400 before the request ever reaches the service. This
 * closes the privilege-escalation path: the Owner role is never assignable
 * through the API, only ever minted by the first-user bootstrap.
 */
export class UpdateUserRoleDto implements UpdateUserRoleRequest {
  @IsIn(ASSIGNABLE_ROLES)
  role!: AssignableRole;
}
