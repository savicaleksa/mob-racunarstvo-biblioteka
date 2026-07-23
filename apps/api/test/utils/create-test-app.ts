import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { AppModule } from "../../src/app.module";

/**
 * Spin up a full Nest application for e2e testing, backed by a fresh ephemeral
 * in-memory SQLite database that is migrated up front (per suite/per call), and
 * with the same global ValidationPipe the real app uses in `main.ts`.
 *
 * This is the prior art every later e2e ticket builds on (spec.md "Testing
 * Decisions"): `Test.createTestingModule` → `app.init()` → drive it with
 * supertest against `app.getHttpServer()`. Because the DB is `:memory:` and the
 * connection is created per app instance, each `createTestApp()` yields a
 * pristine schema with no cross-test leakage.
 *
 * Callers own the returned app and must `await app.close()` when done (which
 * also closes the underlying SQLite connection).
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule.register({ url: ":memory:" })],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();
  return app;
}
