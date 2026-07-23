import type { INestApplication } from "@nestjs/common";
import type {
  ActiveLoanRow,
  ApiAuthor,
  ApiBook,
  MyLoan,
} from "@repo/shared";
import request from "supertest";

import { register, registerLibrarian, seedTestCatalog } from "./utils/catalog";
import { createTestApp } from "./utils/create-test-app";

/**
 * Lending API (issue 06), exercised end to end at the HTTP seam against a fresh
 * ephemeral SQLite DB. Proves: Issue is Librarian-or-Owner only (a MEMBER is
 * 403'd) and decrements Availability as observed via `GET /books`; Issue is
 * rejected when `count(active loans) === totalCopies`; bad bookId/memberId are
 * clean domain errors, not raw 500s; Return restores Availability and moves the
 * Loan into history (idempotency guarded); `GET /loans/active` returns the
 * showcase JOIN (Book + Author + Member + Due Date) only for Active Loans, with
 * Overdue flagged; and `GET /loans/me` shows Active vs returned scoped strictly
 * to the caller (ADR-0007).
 */
describe("Lending API (e2e)", () => {
  let app: INestApplication;
  let ownerToken: string;
  let memberToken: string;
  let memberId: number;
  let otherMemberToken: string;
  let otherMemberId: number;
  let librarianToken: string;
  let authorId: number;

  const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeEach(async () => {
    app = await createTestApp();
    seedTestCatalog(app);
    // First registrant is the OWNER; the rest are MEMBERs.
    const owner = await register(app, "owner@example.com");
    ownerToken = owner.token;
    const member = await register(app, "member@example.com");
    memberToken = member.token;
    memberId = member.user.id;
    const other = await register(app, "other@example.com");
    otherMemberToken = other.token;
    otherMemberId = other.user.id;
    const librarian = await registerLibrarian(app, "librarian@example.com");
    librarianToken = librarian.token;

    const authors = await request(app.getHttpServer())
      .get("/authors")
      .set(authHeader(librarianToken));
    authorId = (authors.body as ApiAuthor[])[0]!.id;
  });

  afterEach(async () => {
    await app.close();
  });

  /** Create a fresh Book with a known Total Copies and return it. */
  async function makeBook(totalCopies = 1, title = "Lendable"): Promise<ApiBook> {
    const res = await request(app.getHttpServer())
      .post("/books")
      .set(authHeader(librarianToken))
      .send({ title, authorId, totalCopies });
    expect(res.status).toBe(201);
    return res.body as ApiBook;
  }

  /** Read one Book's current Availability via the read surface. */
  async function availabilityOf(bookId: number): Promise<number> {
    const res = await request(app.getHttpServer())
      .get(`/books/${bookId}`)
      .set(authHeader(librarianToken));
    return (res.body as ApiBook).availability;
  }

  describe("RBAC gating", () => {
    it("401s POST /loans without a token", async () => {
      const book = await makeBook();
      const res = await request(app.getHttpServer())
        .post("/loans")
        .send({ bookId: book.id, memberId });
      expect(res.status).toBe(401);
    });

    it("403s a MEMBER from POST /loans", async () => {
      const book = await makeBook();
      const res = await request(app.getHttpServer())
        .post("/loans")
        .set(authHeader(memberToken))
        .send({ bookId: book.id, memberId });
      expect(res.status).toBe(403);
    });

    it("403s a MEMBER from PATCH /loans/:id/return", async () => {
      const res = await request(app.getHttpServer())
        .patch("/loans/1/return")
        .set(authHeader(memberToken));
      expect(res.status).toBe(403);
    });

    it("403s a MEMBER from GET /loans/active", async () => {
      const res = await request(app.getHttpServer())
        .get("/loans/active")
        .set(authHeader(memberToken));
      expect(res.status).toBe(403);
    });

    it("allows any authenticated caller on GET /loans/me", async () => {
      const res = await request(app.getHttpServer())
        .get("/loans/me")
        .set(authHeader(memberToken));
      expect(res.status).toBe(200);
    });
  });

  describe("POST /loans (Issue)", () => {
    it("issues a Loan and decrements Availability observed via GET /books", async () => {
      const book = await makeBook(2);
      expect(await availabilityOf(book.id)).toBe(2);

      const res = await request(app.getHttpServer())
        .post("/loans")
        .set(authHeader(librarianToken))
        .send({ bookId: book.id, memberId });

      expect(res.status).toBe(201);
      const row = res.body as ActiveLoanRow;
      expect(row.id).toEqual(expect.any(Number));
      expect(row.book.id).toBe(book.id);
      expect(row.member.id).toBe(memberId);
      expect(row.overdue).toBe(false);

      expect(await availabilityOf(book.id)).toBe(1);
    });

    it("defaults Due Date to borrow date + 14 days when omitted", async () => {
      const book = await makeBook();
      const res = await request(app.getHttpServer())
        .post("/loans")
        .set(authHeader(librarianToken))
        .send({ bookId: book.id, memberId });

      expect(res.status).toBe(201);
      const row = res.body as ActiveLoanRow;
      const borrowed = new Date(row.borrowedAt).getTime();
      const due = new Date(row.dueDate).getTime();
      const fourteenDays = 14 * 24 * 60 * 60 * 1000;
      // Allow a small slack for execution time.
      expect(Math.abs(due - borrowed - fourteenDays)).toBeLessThan(5000);
    });

    it("honours an overridden Due Date", async () => {
      const book = await makeBook();
      const override = "2030-01-01T00:00:00.000Z";
      const res = await request(app.getHttpServer())
        .post("/loans")
        .set(authHeader(librarianToken))
        .send({ bookId: book.id, memberId, dueDate: override });

      expect(res.status).toBe(201);
      expect(new Date((res.body as ActiveLoanRow).dueDate).toISOString()).toBe(
        override,
      );
    });

    it("an OWNER may also Issue (librarian+ includes OWNER)", async () => {
      const book = await makeBook();
      const res = await request(app.getHttpServer())
        .post("/loans")
        .set(authHeader(ownerToken))
        .send({ bookId: book.id, memberId });
      expect(res.status).toBe(201);
    });

    it("rejects Issue when activeLoans === totalCopies (no Availability)", async () => {
      const book = await makeBook(1);
      const first = await request(app.getHttpServer())
        .post("/loans")
        .set(authHeader(librarianToken))
        .send({ bookId: book.id, memberId });
      expect(first.status).toBe(201);
      expect(await availabilityOf(book.id)).toBe(0);

      const second = await request(app.getHttpServer())
        .post("/loans")
        .set(authHeader(librarianToken))
        .send({ bookId: book.id, memberId: otherMemberId });
      expect(second.status).toBe(409);
      expect(typeof second.body.message).toBe("string");
      // Availability unchanged — the rejected Issue created no Loan.
      expect(await availabilityOf(book.id)).toBe(0);
    });

    it("allows Issue again after a copy is returned", async () => {
      const book = await makeBook(1);
      const first = await request(app.getHttpServer())
        .post("/loans")
        .set(authHeader(librarianToken))
        .send({ bookId: book.id, memberId });
      const loanId = (first.body as ActiveLoanRow).id;

      await request(app.getHttpServer())
        .patch(`/loans/${loanId}/return`)
        .set(authHeader(librarianToken));

      const again = await request(app.getHttpServer())
        .post("/loans")
        .set(authHeader(librarianToken))
        .send({ bookId: book.id, memberId: otherMemberId });
      expect(again.status).toBe(201);
    });

    it("gives a clean domain error (not a 500) for a missing bookId", async () => {
      const res = await request(app.getHttpServer())
        .post("/loans")
        .set(authHeader(librarianToken))
        .send({ bookId: 999999, memberId });
      expect([400, 404]).toContain(res.status);
      expect(typeof res.body.message).toBe("string");
    });

    it("gives a clean domain error (not a 500) for a missing memberId", async () => {
      const book = await makeBook();
      const res = await request(app.getHttpServer())
        .post("/loans")
        .set(authHeader(librarianToken))
        .send({ bookId: book.id, memberId: 999999 });
      expect([400, 404]).toContain(res.status);
      expect(typeof res.body.message).toBe("string");
    });

    it("400s a missing bookId/memberId in the body", async () => {
      const res = await request(app.getHttpServer())
        .post("/loans")
        .set(authHeader(librarianToken))
        .send({ bookId: 1 });
      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /loans/:id/return (Return)", () => {
    it("records a Return, restoring Availability and moving the Loan to history", async () => {
      const book = await makeBook(1);
      const issued = await request(app.getHttpServer())
        .post("/loans")
        .set(authHeader(librarianToken))
        .send({ bookId: book.id, memberId });
      const loanId = (issued.body as ActiveLoanRow).id;
      expect(await availabilityOf(book.id)).toBe(0);

      const res = await request(app.getHttpServer())
        .patch(`/loans/${loanId}/return`)
        .set(authHeader(librarianToken));
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(loanId);
      expect(typeof res.body.returnedAt).toBe("string");

      // Availability restored.
      expect(await availabilityOf(book.id)).toBe(1);

      // No longer in the Active Loans view.
      const active = await request(app.getHttpServer())
        .get("/loans/active")
        .set(authHeader(librarianToken));
      expect((active.body as ActiveLoanRow[]).some((r) => r.id === loanId)).toBe(
        false,
      );

      // But retained as history in the borrower's own Loans.
      const mine = await request(app.getHttpServer())
        .get("/loans/me")
        .set(authHeader(memberToken));
      const historical = (mine.body as MyLoan[]).find((l) => l.id === loanId)!;
      expect(historical).toBeDefined();
      expect(historical.returnedAt).not.toBeNull();
    });

    it("409s returning an already-returned Loan", async () => {
      const book = await makeBook();
      const issued = await request(app.getHttpServer())
        .post("/loans")
        .set(authHeader(librarianToken))
        .send({ bookId: book.id, memberId });
      const loanId = (issued.body as ActiveLoanRow).id;

      const first = await request(app.getHttpServer())
        .patch(`/loans/${loanId}/return`)
        .set(authHeader(librarianToken));
      expect(first.status).toBe(200);

      const second = await request(app.getHttpServer())
        .patch(`/loans/${loanId}/return`)
        .set(authHeader(librarianToken));
      expect(second.status).toBe(409);
    });

    it("404s returning a missing Loan", async () => {
      const res = await request(app.getHttpServer())
        .patch("/loans/999999/return")
        .set(authHeader(librarianToken));
      expect(res.status).toBe(404);
    });
  });

  describe("GET /loans/active (showcase JOIN)", () => {
    it("returns Book, Author, Member and Due Date together, only for Active Loans, Overdue flagged", async () => {
      const book = await makeBook(3, "The Joined Book");

      // An on-time Active Loan (future due date).
      const onTime = await request(app.getHttpServer())
        .post("/loans")
        .set(authHeader(librarianToken))
        .send({ bookId: book.id, memberId });
      const onTimeId = (onTime.body as ActiveLoanRow).id;

      // An overdue Active Loan (past due date, overridden).
      const overdue = await request(app.getHttpServer())
        .post("/loans")
        .set(authHeader(librarianToken))
        .send({
          bookId: book.id,
          memberId: otherMemberId,
          dueDate: "2000-01-01T00:00:00.000Z",
        });
      const overdueId = (overdue.body as ActiveLoanRow).id;

      // A returned Loan — must NOT appear in the Active view.
      const returned = await request(app.getHttpServer())
        .post("/loans")
        .set(authHeader(librarianToken))
        .send({ bookId: book.id, memberId });
      const returnedId = (returned.body as ActiveLoanRow).id;
      await request(app.getHttpServer())
        .patch(`/loans/${returnedId}/return`)
        .set(authHeader(librarianToken));

      const res = await request(app.getHttpServer())
        .get("/loans/active")
        .set(authHeader(librarianToken));
      expect(res.status).toBe(200);
      const rows = res.body as ActiveLoanRow[];

      const ids = rows.map((r) => r.id);
      expect(ids).toContain(onTimeId);
      expect(ids).toContain(overdueId);
      expect(ids).not.toContain(returnedId); // only Active Loans

      const onTimeRow = rows.find((r) => r.id === onTimeId)!;
      expect(onTimeRow.book).toMatchObject({ id: book.id, title: "The Joined Book" });
      expect(onTimeRow.book.author).toMatchObject({ id: authorId, name: expect.any(String) });
      expect(onTimeRow.member).toMatchObject({ id: memberId, email: "member@example.com" });
      expect(typeof onTimeRow.dueDate).toBe("string");
      expect(onTimeRow.overdue).toBe(false);

      const overdueRow = rows.find((r) => r.id === overdueId)!;
      expect(overdueRow.overdue).toBe(true);
      expect(overdueRow.member.id).toBe(otherMemberId);
    });
  });

  describe("GET /loans/me (own Loans)", () => {
    it("shows the caller's Active vs returned Loans with Book + Author, Overdue distinguished", async () => {
      const book = await makeBook(3, "My Book");

      // Active on-time.
      const active = await request(app.getHttpServer())
        .post("/loans")
        .set(authHeader(librarianToken))
        .send({ bookId: book.id, memberId });
      const activeId = (active.body as ActiveLoanRow).id;

      // Active overdue.
      const overdue = await request(app.getHttpServer())
        .post("/loans")
        .set(authHeader(librarianToken))
        .send({ bookId: book.id, memberId, dueDate: "2000-01-01T00:00:00.000Z" });
      const overdueId = (overdue.body as ActiveLoanRow).id;

      // Returned (historical).
      const returned = await request(app.getHttpServer())
        .post("/loans")
        .set(authHeader(librarianToken))
        .send({ bookId: book.id, memberId });
      const returnedId = (returned.body as ActiveLoanRow).id;
      await request(app.getHttpServer())
        .patch(`/loans/${returnedId}/return`)
        .set(authHeader(librarianToken));

      const res = await request(app.getHttpServer())
        .get("/loans/me")
        .set(authHeader(memberToken));
      expect(res.status).toBe(200);
      const loans = res.body as MyLoan[];

      const activeRow = loans.find((l) => l.id === activeId)!;
      expect(activeRow.returnedAt).toBeNull();
      expect(activeRow.overdue).toBe(false);
      expect(activeRow.book).toMatchObject({ id: book.id, title: "My Book" });
      expect(activeRow.book.author.id).toBe(authorId);

      const overdueRow = loans.find((l) => l.id === overdueId)!;
      expect(overdueRow.returnedAt).toBeNull();
      expect(overdueRow.overdue).toBe(true);

      const returnedRow = loans.find((l) => l.id === returnedId)!;
      expect(returnedRow.returnedAt).not.toBeNull();
      expect(returnedRow.overdue).toBe(false); // returned loans are never overdue
    });

    it("scopes strictly to the caller — never another member's Loans", async () => {
      const book = await makeBook(2);
      const forMember = await request(app.getHttpServer())
        .post("/loans")
        .set(authHeader(librarianToken))
        .send({ bookId: book.id, memberId });
      const memberLoanId = (forMember.body as ActiveLoanRow).id;

      // A Loan belonging to the OTHER member.
      const forOther = await request(app.getHttpServer())
        .post("/loans")
        .set(authHeader(librarianToken))
        .send({ bookId: book.id, memberId: otherMemberId });
      const otherLoanId = (forOther.body as ActiveLoanRow).id;

      const mine = await request(app.getHttpServer())
        .get("/loans/me")
        .set(authHeader(memberToken));
      const myIds = (mine.body as MyLoan[]).map((l) => l.id);
      expect(myIds).toContain(memberLoanId);
      expect(myIds).not.toContain(otherLoanId);

      const theirs = await request(app.getHttpServer())
        .get("/loans/me")
        .set(authHeader(otherMemberToken));
      const theirIds = (theirs.body as MyLoan[]).map((l) => l.id);
      expect(theirIds).toContain(otherLoanId);
      expect(theirIds).not.toContain(memberLoanId);
    });
  });
});
