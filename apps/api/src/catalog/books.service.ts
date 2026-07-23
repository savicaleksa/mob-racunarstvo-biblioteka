import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  ApiBook,
  CreateBookRequest,
  UpdateBookRequest,
} from "@repo/shared";
import { and, asc, eq, sql, type SQL } from "drizzle-orm";

import type { DrizzleDatabase } from "../db/connection";
import { DRIZZLE } from "../db/drizzle.module";
import { authors, books, loans } from "../db/schema";
import { isForeignKeyConstraintError } from "./sqlite-errors";
import { tokenizedSearchFilter } from "./tokenized-search";

/**
 * The projected columns for a Book row: the Book's own fields, its Author joined
 * in, and Availability derived in SQL (never a stored column — ADR-0007).
 */
interface BookRow {
  id: number;
  title: string;
  totalCopies: number;
  availability: number;
  isbn: string | null;
  publishedYear: number | null;
  description: string | null;
  author: {
    id: number;
    name: string;
    bio: string | null;
    birthYear: number | null;
  };
}

/**
 * Read use-cases for the Book side of the Catalog (issue 03). Every Book carries
 * its Author (joined) and its derived Availability (`totalCopies − count(active
 * loans)`, ADR-0007). Lists support tokenized search over `title + author name`
 * (ADR-0009) and an `available` filter. Book CRUD (ticket 05) and lending
 * (ticket 06) build on this table; the availability derivation here is the
 * single truthful source they must not duplicate as a stored counter.
 */
