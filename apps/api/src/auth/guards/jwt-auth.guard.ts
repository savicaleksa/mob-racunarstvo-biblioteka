import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { JwtPayload } from "@repo/shared";

import type { AuthenticatedRequest } from "../authenticated-request";

/**
 * Authenticates a request by verifying the `Authorization: Bearer <token>`
 * JWT (ADR-0005) and attaching the decoded payload to `request.user`.
 *
 * This is the base RBAC primitive: every authenticated route (`/auth/me` here,
 * the Catalog/Loans/Users routes in tickets 03–07) sits behind it, and
 * {@link RolesGuard} / {@link CurrentUser} both read the `request.user` it sets.
 * Missing, malformed, or invalid/expired tokens all 401.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException("Missing bearer token");
    }

    try {
      request.user = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }

    return true;
  }

  private extractBearerToken(request: AuthenticatedRequest): string | undefined {
    const header = request.headers.authorization;
    if (!header) {
      return undefined;
    }
    const [scheme, value] = header.split(" ");
    return scheme === "Bearer" && value ? value : undefined;
  }
}
