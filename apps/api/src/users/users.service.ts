import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  Role,
  type ApiUser,
  type AssignableRole,
  type UsersListResponse,
} from "@repo/shared";
import { asc, eq } from "drizzle-orm";

import type { DrizzleDatabase } from "../db/connection";
import { DRIZZLE } from "../db/drizzle.module";
import { users, type User } from "../db/schema";

/**
 * Owner user & role management use-cases behind the HTTP layer (issue 07):
 * list every registered user, and change a user's role between `LIBRARIAN` and
 * `MEMBER`. Both routes are Owner-only (enforced by the controller's guards).
 *
 * The service upholds two ADR-0006 invariants around the `OWNER` role. Callers
 * can never *set* someone to `OWNER` — the {@link UpdateUserRoleDto} only accepts
 * `ASSIGNABLE_ROLES`, so `OWNER` as a target is rejected at validation. And the
 * bootstrap Owner can never be *demoted*: {@link UsersService.updateRole} refuses
 * to touch a user who is currently an `OWNER`, so the system always retains its
 * single administrator. Nothing the service returns carries the password hash.
 */
@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  /**
   * List all registered users as their public {@link ApiUser} shape, ordered by
   * id (registration order). The password hash is projected away — it never
   * crosses the HTTP boundary.
   */
  list(): UsersListResponse {
    const rows = this.db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(asc(users.id))
      .all();

    return rows.map((row) => this.toApiUser(row));
  }

  /**
   * Change a user's role to `LIBRARIAN` or `MEMBER` (the only assignable roles).
   * 404 if the user does not exist. The bootstrap Owner is protected: attempting
   * to change a user who is currently an `OWNER` is a clean 400 — the Owner role
   * is immutable through the API (ADR-0006), so it can be neither granted nor
   * revoked here. Returns the updated user (reflecting the new role); a fresh
   * login for that user will carry the new role in its JWT.
   */
  updateRole(userId: number, role: AssignableRole): ApiUser {
    const existing = this.db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .get();

    if (!existing) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    if (existing.role === Role.OWNER) {
      throw new BadRequestException("The Owner's role cannot be changed");
    }

    const updated = this.db
      .update(users)
      .set({ role })
      .where(eq(users.id, userId))
      .returning()
      .get();

    return this.toApiUser(updated);
  }

  /** Project a DB row to the wire shape, dropping the password hash. */
  private toApiUser(
    user: Pick<User, "id" | "email" | "role" | "createdAt">,
  ): ApiUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role as Role,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
