import { existsSync, rmSync } from "node:fs";

import { createDatabase } from "./connection";
import { seedCatalog } from "./seed";

/**
 * One-command database setup for graders (issue 12): delete any existing dev
 * database, recreate it purely from the drizzle-kit migrations, and populate the
 * Catalog seed (Authors + Books; deliberately no users, so the first account to
 * register still becomes the Owner via the bootstrap).
 *
 * Run it with `pnpm --filter @repo/api db:reset`.
 *
 * Cross-platform on purpose (this is a Windows dev box): the DB file is removed
 * with Node's `fs` rather than a shell `rm`, so the same command works on
 * Windows, macOS and Linux. The `.db` file is never committed (ADR-0004); this
 * script reproduces it from scratch.
 */
function main(): void {
  const url = process.env.DATABASE_URL ?? "library.db";

  if (url === ":memory:") {
    console.log("DATABASE_URL is :memory: — nothing to delete.");
  } else {
    // Remove the SQLite database plus its WAL/SHM/journal sidecar files so the
    // reset is total and no stale schema/data survives.
    for (const suffix of ["", "-wal", "-shm", "-journal"]) {
      const file = `${url}${suffix}`;
      if (existsSync(file)) {
        rmSync(file);
        console.log(`Removed ${file}`);
      }
    }
  }

  // `createDatabase()` applies all pending migrations on connect (ADR-0004), so
  // opening the fresh file reproduces the full schema before we seed.
  const db = createDatabase({ url });
  const result = seedCatalog(db);
  console.log(
    `Database reset from migrations. Seeded Catalog: ${result.authors} authors, ${result.books} books.`,
  );
}

main();
