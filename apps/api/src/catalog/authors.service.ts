import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  ApiAuthor,
  CreateAuthorRequest,
  UpdateAuthorRequest,
} from "@repo/shared";
import { asc, eq } from "drizzle-orm";

import type { DrizzleDatabase } from "../db/connection";
import { DRIZZLE } from "../db/drizzle.module";
import { authors, type Author } from "../db/schema";
import { tokenizedSearchFilter } from "./tokenized-search";

/**
 * Prefix of better-sqlite3's error code for any constraint violation. A
 * RESTRICT foreign key (ADR-0008) surfaces here — SQLite reports the RESTRICT
 * subcode as `SQLITE_CONSTRAINT_TRIGGER` (not `..._FOREIGNKEY`), so we match on
 * the shared prefix. On a bare `DELETE authors`, the only constraint that can
 * fire is the Books→Authors FK, so this reliably means "the Author still has
 * Books"; we surface it as a friendly 409 instead of a raw 500.
 */
const SQLITE_CONSTRAINT_PREFIX = "SQLITE_CONSTRAINT";

/**
 * Read use-cases for the Author side of the Catalog (issue 03). Lists Authors
 * with optional tokenized search over `name` (ADR-0009) and looks one up by id.
 * Author CRUD is added in ticket 04 on top of this same service/table.
 */
@Injectable()
export class AuthorsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  /** List Authors, optionally filtered by a tokenized `search` over `name`. */
  list(search?: string): ApiAuthor[] {
    const filter = tokenizedSearchFilter(authors.name, search);

    const rows = this.db
      .select()
      .from(authors)
      .where(filter)
      .orderBy(asc(authors.name))
      .all();

    return rows.map(toApiAuthor);
  }

  /** Fetch one Author by id, or 404 if it does not exist. */
  getById(id: number): ApiAuthor {
    const row = this.db.select().from(authors).where(eq(authors.id, id)).get();

    if (!row) {
      throw new NotFoundException(`Author ${id} not found`);
    }

    return toApiAuthor(row);
  }

  /**
   * Create an Author (librarian+). `name` is required; `bio`/`birthYear` are
   * optional and stored as `null` when omitted.
   */
  create(input: CreateAuthorRequest): ApiAuthor {
    const row = this.db
      .insert(authors)
      .values({
        name: input.name,
        bio: input.bio ?? null,
        birthYear: input.birthYear ?? null,
      })
      .returning()
      .get();

    return toApiAuthor(row);
  }

  /**
   * Edit an Author's details (librarian+). Only the keys present in `input` are
   * written; sending `bio`/`birthYear` as `null` clears them. 404 if the Author
   * does not exist. A no-op patch (empty body) just returns the current row.
   */
  update(id: number, input: UpdateAuthorRequest): ApiAuthor {
    const changes: Partial<typeof authors.$inferInsert> = {};
    if (input.name !== undefined) changes.name = input.name;
    if (input.bio !== undefined) changes.bio = input.bio;
    if (input.birthYear !== undefined) changes.birthYear = input.birthYear;

    if (Object.keys(changes).length === 0) {
      return this.getById(id);
    }

    const row = this.db
      .update(authors)
      .set(changes)
      .where(eq(authors.id, id))
      .returning()
      .get();

    if (!row) {
      throw new NotFoundException(`Author ${id} not found`);
    }

    return toApiAuthor(row);
  }

  /**
   * Delete an Author (librarian+). 404 if missing. Deleting an Author who still
   * has Books is blocked by the RESTRICT foreign key (ADR-0008): SQLite throws a
   * constraint error, which we catch and re-raise as a 409 ConflictException so
   * catalog data is left intact instead of cascading.
   */
  delete(id: number): void {
    const existing = this.db
      .select({ id: authors.id })
      .from(authors)
      .where(eq(authors.id, id))
      .get();

    if (!existing) {
      throw new NotFoundException(`Author ${id} not found`);
    }

    try {
      this.db.delete(authors).where(eq(authors.id, id)).run();
    } catch (error) {
      if (isForeignKeyConstraintError(error)) {
        throw new ConflictException(
          `Author ${id} still has Books and cannot be deleted; reassign or remove those Books first`,
        );
      }
      throw error;
    }
  }
}

/** True when `error` is a better-sqlite3 constraint failure (the RESTRICT FK). */
function isForeignKeyConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string" &&
    (error as { code: string }).code.startsWith(SQLITE_CONSTRAINT_PREFIX)
  );
}

/** Project an `authors` row to the shared {@link ApiAuthor} wire shape. */
export function toApiAuthor(author: Author): ApiAuthor {
  return {
    id: author.id,
    name: author.name,
    bio: author.bio,
    birthYear: author.birthYear,
  };
}
