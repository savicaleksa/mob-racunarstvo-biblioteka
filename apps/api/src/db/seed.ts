import { sql } from "drizzle-orm";

import { createDatabase, type DrizzleDatabase } from "./connection";
import { authors, books } from "./schema";

/**
 * Catalog seed (ADR-0004, spec.md "Backend framework & data layer"): populates
 * **Authors and Books only** — deliberately **no users**, because the very
 * first user to register must become the Owner via the bootstrap, and seeding a
 * user would steal that slot. The database file itself is never committed; this
 * script reproduces a browseable Catalog from scratch.
 *
 * The fixtures intentionally include the Author "Petar Petrovic" (and a Book by
 * them) so the tokenized-search behaviour (ADR-0009) can be exercised end to
 * end: `pet petr`, `Petrovic Petar` (reordered) and `eta etro` (mid-word) all
 * resolve to that Author/Book.
 */

interface SeedAuthor {
  name: string;
  bio: string | null;
  birthYear: number | null;
}

interface SeedBook {
  /** Index into {@link SEED_AUTHORS} of this Book's Author. */
  authorIndex: number;
  title: string;
  totalCopies: number;
  isbn: string | null;
  publishedYear: number | null;
  description: string | null;
}

const SEED_AUTHORS: SeedAuthor[] = [
  {
    name: "Petar Petrovic",
    bio: "A prolific author whose name exercises tokenized search.",
    birthYear: 1965,
  },
  {
    name: "Ivo Andric",
    bio: "Yugoslav novelist and 1961 Nobel laureate in Literature.",
    birthYear: 1892,
  },
  {
    name: "Ursula K. Le Guin",
    bio: "American author of speculative fiction.",
    birthYear: 1929,
  },
  {
    name: "George Orwell",
    bio: null,
    birthYear: 1903,
  },
];

const SEED_BOOKS: SeedBook[] = [
  {
    authorIndex: 0,
    title: "The Collected Stories",
    totalCopies: 3,
    isbn: "978-0-000-00001-1",
    publishedYear: 1998,
    description: "A representative anthology by Petar Petrovic.",
  },
  {
    authorIndex: 1,
    title: "The Bridge on the Drina",
    totalCopies: 2,
    isbn: "978-0-226-02045-7",
    publishedYear: 1945,
    description: "A chronicle of the bridge at Visegrad across four centuries.",
  },
  {
    authorIndex: 2,
    title: "A Wizard of Earthsea",
    totalCopies: 1,
    isbn: "978-0-547-72202-3",
    publishedYear: 1968,
    description: "A young mage comes of age in an archipelago world.",
  },
  {
    authorIndex: 3,
    title: "Nineteen Eighty-Four",
    totalCopies: 4,
    isbn: null,
    publishedYear: 1949,
    description: null,
  },
];

/**
 * Insert the Catalog fixtures into `db`. Idempotent: if the Catalog is already
 * populated (any Author present) it does nothing, so re-running the seed on an
 * existing database is safe and never duplicates rows. Returns the number of
 * Authors and Books inserted.
 */
export function seedCatalog(db: DrizzleDatabase): {
  authors: number;
  books: number;
} {
  const existing = db
    .select({ count: sql<number>`count(*)` })
    .from(authors)
    .get();

  if ((existing?.count ?? 0) > 0) {
    return { authors: 0, books: 0 };
  }

  const insertedAuthorIds = SEED_AUTHORS.map(
    (author) => db.insert(authors).values(author).returning({ id: authors.id }).get().id,
  );

  for (const book of SEED_BOOKS) {
    db.insert(books)
      .values({
        title: book.title,
        authorId: insertedAuthorIds[book.authorIndex]!,
        totalCopies: book.totalCopies,
        isbn: book.isbn,
        publishedYear: book.publishedYear,
        description: book.description,
      })
      .run();
  }

  return { authors: SEED_AUTHORS.length, books: SEED_BOOKS.length };
}

/**
 * CLI entry point: `pnpm --filter @repo/api db:seed`. Opens the real
 * (env/file) database, applies migrations, seeds the Catalog, and reports.
 */
function main(): void {
  const db = createDatabase();
  const result = seedCatalog(db);
  if (result.authors === 0 && result.books === 0) {
    console.log("Catalog already seeded; nothing to do.");
  } else {
    console.log(
      `Seeded Catalog: ${result.authors} authors, ${result.books} books.`,
    );
  }
}

// Only run when executed directly (not when imported by tests).
if (require.main === module) {
  main();
}
