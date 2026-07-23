import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { ApiAuthor } from "@repo/shared";
import { asc, eq } from "drizzle-orm";

import type { DrizzleDatabase } from "../db/connection";
import { DRIZZLE } from "../db/drizzle.module";
import { authors, type Author } from "../db/schema";
import { tokenizedSearchFilter } from "./tokenized-search";

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
