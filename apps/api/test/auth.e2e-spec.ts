import type { INestApplication } from "@nestjs/common";
import { Role } from "@repo/shared";
import request from "supertest";

import { createTestApp } from "./utils/create-test-app";

/**
 * Auth API + RBAC-primitive proving ground (issue 02). Exercised end to end at
 * the HTTP seam (spec.md "Testing Decisions") against a fresh ephemeral SQLite
 * database per app instance, so the first-user bootstrap is observed live.
 *
 * Also pins the email-normalisation rule the whole app depends on: every email
 * is trimmed and lowercased before it is stored or matched, and `users.email` is
 * unique under `COLLATE NOCASE`, so one address can never become two accounts.
 * Lending relies on this — a Loan names its borrower by email (ADR-0011), so a
 * case-variant duplicate would make that reference ambiguous.
 */
describe("Auth (e2e)", () => {
  let app: INestApplication;

  beforeEach(async () => {
    // Fresh app + fresh :memory: DB per test so the users table starts empty
    // and the OWNER-vs-MEMBER bootstrap is deterministic.
    app = await createTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  const register = (email: string, password = "password123") =>
    request(app.getHttpServer()).post("/auth/register").send({ email, password });

  const login = (email: string, password = "password123") =>
    request(app.getHttpServer()).post("/auth/login").send({ email, password });

  describe("POST /auth/register", () => {
    it("issues a token and makes the first registrant the OWNER", async () => {
      const res = await register("owner@example.com");

      expect(res.status).toBe(201);
      expect(typeof res.body.token).toBe("string");
      expect(res.body.token.length).toBeGreaterThan(0);
      expect(res.body.user).toMatchObject({
        id: expect.any(Number),
        email: "owner@example.com",
        role: Role.OWNER,
      });
      expect(typeof res.body.user.createdAt).toBe("string");
    });

    it("makes every registrant after the first a MEMBER", async () => {
      await register("owner@example.com");
      const res = await register("second@example.com");

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe(Role.MEMBER);
    });

    it("never exposes the password hash", async () => {
      const res = await register("owner@example.com");

      expect(res.body.user).not.toHaveProperty("passwordHash");
      expect(res.body.user).not.toHaveProperty("password_hash");
      expect(res.body.user).not.toHaveProperty("password");
    });

    it("rejects a duplicate email with a clear 409 error", async () => {
      await register("owner@example.com");
      const res = await register("owner@example.com");

      expect(res.status).toBe(409);
      expect(String(res.body.message)).toMatch(/email/i);
    });

    it("rejects a malformed email", async () => {
      const res = await register("not-an-email");
      expect(res.status).toBe(400);
    });
  });

  describe("POST /auth/login", () => {
    it("succeeds with correct credentials and returns a token + user", async () => {
      await register("owner@example.com");
      const res = await login("owner@example.com");

      expect(res.status).toBe(201);
      expect(typeof res.body.token).toBe("string");
      expect(res.body.user).toMatchObject({
        email: "owner@example.com",
        role: Role.OWNER,
      });
      expect(res.body.user).not.toHaveProperty("passwordHash");
    });

    it("rejects a wrong password with 401", async () => {
      await register("owner@example.com");
      const res = await login("owner@example.com", "wrong-password");

      expect(res.status).toBe(401);
    });

    it("rejects an unknown email with 401", async () => {
      const res = await login("nobody@example.com");
      expect(res.status).toBe(401);
    });
  });

  describe("GET /auth/me", () => {
    it("returns the caller's profile and role for a valid bearer token", async () => {
      const registered = await register("owner@example.com");
      const token: string = registered.body.token;

      const res = await request(app.getHttpServer())
        .get("/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({
        id: registered.body.user.id,
        email: "owner@example.com",
        role: Role.OWNER,
      });
      expect(res.body.user).not.toHaveProperty("passwordHash");
    });

    it("reflects a MEMBER's role", async () => {
      await register("owner@example.com");
      const member = await register("member@example.com");

      const res = await request(app.getHttpServer())
        .get("/auth/me")
        .set("Authorization", `Bearer ${member.body.token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe(Role.MEMBER);
    });

    it("rejects a request with no token (401)", async () => {
      const res = await request(app.getHttpServer()).get("/auth/me");
      expect(res.status).toBe(401);
    });

    it("rejects a garbage token (401)", async () => {
      const res = await request(app.getHttpServer())
        .get("/auth/me")
        .set("Authorization", "Bearer not.a.jwt");
      expect(res.status).toBe(401);
    });
  });

  describe("email normalisation", () => {
    it("stores a mixed-case email in its canonical lowercase form", async () => {
      const res = await register("OWNER@Example.COM");
      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe("owner@example.com");
    });

    it("trims surrounding whitespace before storing", async () => {
      const res = await register("  owner@example.com  ");
      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe("owner@example.com");
    });

    it("treats a case-variant of a registered email as a duplicate (409)", async () => {
      await register("owner@example.com");
      const res = await register("Owner@Example.com");
      expect(res.status).toBe(409);
    });

    it("logs in regardless of the casing used at registration", async () => {
      await register("Owner@Example.COM");
      const res = await login("owner@example.com");
      // 201: POST /auth/login keeps Nest's default POST status (see above).
      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe("owner@example.com");
    });
  });
});
