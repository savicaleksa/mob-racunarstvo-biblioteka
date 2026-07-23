import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { ApiBook } from "@repo/shared";
import { and, asc, eq, sql, type SQL } from "drizzle-orm";

import type { DrizzleDatabase } from "../db/connection";
import { DRIZZLE } from "../db/drizzle.module";
import { authors, books, loans } from "../db/schema";
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
