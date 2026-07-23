import { Controller, Get } from "@nestjs/common";
import type { HealthResponse } from "@repo/shared";

/**
 * Trivial liveness probe. Its only job for the walking skeleton (issue 01) is
 * to prove the HTTP + supertest e2e seam works end to end. The response shape
 * comes from `@repo/shared`, exercising the shared-types contract across the
 * API/mobile boundary.
 */
@Controller("health")
export class HealthController {
  @Get()
  check(): HealthResponse {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }
}
