import type { INestApplication } from "@nestjs/common";
import { Role, type ApiUser } from "@repo/shared";
import request from "supertest";

import { register, registerLibrarian } from "./utils/catalog";
import { createTestApp } from "./utils/create-test-app";

/**
 * Owner user & role management (issue 07), exercised end to end at the HTTP seam
 * against a fresh ephemeral SQLite DB. Proves: `GET /users` and
 * `PATCH /users/:id/role` are Owner-only (a MEMBER and a LIBRARIAN are both
 * 403'd, which is what makes this ticket the role guard's proof); an Owner can
 * promote a Member to Librarian and demote a Librarian to Member (observed via
 * `GET /users` and reflected in a fresh login's role); `OWNER` is never accepted
 * as a target role (400); a missing user id is a 404; and the bootstrap Owner's
 * own role cannot be changed. No response ever leaks the password hash.
 *
 * `GET /users/lookup` is the deliberate exception to the Owner-only rule
 * (ADR-0011): it is librarian+, because issuing a Loan names the borrower by
 * email. Its tests prove it stays a bare `{ exists }` boolean — no id, no role,
 * no registration date — that it is still closed to a MEMBER, and that it
 * always answers 200, including when the answer is `false`.
 */
describe("Owner user & role management API (e2e)", () => {
  let app: INestApplication;
  let ownerToken: string;
  let ownerId: number;
  let memberToken: string;
  let memberId: number;
  let librarianToken: string;
  let librarianId: number;

  beforeEach(async () => {
    app = await createTestApp();
    // First registrant is the OWNER; second is a MEMBER.
    const owner = await register(app, "owner@example.com");
    ownerToken = owner.token;
    ownerId = owner.user.id;
    const member = await register(app, "member@example.com");
    memberToken = member.token;
    memberId = member.user.id;
    const librarian = await registerLibrarian(app, "librarian@example.com");
    librarianToken = librarian.token;
    librarianId = librarian.user.id;
  });

  afterEach(async () => {
    await app.close();
  });

  const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

  describe("RBAC gating", () => {
    it("401s GET /users without a token", async () => {
      const res = await request(app.getHttpServer()).get("/users");
      expect(res.status).toBe(401);
    });

    it("403s a MEMBER from GET /users", async () => {
      const res = await request(app.getHttpServer())
        .get("/users")
        .set(authHeader(memberToken));
      expect(res.status).toBe(403);
    });

    it("403s a LIBRARIAN from GET /users", async () => {
      const res = await request(app.getHttpServer())
        .get("/users")
        .set(authHeader(librarianToken));
      expect(res.status).toBe(403);
    });

    it("403s a MEMBER from PATCH /users/:id/role", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/users/${librarianId}/role`)
        .set(authHeader(memberToken))
        .send({ role: Role.MEMBER });
      expect(res.status).toBe(403);
    });

    it("403s a LIBRARIAN from PATCH /users/:id/role", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/users/${memberId}/role`)
        .set(authHeader(librarianToken))
        .send({ role: Role.LIBRARIAN });
      expect(res.status).toBe(403);
    });
  });

  describe("GET /users", () => {
    it("lists all users with their roles and never the password hash", async () => {
      const res = await request(app.getHttpServer())
        .get("/users")
        .set(authHeader(ownerToken));

      expect(res.status).toBe(200);
      const body = res.body as ApiUser[];
      expect(body).toHaveLength(3);

      const byEmail = Object.fromEntries(body.map((u) => [u.email, u]));
      expect(byEmail["owner@example.com"]!.role).toBe(Role.OWNER);
      expect(byEmail["member@example.com"]!.role).toBe(Role.MEMBER);
      expect(byEmail["librarian@example.com"]!.role).toBe(Role.LIBRARIAN);

      for (const user of body) {
        expect(user).toHaveProperty("id");
        expect(user).toHaveProperty("email");
        expect(user).toHaveProperty("role");
        expect(user).toHaveProperty("createdAt");
        expect(user).not.toHaveProperty("passwordHash");
        expect(user).not.toHaveProperty("password_hash");
      }
    });
  });

  describe("PATCH /users/:id/role", () => {
    it("promotes a Member to Librarian", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/users/${memberId}/role`)
        .set(authHeader(ownerToken))
        .send({ role: Role.LIBRARIAN });

      expect(res.status).toBe(200);
      const body = res.body as ApiUser;
      expect(body.id).toBe(memberId);
      expect(body.role).toBe(Role.LIBRARIAN);
      expect(body).not.toHaveProperty("passwordHash");

      // Reflected in the roster.
      const list = await request(app.getHttpServer())
        .get("/users")
        .set(authHeader(ownerToken));
      const promoted = (list.body as ApiUser[]).find((u) => u.id === memberId)!;
      expect(promoted.role).toBe(Role.LIBRARIAN);

      // And in a fresh login's token/profile.
      const relogin = await request(app.getHttpServer())
        .post("/auth/login")
        .send({ email: "member@example.com", password: "password123" });
      expect(relogin.body.user.role).toBe(Role.LIBRARIAN);
    });

    it("demotes a Librarian to Member", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/users/${librarianId}/role`)
        .set(authHeader(ownerToken))
        .send({ role: Role.MEMBER });

      expect(res.status).toBe(200);
      expect((res.body as ApiUser).role).toBe(Role.MEMBER);

      const list = await request(app.getHttpServer())
        .get("/users")
        .set(authHeader(ownerToken));
      const demoted = (list.body as ApiUser[]).find(
        (u) => u.id === librarianId,
      )!;
      expect(demoted.role).toBe(Role.MEMBER);
    });

    it("refuses OWNER as a target role (400)", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/users/${memberId}/role`)
        .set(authHeader(ownerToken))
        .send({ role: Role.OWNER });

      expect(res.status).toBe(400);

      // The Member's role is unchanged.
      const list = await request(app.getHttpServer())
        .get("/users")
        .set(authHeader(ownerToken));
      const target = (list.body as ApiUser[]).find((u) => u.id === memberId)!;
      expect(target.role).toBe(Role.MEMBER);
    });

    it("rejects an unknown role value (400)", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/users/${memberId}/role`)
        .set(authHeader(ownerToken))
        .send({ role: "SUPERADMIN" });
      expect(res.status).toBe(400);
    });

    it("404s a missing user id", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/users/999999/role`)
        .set(authHeader(ownerToken))
        .send({ role: Role.LIBRARIAN });
      expect(res.status).toBe(404);
    });

    it("refuses to change the bootstrap Owner's own role (400)", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/users/${ownerId}/role`)
        .set(authHeader(ownerToken))
        .send({ role: Role.LIBRARIAN });

      expect(res.status).toBe(400);

      // The Owner is still the Owner.
      const list = await request(app.getHttpServer())
        .get("/users")
        .set(authHeader(ownerToken));
      const owner = (list.body as ApiUser[]).find((u) => u.id === ownerId)!;
      expect(owner.role).toBe(Role.OWNER);
    });
  });

  describe("GET /users/lookup (member existence, librarian+)", () => {
    const lookup = (email: string, token: string) =>
      request(app.getHttpServer())
        .get("/users/lookup")
        .query({ email })
        .set(authHeader(token));

    it("401s without a token", async () => {
      const res = await request(app.getHttpServer())
        .get("/users/lookup")
        .query({ email: "member@example.com" });
      expect(res.status).toBe(401);
    });

    it("403s a MEMBER — the lookup is librarian+, not any authenticated user", async () => {
      const res = await lookup("member@example.com", memberToken);
      expect(res.status).toBe(403);
    });

    it("tells a LIBRARIAN a registered email exists", async () => {
      const res = await lookup("member@example.com", librarianToken);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ exists: true });
    });

    it("answers 200 with exists:false for an unregistered email, not 404", async () => {
      const res = await lookup("nobody@example.com", librarianToken);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ exists: false });
    });

    it("discloses nothing beyond the boolean", async () => {
      const res = await lookup("owner@example.com", librarianToken);
      expect(res.status).toBe(200);
      // Not the id, not the role, not createdAt — just whether they exist.
      expect(Object.keys(res.body as object)).toEqual(["exists"]);
    });

    it("matches case-insensitively and ignores surrounding whitespace", async () => {
      const upper = await lookup("MeMbEr@ExAmPlE.CoM", librarianToken);
      expect(upper.body).toEqual({ exists: true });

      const padded = await lookup("  member@example.com  ", librarianToken);
      expect(padded.body).toEqual({ exists: true });
    });

    it("400s a malformed email — not an email is a different answer from not registered", async () => {
      const res = await lookup("not-an-email", librarianToken);
      expect(res.status).toBe(400);
    });

    it("400s a missing email query param", async () => {
      const res = await request(app.getHttpServer())
        .get("/users/lookup")
        .set(authHeader(librarianToken));
      expect(res.status).toBe(400);
    });

    it("is also open to the OWNER (librarian+ includes OWNER)", async () => {
      const res = await lookup("librarian@example.com", ownerToken);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ exists: true });
    });
  });
});
