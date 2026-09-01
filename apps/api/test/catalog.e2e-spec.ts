import type { INestApplication } from "@nestjs/common";
import type { ApiAuthor, ApiBook } from "@repo/shared";
import request from "supertest";

import { insertLoan, register, seedTestCatalog } from "./utils/catalog";
import { createTestApp } from "./utils/create-test-app";

/**
 * Catalog read API (issue 03), exercised end to end at the HTTP seam against a
 * fresh ephemeral SQLite DB seeded with the Catalog fixtures. Proves: auth is
 * required; Authors/Books list + detail; tokenized search (ADR-0009) including
 * reordered and mid-word tokens; the `available` filter; and Availability
 * derived from Active Loans (ADR-0007), observed dropping when a Loan is planted
 * directly (lending endpoints do not exist yet).
 */
describe("Catalog read API (e2e)", () => {
  let app: INestApplication;
  let token: string;
  let memberId: number;

  beforeEach(async () => {
    app = await createTestApp();
    seedTestCatalog(app);
    // First registrant is the OWNER, but any authenticated user may browse.
    const owner = await register(app, "owner@example.com");
    token = owner.token;
    memberId = owner.user.id;
  });

  afterEach(async () => {
    await app.close();
  });

  const authGet = (path: string) =>
    request(app.getHttpServer())
      .get(path)
      .set("Authorization", `Bearer ${token}`);

  describe("auth gating", () => {
    it("401s GET /authors without a token", async () => {
      const res = await request(app.getHttpServer()).get("/authors");
      expect(res.status).toBe(401);
    });

    it("401s GET /books without a token", async () => {
      const res = await request(app.getHttpServer()).get("/books");
      expect(res.status).toBe(401);
    });
  });

  describe("GET /authors", () => {
    it("lists all seeded Authors for an authenticated caller", async () => {
      const res = await authGet("/authors");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(76);

      const dostoevsky = (res.body as ApiAuthor[]).find(
        (a) => a.name === "Fyodor Dostoevsky",
      );
      expect(dostoevsky).toBeDefined();
      expect(dostoevsky).toMatchObject({
        id: expect.any(Number),
        name: "Fyodor Dostoevsky",
        birthYear: 1821,
      });
      expect(typeof dostoevsky!.bio).toBe("string");
    });

    it.each([
      ["fyo dos", "two leading-substring tokens"],
      ["Dostoevsky Fyodor", "reordered full words"],
      ["yodo ostoe", "mid-word substrings"],
    ])("tokenized search %j (%s) returns Fyodor Dostoevsky", async (query) => {
      const res = await authGet(`/authors?search=${encodeURIComponent(query)}`);
      expect(res.status).toBe(200);
      const names = (res.body as ApiAuthor[]).map((a) => a.name);
      expect(names).toContain("Fyodor Dostoevsky");
    });

    it("excludes an Author when one token does not match", async () => {
      const res = await authGet("/authors?search=fyodor%20zzz");
      expect(res.status).toBe(200);
      const names = (res.body as ApiAuthor[]).map((a) => a.name);
      expect(names).not.toContain("Fyodor Dostoevsky");
    });

    it("empty search returns the unfiltered list", async () => {
      const res = await authGet("/authors?search=");
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(76);
    });
  });

  describe("GET /authors/:id", () => {
    it("returns a single Author", async () => {
      const list = await authGet("/authors");
      const first = (list.body as ApiAuthor[])[0]!;
      const res = await authGet(`/authors/${first.id}`);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: first.id, name: first.name });
    });

    it("404s an unknown Author id", async () => {
      const res = await authGet("/authors/999999");
      expect(res.status).toBe(404);
    });
  });

  describe("GET /books", () => {
    it("lists Books, each with Author and derived Availability", async () => {
      const res = await authGet("/books");
      expect(res.status).toBe(200);
      const books = res.body as ApiBook[];
      expect(books.length).toBeGreaterThanOrEqual(100);

      const book = books[0]!;
      expect(book.author).toMatchObject({
        id: expect.any(Number),
        name: expect.any(String),
      });
      // No Loans seeded, so Availability equals totalCopies.
      expect(book.availability).toBe(book.totalCopies);
    });

    it("tokenized search over title + author name finds the Book", async () => {
      // "yodo ostoe" matches the Author name embedded in the search target.
      const res = await authGet("/books?search=yodo%20ostoe");
      expect(res.status).toBe(200);
      const titles = (res.body as ApiBook[]).map((b) => b.title);
      expect(titles).toContain("Crime and Punishment");
    });

    it("Availability reflects Active Loans and drops when one is planted", async () => {
      const before = await authGet("/books");
      const target = (before.body as ApiBook[]).find(
        (b) => b.title === "Crime and Punishment",
      )!;
      const startingAvailability = target.availability;
      expect(startingAvailability).toBe(target.totalCopies);

      insertLoan(app, target.id, memberId);

      const after = await authGet("/books");
      const updated = (after.body as ApiBook[]).find(
        (b) => b.id === target.id,
      )!;
      expect(updated.availability).toBe(startingAvailability - 1);

      // A returned Loan is not Active and must not consume Availability.
      insertLoan(app, target.id, memberId, { returnedAt: new Date() });
      const afterReturn = await authGet("/books");
      const stillOne = (afterReturn.body as ApiBook[]).find(
        (b) => b.id === target.id,
      )!;
      expect(stillOne.availability).toBe(startingAvailability - 1);
    });

    it("available=true excludes Books with zero Availability", async () => {
      // "Pale Fire" is seeded with totalCopies 1; one Active Loan zeroes it out.
      const list = await authGet("/books");
      const paleFire = (list.body as ApiBook[]).find(
        (b) => b.title === "Pale Fire",
      )!;
      expect(paleFire.totalCopies).toBe(1);
      insertLoan(app, paleFire.id, memberId);

      const res = await authGet("/books?available=true");
      expect(res.status).toBe(200);
      const titles = (res.body as ApiBook[]).map((b) => b.title);
      expect(titles).not.toContain("Pale Fire");
      // Books that still have copies remain listed.
      expect(titles).toContain("Crime and Punishment");
    });
  });

  describe("GET /books/:id", () => {
    it("exposes Author, Availability, description, publishedYear and ISBN", async () => {
      const list = await authGet("/books");
      const orwell = (list.body as ApiBook[]).find(
        (b) => b.title === "Nineteen Eighty-Four",
      )!;

      const res = await authGet(`/books/${orwell.id}`);
      expect(res.status).toBe(200);
      const book = res.body as ApiBook;
      expect(book.author.name).toBe("George Orwell");
      expect(book.availability).toBe(book.totalCopies);
      expect(book.publishedYear).toBe(1949);
      expect(typeof book.isbn).toBe("string");
      expect(typeof book.description).toBe("string");
    });

    it("404s an unknown Book id", async () => {
      const res = await authGet("/books/999999");
      expect(res.status).toBe(404);
    });
  });
});
