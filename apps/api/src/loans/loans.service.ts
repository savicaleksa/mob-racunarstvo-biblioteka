import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  ActiveLoanRow,
  IssueLoanRequest,
  IssueLoanResponse,
  MyLoan,
  ReturnLoanResponse,
} from "@repo/shared";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";

import type { DrizzleDatabase } from "../db/connection";
import { DRIZZLE } from "../db/drizzle.module";
import { authors, books, loans, users } from "../db/schema";
import { UsersService } from "../users/users.service";

/** Default loan period: a Loan's Due Date is the borrow date + 14 days. */
const DEFAULT_LOAN_DAYS = 14;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * The Author columns embedded in every Loan row's Book. Kept in one place so the
 * `me` join and the showcase `active` join project the Author identically.
 */
const authorColumns = {
  id: authors.id,
  name: authors.name,
  bio: authors.bio,
  birthYear: authors.birthYear,
};

/**
 * Lending use-cases (issue 06): Issue a Loan, record a Return, list all Active
 * Loans (the showcase multi-table JOIN), and list the caller's own Loans.
 *
 * Availability is never stored (ADR-0007); Issue eligibility is decided by
 * counting a Book's Active Loans (`returnedAt IS NULL`) against its Total Copies,
 * the same single source of truth `BooksService` derives Availability from. A
 * Return only sets `returnedAt` — it never deletes the Loan, so lending history
 * is preserved and the freed copy is reflected on the next read.
 */
