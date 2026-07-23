import type { INestApplication } from "@nestjs/common";
import type { ApiAuthor, ApiBook } from "@repo/shared";
import request from "supertest";

import {
  insertLoan,
  register,
  registerLibrarian,
  seedTestCatalog,
} from "./utils/catalog";
import { createTestApp } from "./utils/create-test-app";

/**
 * Book CRUD (issue 05), exercised end to end at the HTTP seam against a fresh
 * ephemeral SQLite DB. Proves: the write routes are Librarian-or-Owner only (a
 * MEMBER is 403'd); a bad `authorId` is a clean 400, not a raw 500; happy-path
 * create/edit (incl. Total Copies)/delete of a never-lent Book; every response
 * carries the correct derived Availability (ADR-0007); and the RESTRICT rule
 * (ADR-0008) — deleting a Book with any Loan (active or historical) is a 409
 * domain error that leaves the Book AND its Loan intact, never a cascade.
 */
describe("Book CRUD API (e2e)", () => {
  let app: INestApplication;
  let ownerToken: string;
  let memberToken: string;
  let memberId: number;
  let librarianToken: string;
  let authorId: number;

  beforeEach(async () => {
    app = await createTestApp();
    seedTestCatalog(app);
    // First registrant is the OWNER; second is a MEMBER.
    const owner = await register(app, "owner@example.com");
    ownerToken = owner.token;
    const member = await register(app, "member@example.com");
    memberToken = member.token;
    memberId = member.user.id;
    const librarian = await registerLibrarian(app, "librarian@example.com");
    librarianToken = librarian.token;

    // Grab a real seeded Author id to attach new Books to.
    const authors = await request(app.getHttpServer())
      .get("/authors")
      .set(authHeader(librarianToken));
    authorId = (authors.body as ApiAuthor[])[0]!.id;
  });

  afterEach(async () => {
    await app.close();
  });

  const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

  describe("RBAC gating", () => {
    it("401s POST /books without a token", async () => {
      const res = await request(app.getHttpServer())
        .post("/books")
        .send({ title: "New Book", authorId });
      expect(res.status).toBe(401);
    });

    it("403s a MEMBER from POST /books", async () => {
      const res = await request(app.getHttpServer())
        .post("/books")
        .set(authHeader(memberToken))
        .send({ title: "New Book", authorId });
      expect(res.status).toBe(403);
    });

    it("403s a MEMBER from PATCH /books/:id", async () => {
      const list = await request(app.getHttpServer())
        .get("/books")
        .set(authHeader(memberToken));
      const first = (list.body as ApiBook[])[0]!;
      const res = await request(app.getHttpServer())
        .patch(`/books/${first.id}`)
        .set(authHeader(memberToken))
        .send({ title: "Changed" });
      expect(res.status).toBe(403);
    });

    it("403s a MEMBER from DELETE /books/:id", async () => {
      const list = await request(app.getHttpServer())
        .get("/books")
        .set(authHeader(memberToken));
      const first = (list.body as ApiBook[])[0]!;
      const res = await request(app.getHttpServer())
        .delete(`/books/${first.id}`)
        .set(authHeader(memberToken));
      expect(res.status).toBe(403);
    });
  });

  describe("POST /books", () => {
    it("a LIBRARIAN creates a Book with all fields and derived Availability", async () => {
      const res = await request(app.getHttpServer())
        .post("/books")
        .set(authHeader(librarianToken))
        .send({
          title: "Brand New Title",
          authorId,
          totalCopies: 5,
          isbn: "978-1-23-456789-0",
          publishedYear: 2020,
          description: "A freshly catalogued Book.",
        });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: expect.any(Number),
        title: "Brand New Title",
        totalCopies: 5,
        availability: 5, // no loans yet
        isbn: "978-1-23-456789-0",
        publishedYear: 2020,
        description: "A freshly catalogued Book.",
      });
      expect(res.body.author.id).toBe(authorId);

      // Visible via the read surface with the same Availability.
      const detail = await request(app.getHttpServer())
        .get(`/books/${res.body.id}`)
        .set(authHeader(librarianToken));
      expect(detail.status).toBe(200);
      expect(detail.body.title).toBe("Brand New Title");
      expect(detail.body.availability).toBe(5);
    });

    it("an OWNER may also create (librarian+ includes OWNER)", async () => {
      const res = await request(app.getHttpServer())
        .post("/books")
        .set(authHeader(ownerToken))
        .send({ title: "Owner Made", authorId });
      expect(res.status).toBe(201);
    });

    it("defaults Total Copies to 1 and nullable fields to null when omitted", async () => {
      const res = await request(app.getHttpServer())
        .post("/books")
        .set(authHeader(librarianToken))
        .send({ title: "Sparse Book", authorId });
      expect(res.status).toBe(201);
      expect(res.body.totalCopies).toBe(1);
      expect(res.body.availability).toBe(1);
      expect(res.body.isbn).toBeNull();
      expect(res.body.publishedYear).toBeNull();
      expect(res.body.description).toBeNull();
    });

    it("400s a bad authorId with a clean message, not a raw 500", async () => {
      const res = await request(app.getHttpServer())
        .post("/books")
        .set(authHeader(librarianToken))
        .send({ title: "Orphan Book", authorId: 999999 });
      expect(res.status).toBe(400);
      expect(typeof res.body.message).toBe("string");
    });

    it("400s a missing title", async () => {
      const res = await request(app.getHttpServer())
        .post("/books")
        .set(authHeader(librarianToken))
        .send({ authorId });
      expect(res.status).toBe(400);
    });

    it("400s a missing authorId", async () => {
      const res = await request(app.getHttpServer())
        .post("/books")
        .set(authHeader(librarianToken))
        .send({ title: "No Author" });
      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /books/:id", () => {
    it("edits a Book's details including Total Copies", async () => {
      const created = await request(app.getHttpServer())
        .post("/books")
        .set(authHeader(librarianToken))
        .send({ title: "Before", authorId, totalCopies: 2, isbn: "old" });

      const res = await request(app.getHttpServer())
        .patch(`/books/${created.body.id}`)
        .set(authHeader(librarianToken))
        .send({ title: "After", totalCopies: 7, isbn: null });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: created.body.id,
        title: "After",
        totalCopies: 7,
        availability: 7,
        isbn: null,
      });
    });

    it("reflects updated Availability after Total Copies changes with an Active Loan", async () => {
      const created = await request(app.getHttpServer())
        .post("/books")
        .set(authHeader(librarianToken))
        .send({ title: "Lent Book", authorId, totalCopies: 3 });

      insertLoan(app, created.body.id, memberId); // one Active Loan

      const res = await request(app.getHttpServer())
        .patch(`/books/${created.body.id}`)
        .set(authHeader(librarianToken))
        .send({ totalCopies: 5 });

      expect(res.status).toBe(200);
      expect(res.body.totalCopies).toBe(5);
      expect(res.body.availability).toBe(4); // 5 - 1 active loan
    });

    it("400s patching a Book to a bad authorId", async () => {
      const created = await request(app.getHttpServer())
        .post("/books")
        .set(authHeader(librarianToken))
        .send({ title: "Movable", authorId });

      const res = await request(app.getHttpServer())
        .patch(`/books/${created.body.id}`)
        .set(authHeader(librarianToken))
        .send({ authorId: 999999 });
      expect(res.status).toBe(400);
    });

    it("404s editing an unknown Book", async () => {
      const res = await request(app.getHttpServer())
        .patch("/books/999999")
        .set(authHeader(librarianToken))
        .send({ title: "Nope" });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /books/:id", () => {
    it("deletes a Book that has never been lent", async () => {
      const created = await request(app.getHttpServer())
        .post("/books")
        .set(authHeader(librarianToken))
        .send({ title: "Deletable", authorId });

      const del = await request(app.getHttpServer())
        .delete(`/books/${created.body.id}`)
        .set(authHeader(librarianToken));
      expect(del.status).toBe(204);

      const after = await request(app.getHttpServer())
        .get(`/books/${created.body.id}`)
        .set(authHeader(librarianToken));
      expect(after.status).toBe(404);
    });

    it("404s deleting an unknown Book", async () => {
      const res = await request(app.getHttpServer())
        .delete("/books/999999")
        .set(authHeader(librarianToken));
      expect(res.status).toBe(404);
    });

    it("409s (RESTRICT) deleting a Book with an Active Loan and leaves data intact", async () => {
      const created = await request(app.getHttpServer())
        .post("/books")
        .set(authHeader(librarianToken))
        .send({ title: "Active Loaned", authorId });

      insertLoan(app, created.body.id, memberId); // Active Loan

      const del = await request(app.getHttpServer())
        .delete(`/books/${created.body.id}`)
        .set(authHeader(librarianToken));
      expect(del.status).toBe(409);
      expect(typeof del.body.message).toBe("string");

      // The Book is still there — no cascade.
      const still = await request(app.getHttpServer())
        .get(`/books/${created.body.id}`)
        .set(authHeader(librarianToken));
      expect(still.status).toBe(200);
    });

    it("409s (RESTRICT) deleting a Book with a historical (returned) Loan too", async () => {
      const created = await request(app.getHttpServer())
        .post("/books")
        .set(authHeader(librarianToken))
        .send({ title: "History Only", authorId });

      // A returned Loan: historical, no longer consuming Availability, but the
      // row still exists so the delete must still be blocked (ADR-0008).
      insertLoan(app, created.body.id, memberId, { returnedAt: new Date() });

      const del = await request(app.getHttpServer())
        .delete(`/books/${created.body.id}`)
        .set(authHeader(librarianToken));
      expect(del.status).toBe(409);

      // Book intact.
      const still = await request(app.getHttpServer())
        .get(`/books/${created.body.id}`)
        .set(authHeader(librarianToken));
      expect(still.status).toBe(200);
      // And its Availability is back to full (the Loan was returned).
      expect(still.body.availability).toBe(still.body.totalCopies);
    });
  });
});