@Injectable()
export class BooksService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  /**
   * List Books with Author + Availability, optionally filtered by a tokenized
   * `search` over `title + author name` and/or restricted to those currently
   * available (Availability > 0).
   */
  list(search?: string, available?: boolean): ApiBook[] {
    const availability = this.availabilityExpr();

    // Search matches over the Book title AND its Author's name together, so a
    // token may land in either (spec.md "Tokenized search").
    const searchTarget = sql`${books.title} || ' ' || ${authors.name}`;
    const searchFilter = tokenizedSearchFilter(searchTarget, search);
    const availableFilter = available
      ? sql`${availability} > 0`
      : undefined;

    const rows = this.db
      .select(this.selection(availability))
      .from(books)
      .innerJoin(authors, eq(books.authorId, authors.id))
      .where(and(searchFilter, availableFilter))
      .orderBy(asc(books.title))
      .all();

    return rows.map(toApiBook);
  }

  /** Fetch one Book (with Author + Availability) by id, or 404 if missing. */
  getById(id: number): ApiBook {
    const availability = this.availabilityExpr();

    const row = this.db
      .select(this.selection(availability))
      .from(books)
      .innerJoin(authors, eq(books.authorId, authors.id))
      .where(eq(books.id, id))
      .get();

    if (!row) {
      throw new NotFoundException(`Book ${id} not found`);
    }

    return toApiBook(row);
  }

  /**
   * Create a Book (librarian+). `title` and `authorId` are required;
   * `totalCopies` defaults to 1 (the Total Copies column default) when omitted;
   * `isbn`/`publishedYear`/`description` default to `null`. The `authorId` is
   * validated against an existing Author first, so a bad reference is a clean
   * 400 rather than a raw foreign-key 500. Returns the created Book projected
   * through the read surface, so it already carries its Author and derived
   * Availability (ADR-0007).
   */
  create(input: CreateBookRequest): ApiBook {
    this.assertAuthorExists(input.authorId);

    const row = this.db
      .insert(books)
      .values({
        title: input.title,
        authorId: input.authorId,
        totalCopies: input.totalCopies ?? 1,
        isbn: input.isbn ?? null,
        publishedYear: input.publishedYear ?? null,
        description: input.description ?? null,
      })
      .returning({ id: books.id })
      .get();

    return this.getById(row.id);
  }

  /**
   * Edit a Book's details (librarian+), including `totalCopies`. Only the keys
   * present in `input` are written; `isbn`/`publishedYear`/`description` may be
   * sent as `null` to clear them. A present `authorId` is validated against an
   * existing Author (clean 400, not a 500). 404 if the Book does not exist. A
   * no-op patch just returns the current row (with fresh derived Availability).
   */
  update(id: number, input: UpdateBookRequest): ApiBook {
    const existing = this.db
      .select({ id: books.id })
      .from(books)
      .where(eq(books.id, id))
      .get();

    if (!existing) {
      throw new NotFoundException(`Book ${id} not found`);
    }

    const changes: Partial<typeof books.$inferInsert> = {};
    if (input.title !== undefined) changes.title = input.title;
    if (input.authorId !== undefined) {
      this.assertAuthorExists(input.authorId);
      changes.authorId = input.authorId;
    }
    if (input.totalCopies !== undefined) changes.totalCopies = input.totalCopies;
    if (input.isbn !== undefined) changes.isbn = input.isbn;
    if (input.publishedYear !== undefined)
      changes.publishedYear = input.publishedYear;
    if (input.description !== undefined) changes.description = input.description;

    if (Object.keys(changes).length > 0) {
      this.db.update(books).set(changes).where(eq(books.id, id)).run();
    }

    return this.getById(id);
  }

  /**
   * Delete a Book (librarian+). 404 if missing. Deleting a Book that has ANY
   * Loan — Active or historical — is blocked by the RESTRICT foreign key
   * (ADR-0008): SQLite throws a constraint error, which we catch and re-raise as
   * a 409 ConflictException so lending history is left intact instead of
   * cascading.
   */
  delete(id: number): void {
    const existing = this.db
      .select({ id: books.id })
      .from(books)
      .where(eq(books.id, id))
      .get();

    if (!existing) {
      throw new NotFoundException(`Book ${id} not found`);
    }

    try {
      this.db.delete(books).where(eq(books.id, id)).run();
    } catch (error) {
      if (isForeignKeyConstraintError(error)) {
        throw new ConflictException(
          `Book ${id} has Loans (active or historical) and cannot be deleted; its lending history is preserved`,
        );
      }
      throw error;
    }
  }

  /**
   * Guard that `authorId` references an existing Author, so a create/update with
   * a bad reference surfaces as a clean 400 instead of a raw foreign-key 500.
   */
  private assertAuthorExists(authorId: number): void {
    const author = this.db
      .select({ id: authors.id })
      .from(authors)
      .where(eq(authors.id, authorId))
      .get();

    if (!author) {
      throw new BadRequestException(`Author ${authorId} does not exist`);
    }
  }

  /**
   * Availability derived on read (ADR-0007): `totalCopies` minus the count of
   * this Book's Active Loans (`returnedAt IS NULL`). A correlated subquery, so
   * it also works verbatim inside a WHERE for the `available` filter.
   */
  private availabilityExpr(): SQL<number> {
    return sql<number>`(${books.totalCopies} - (select count(*) from ${loans} where ${loans.bookId} = ${books.id} and ${loans.returnedAt} is null))`;
  }

  /** The shared column projection for both list and detail queries. */
  private selection(availability: SQL<number>) {
    return {
      id: books.id,
      title: books.title,
      totalCopies: books.totalCopies,
      availability,
      isbn: books.isbn,
      publishedYear: books.publishedYear,
      description: books.description,
      author: {
        id: authors.id,
        name: authors.name,
        bio: authors.bio,
        birthYear: authors.birthYear,
      },
    };
  }
}

/** Project a joined Book row to the shared {@link ApiBook} wire shape. */
function toApiBook(row: BookRow): ApiBook {
  return {
    id: row.id,
    title: row.title,
    author: {
      id: row.author.id,
      name: row.author.name,
      bio: row.author.bio,
      birthYear: row.author.birthYear,
    },
    totalCopies: row.totalCopies,
    availability: row.availability,
    isbn: row.isbn,
    publishedYear: row.publishedYear,
    description: row.description,
  };
}
