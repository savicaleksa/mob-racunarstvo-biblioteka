import type { INestApplication } from "@nestjs/common";
import { Role } from "@repo/shared";
import { eq } from "drizzle-orm";
import request from "supertest";

import type { DrizzleDatabase } from "../../src/db/connection";
import { DRIZZLE } from "../../src/db/drizzle.module";
import { loans, users } from "../../src/db/schema";
import { seedCatalog } from "../../src/db/seed";

/**
 * Catalog e2e helpers (issue 03). All read routes require auth, so tests need to
 * register a user for a token; and because no users are seeded, a directly
 * inserted Loan needs a real member id. These helpers reach the app's Drizzle
 * instance via `app.get(DRIZZLE)` — the same ephemeral `:memory:` DB the HTTP
 * layer uses — to seed the Catalog and to plant a Loan row so Availability can
 * be proven without lending endpoints (which arrive in ticket 06).
 */

function db(app: INestApplication): DrizzleDatabase {
  return app.get<DrizzleDatabase>(DRIZZLE);
}

/** Seed the Catalog fixtures (Authors + Books) into the app's database. */
export function seedTestCatalog(app: INestApplication): {
  authors: number;
  books: number;
} {
  return seedCatalog(db(app));
}

/** Register a user and return the auth response body (`{ token, user }`). */
export async function register(
  app: INestApplication,
  email: string,
  password = "password123",
): Promise<{ token: string; user: { id: number; role: string } }> {
  const res = await request(app.getHttpServer())
    .post("/auth/register")
    .send({ email, password });
  return res.body;
}

/**
 * Mint a LIBRARIAN token. There is no self-serve promotion route until ticket
 * 07, so we register a plain user (a MEMBER unless it is the very first, which
 * would be the OWNER), flip their `role` to LIBRARIAN directly in the test DB,
 * then log in again so the fresh JWT carries the LIBRARIAN role its payload is
 * checked against. Register the OWNER first if you need a distinct MEMBER.
 */
export async function registerLibrarian(
  app: INestApplication,
  email: string,
  password = "password123",
): Promise<{ token: string; user: { id: number; role: string } }> {
  const registered = await register(app, email, password);

  db(app)
    .update(users)
    .set({ role: Role.LIBRARIAN })
    .where(eq(users.id, registered.user.id))
    .run();

  const res = await request(app.getHttpServer())
    .post("/auth/login")
    .send({ email, password });
  return res.body;
}

/**
 * Plant a Loan row directly (no lending endpoint exists until ticket 06) so a
 * test can observe Availability drop. Defaults to an Active Loan (returnedAt
 * null) due two weeks out.
 */
export function insertLoan(
  app: INestApplication,
  bookId: number,
  memberId: number,
  options: { returnedAt?: Date | null; dueDate?: Date } = {},
): void {
  db(app)
    .insert(loans)
    .values({
      bookId,
      memberId,
      dueDate: options.dueDate ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      returnedAt: options.returnedAt ?? null,
    })
    .run();
}
