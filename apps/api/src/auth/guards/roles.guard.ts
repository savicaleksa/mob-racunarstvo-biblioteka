import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Role } from "@repo/shared";

import type { AuthenticatedRequest } from "../authenticated-request";
import { ROLES_KEY } from "../decorators/roles.decorator";

/**
 * Enforces the {@link Roles} allow-list on a route. Must run *after*
 * {@link JwtAuthGuard} (declare them together, guard order left→right:
 * `@UseGuards(JwtAuthGuard, RolesGuard)`), because it reads the `request.user`
 * that guard sets.
 *
 * A route without `@Roles` has no allow-list, so this guard passes it through —
 * authentication alone (from {@link JwtAuthGuard}) is enough. When `@Roles` is
 * present, a caller whose role is not listed gets a 403. There is no implicit
 * hierarchy: "Librarian or above" routes name `Role.LIBRARIAN, Role.OWNER`
 * explicitly (tickets 03–07).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      // A @Roles route was not placed behind JwtAuthGuard — treat as unauthenticated.
      throw new UnauthorizedException("Missing bearer token");
    }

    if (!required.includes(user.role)) {
      throw new ForbiddenException("Insufficient role");
    }

    return true;
  }
}