@Injectable()
export class LoansService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Issue a Loan of a Book to a Member (librarian+). `bookId` and `memberEmail`
   * are validated to reference an existing Book and user first, so a bad
   * reference is a clean 400 rather than a raw foreign-key 500. Issuing is
   * rejected with a 409 when the Book has no Availability
   * (`count(active loans) === totalCopies`, ADR-0007). The Due Date defaults to
   * the borrow date + 14 days and may be overridden via `dueDate`. Returns the
   * freshly issued (Active) Loan.
   *
   * The borrower is named by email and resolved to the `users.id` the `loans`
   * foreign key actually stores (ADR-0011) — the Loan still points at a user
   * record, not at a string, so it survives an email ever changing. Any
   * registered user may borrow, whatever their role: a Librarian reads books
   * too, and `GET /loans/me` has always been open to every authenticated caller.
   * The email is already trimmed and lowercased by `IssueLoanDto`, and the
   * borrower is resolved through the very same {@link UsersService.findIdByEmail}
   * that backs `GET /users/lookup` — so an email the Librarian just saw
   * confirmed cannot then fail here.
   */
  issue(input: IssueLoanRequest): IssueLoanResponse {
    const book = this.db
      .select({ id: books.id, totalCopies: books.totalCopies })
      .from(books)
      .where(eq(books.id, input.bookId))
      .get();

    if (!book) {
      throw new BadRequestException(`Book ${input.bookId} does not exist`);
    }

    const memberId = this.usersService.findIdByEmail(input.memberEmail);

    if (memberId === undefined) {
      throw new BadRequestException(
        `No account is registered with the email ${input.memberEmail}`,
      );
    }

    const activeCount = this.activeLoanCount(input.bookId);
    if (activeCount >= book.totalCopies) {
      throw new ConflictException(
        `Book ${input.bookId} has no Availability (all ${book.totalCopies} copies are on loan)`,
      );
    }

    const borrowedAt = new Date();
    const dueDate = input.dueDate
      ? new Date(input.dueDate)
      : new Date(borrowedAt.getTime() + DEFAULT_LOAN_DAYS * MS_PER_DAY);

    const inserted = this.db
      .insert(loans)
      .values({
        bookId: input.bookId,
        memberId,
        borrowedAt,
        dueDate,
        returnedAt: null,
      })
      .returning({ id: loans.id })
      .get();

    return this.activeLoanById(inserted.id);
  }

  /**
   * Record a Return for a Loan (librarian+): set `returnedAt`, which restores the
   * Book's Availability and moves the Loan into history without deleting it. 404
   * if the Loan does not exist; 409 if it has already been returned (idempotency
   * guard — a copy must not be "returned" twice).
   */
  return(loanId: number): ReturnLoanResponse {
    const loan = this.db
      .select({ id: loans.id, returnedAt: loans.returnedAt })
      .from(loans)
      .where(eq(loans.id, loanId))
      .get();

    if (!loan) {
      throw new NotFoundException(`Loan ${loanId} not found`);
    }

    if (loan.returnedAt !== null) {
      throw new ConflictException(`Loan ${loanId} has already been returned`);
    }

    const returnedAt = new Date();
    this.db
      .update(loans)
      .set({ returnedAt })
      .where(eq(loans.id, loanId))
      .run();

    return { id: loanId, returnedAt: returnedAt.toISOString() };
  }

  /**
   * List all Active Loans (librarian+) — the assignment's required "more complex"
   * query, kept as an explicit, readable multi-table Drizzle join:
   * `loans → books → authors → users`. Each row carries the borrowed Book (with
   * its Author), the borrowing Member, and the Due Date; Overdue is flagged when
   * the Due Date is in the past. Only Active Loans (`returnedAt IS NULL`) appear.
   */
  activeLoans(): ActiveLoanRow[] {
    const now = Date.now();

    const rows = this.db
      .select({
        id: loans.id,
        borrowedAt: loans.borrowedAt,
        dueDate: loans.dueDate,
        book: { id: books.id, title: books.title },
        author: authorColumns,
        member: { id: users.id, email: users.email },
      })
      .from(loans)
      .innerJoin(books, eq(loans.bookId, books.id))
      .innerJoin(authors, eq(books.authorId, authors.id))
      .innerJoin(users, eq(loans.memberId, users.id))
      .where(isNull(loans.returnedAt))
      .orderBy(asc(loans.dueDate))
      .all();

    return rows.map((row) => ({
      id: row.id,
      book: {
        id: row.book.id,
        title: row.book.title,
        author: {
          id: row.author.id,
          name: row.author.name,
          bio: row.author.bio,
          birthYear: row.author.birthYear,
        },
      },
      member: { id: row.member.id, email: row.member.email },
      borrowedAt: row.borrowedAt.toISOString(),
      dueDate: row.dueDate.toISOString(),
      overdue: row.dueDate.getTime() < now,
    }));
  }

  /**
   * List the caller's own Loans (any authenticated user), Active and historical,
   * each with its Book and Author joined in. Active Loans carry `returnedAt: null`
   * and an `overdue` flag; returned Loans carry their `returnedAt` and are never
   * Overdue. Scoped strictly to `memberId` (the caller's JWT `sub`). Ordered
   * most-recently borrowed first.
   */
  myLoans(memberId: number): MyLoan[] {
    const now = Date.now();

    const rows = this.db
      .select({
        id: loans.id,
        borrowedAt: loans.borrowedAt,
        dueDate: loans.dueDate,
        returnedAt: loans.returnedAt,
        book: { id: books.id, title: books.title },
        author: authorColumns,
      })
      .from(loans)
      .innerJoin(books, eq(loans.bookId, books.id))
      .innerJoin(authors, eq(books.authorId, authors.id))
      .where(eq(loans.memberId, memberId))
      .orderBy(desc(loans.borrowedAt))
      .all();

    return rows.map((row) => ({
      id: row.id,
      book: {
        id: row.book.id,
        title: row.book.title,
        author: {
          id: row.author.id,
          name: row.author.name,
          bio: row.author.bio,
          birthYear: row.author.birthYear,
        },
      },
      borrowedAt: row.borrowedAt.toISOString(),
      dueDate: row.dueDate.toISOString(),
      returnedAt: row.returnedAt ? row.returnedAt.toISOString() : null,
      overdue: row.returnedAt === null && row.dueDate.getTime() < now,
    }));
  }

  /** Count a Book's Active Loans (`returnedAt IS NULL`) — the copies currently out. */
  private activeLoanCount(bookId: number): number {
    const row = this.db
      .select({ count: sql<number>`count(*)` })
      .from(loans)
      .where(and(eq(loans.bookId, bookId), isNull(loans.returnedAt)))
      .get();
    return row?.count ?? 0;
  }

  /** Re-read a single freshly issued Loan through the Active Loans projection. */
  private activeLoanById(loanId: number): ActiveLoanRow {
    const row = this.db
      .select({
        id: loans.id,
        borrowedAt: loans.borrowedAt,
        dueDate: loans.dueDate,
        book: { id: books.id, title: books.title },
        author: authorColumns,
        member: { id: users.id, email: users.email },
      })
      .from(loans)
      .innerJoin(books, eq(loans.bookId, books.id))
      .innerJoin(authors, eq(books.authorId, authors.id))
      .innerJoin(users, eq(loans.memberId, users.id))
      .where(eq(loans.id, loanId))
      .get();

    if (!row) {
      // Unreachable: we just inserted this Loan in the same connection.
      throw new NotFoundException(`Loan ${loanId} not found`);
    }

    return {
      id: row.id,
      book: {
        id: row.book.id,
        title: row.book.title,
        author: {
          id: row.author.id,
          name: row.author.name,
          bio: row.author.bio,
          birthYear: row.author.birthYear,
        },
      },
      member: { id: row.member.id, email: row.member.email },
      borrowedAt: row.borrowedAt.toISOString(),
      dueDate: row.dueDate.toISOString(),
      overdue: row.dueDate.getTime() < Date.now(),
    };
  }
}
