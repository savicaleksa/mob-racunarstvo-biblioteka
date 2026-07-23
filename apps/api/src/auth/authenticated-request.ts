import type { JwtPayload } from "@repo/shared";

/**
 * The slice of the incoming HTTP request the auth layer touches: the
 * `authorization` header {@link JwtAuthGuard} reads, and the verified `user`
 * payload it writes. Kept minimal (rather than extending Express's `Request`)
 * so the API carries no dependency on `@types/express`.
 */
export interface AuthenticatedRequest {
  headers: { authorization?: string };
  user?: JwtPayload;
}
