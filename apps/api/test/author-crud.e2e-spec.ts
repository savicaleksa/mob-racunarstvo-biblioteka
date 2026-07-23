import type { INestApplication } from "@nestjs/common";
import type { ApiAuthor, ApiBook } from "@repo/shared";
import request from "supertest";

import { register, registerLibrarian, seedTestCatalog } from "./utils/catalog";
import { createTestApp } from "./utils/create-test-app";

/**
 * Author CRUD (issue 04), exercised end to end at the HTTP seam against a fresh
 * ephemeral SQLite DB. Proves: the write routes are Librarian-or-Owner only (a
 * MEMBER is 403'd); happy-path create/edit/delete of an unreferenced Author;
 * and the RESTRICT rule (ADR-0008) — deleting an Author who still has Books is a
 * 409 domain error that leaves the Author AND its Books intact, never a cascade.
 */
describe("Author CRUD API (e2e)", () => {
  let app: INestApplication;
  let ownerToken: string;
  let memberToken: string;
  let librarianToken: string;

  beforeEach(async () => {
    app = await createTestApp();
    seedTestCatalog(app);
    // First registrant is the OWNER; second is a MEMBER.
    const owner = await register(app, "owner@example.com");
    ownerToken = owner.token;
    const member = await register(app, "member@example.com");
    memberToken = member.token;
    const librarian = await registerLibrarian(app, "librarian@example.com");
    librarianToken = librarian.token;
  });

  afterEach(async () => {
    await app.close();
  });

  const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

  describe("RBAC gating", () => {
    it("401s POST /authors without a token", async () => {
      const res = await request(app.getHttpServer())
        .post("/authors")
        .send({ name: "New Author" });
      expect(res.status).toBe(401);
    });

    it("403s a MEMBER from POST /authors", async () => {
      const res = await request(app.getHttpServer())
        .post("/authors")
        .set(authHeader(memberToken))
        .send({ name: "New Author" });
      expect(res.status).toBe(403);
    });

    it("403s a MEMBER from PATCH /authors/:id", async () => {
      const list = await request(app.getHttpServer())
        .get("/authors")
        .set(authHeader(memberToken));
      const first = (list.body as ApiAuthor[])[0]!;
      const res = await request(app.getHttpServer())
        .patch(`/authors/${first.id}`)
        .set(authHeader(memberToken))
        .send({ name: "Changed" });
      expect(res.status).toBe(403);
    });

    it("403s a MEMBER from DELETE /authors/:id", async () => {
      const list = await request(app.getHttpServer())
        .get("/authors")
        .set(authHeader(memberToken));
      const first = (list.body as ApiAuthor[])[0]!;
      const res = await request(app.getHttpServer())
        .delete(`/authors/${first.id}`)
        .set(authHeader(memberToken));
      expect(res.status).toBe(403);
    });
  });

  describe("POST /authors", () => {
    it("a LIBRARIAN creates an Author with name + optional bio + birthYear", async () => {
      const res = await request(app.getHttpServer())
        .post("/authors")
        .set(authHeader(librarianToken))
        .send({ name: "Jane Doe", bio: "A test author.", birthYear: 1970 });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: expect.any(Number),
        name: "Jane Doe",
        bio: "A test author.",
        birthYear: 1970,
      });

      // It is now visible via the read surface.
      const detail = await request(app.getHttpServer())
        .get(`/authors/${res.body.id}`)
        .set(authHeader(librarianToken));
      expect(detail.status).toBe(200);
      expect(detail.body.name).toBe("Jane Doe");
    });

    it("an OWNER may also create (librarian+ includes OWNER)", async () => {
      const res = await request(app.getHttpServer())
        .post("/authors")
        .set(authHeader(ownerToken))
        .send({ name: "Owner Made" });
      expect(res.status).toBe(201);
    });

    it("defaults bio and birthYear to null when omitted", async () => {
      const res = await request(app.getHttpServer())
        .post("/authors")
        .set(authHeader(librarianToken))
        .send({ name: "Sparse Author" });
      expect(res.status).toBe(201);
      expect(res.body.bio).toBeNull();
      expect(res.body.birthYear).toBeNull();
    });

    it("422/400s a missing name", async () => {
      const res = await request(app.getHttpServer())
        .post("/authors")
        .set(authHeader(librarianToken))
        .send({ bio: "no name" });
      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /authors/:id", () => {
    it("edits an Author's details", async () => {
      const created = await request(app.getHttpServer())
        .post("/authors")
        .set(authHeader(librarianToken))
        .send({ name: "Before", bio: "old", birthYear: 1900 });

      const res = await request(app.getHttpServer())
        .patch(`/authors/${created.body.id}`)
        .set(authHeader(librarianToken))
        .send({ name: "After", bio: null });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: created.body.id,
        name: "After",
        bio: null,
        birthYear: 1900, // untouched key preserved
      });
    });

    it("404s editing an unknown Author", async () => {
      const res = await request(app.getHttpServer())
        .patch("/authors/999999")
        .set(authHeader(librarianToken))
        .send({ name: "Nope" });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /authors/:id", () => {
    it("deletes an Author who has no Books", async () => {
      const created = await request(app.getHttpServer())
        .post("/authors")
        .set(authHeader(librarianToken))
        .send({ name: "Deletable" });

      const del = await request(app.getHttpServer())
        .delete(`/authors/${created.body.id}`)
        .set(authHeader(librarianToken));
      expect(del.status).toBe(204);

      const after = await request(app.getHttpServer())
        .get(`/authors/${created.body.id}`)
        .set(authHeader(librarianToken));
      expect(after.status).toBe(404);
    });

    it("404s deleting an unknown Author", async () => {
      const res = await request(app.getHttpServer())
        .delete("/authors/999999")
        .set(authHeader(librarianToken));
      expect(res.status).toBe(404);
    });

    it("409s (RESTRICT) deleting an Author with Books and leaves data intact", async () => {
      // A seeded Author with at least one Book.
      const books = await request(app.getHttpServer())
        .get("/books")
        .set(authHeader(librarianToken));
      const referenced = (books.body as ApiBook[])[0]!;
      const authorId = referenced.author.id;

      const del = await request(app.getHttpServer())
        .delete(`/authors/${authorId}`)
        .set(authHeader(librarianToken));
      expect(del.status).toBe(409);
      expect(typeof del.body.message).toBe("string");

      // The Author is still there.
      const author = await request(app.getHttpServer())
        .get(`/authors/${authorId}`)
        .set(authHeader(librarianToken));
      expect(author.status).toBe(200);

      // And its Book(s) are still there — no cascade.
      const stillThere = await request(app.getHttpServer())
        .get(`/books/${referenced.id}`)
        .set(authHeader(librarianToken));
      expect(stillThere.status).toBe(200);
      expect(stillThere.body.author.id).toBe(authorId);
    });
  });
});
