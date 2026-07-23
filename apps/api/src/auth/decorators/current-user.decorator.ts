import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { JwtPayload } from "@repo/shared";

import type { AuthenticatedRequest } from "../authenticated-request";

/**
 * Injects the authenticated caller's decoded JWT payload (`{ sub, role }`) into
 * a handler parameter. Only meaningful on a route protected by
 * {@link JwtAuthGuard}, which is what populates `request.user`; on an
 * unprotected route it resolves to `undefined`.
 *
 * Later tickets read `sub` for owner-scoped queries (e.g. `GET /loans/me`) and
 * `role` for view shaping.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload | undefined => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);
