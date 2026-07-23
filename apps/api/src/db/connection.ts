import path from "node:path";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { schema } from "./schema";

/** The concrete Drizzle database type wired to our schema. */
export type DrizzleDatabase = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Absolute path to the drizzle-kit migrations folder.
 *
 * Resolved relative to this compiled file so it works whether we are running
 * from `src/db` (ts-jest / ts-node) or `dist/db` (compiled) — both are one
 * directory below the `apps/api` package root, whose sibling `drizzle/` folder
 * holds the generated `.sql` migrations.
 */
export const MIGRATIONS_FOLDER = path.resolve(__dirname, "..", "..", "drizzle");

export interface CreateDatabaseOptions {
  /**
   * SQLite location. `:memory:` for an ephemeral in-process DB (used by the
   * e2e harness), or a file path for the real app. Defaults to the
   * `DATABASE_URL` env var, then to `library.db` in the current directory.
   */
  url?: string;
  /** Run pending migrations immediately after connecting. Defaults to `true`. */
  migrate?: boolean;
}

/**
 * Single source of truth for opening a SQLite connection the way the whole app
 * expects it: foreign-key enforcement ON (so RESTRICT deletes actually bite —
 * ADR-0008), WAL journalling for a file DB, and migrations applied up front so
 * the schema is reproduced purely from the drizzle-kit migration files
 * (ADR-0004). Reused verbatim by the e2e harness against a fresh `:memory:` DB.
 */
export function createDatabase(
  options: CreateDatabaseOptions = {},
): DrizzleDatabase {
  const url = options.url ?? process.env.DATABASE_URL ?? "library.db";
  const runMigrations = options.migrate ?? true;

  const sqlite = new Database(url);
  // Enforce foreign keys per-connection — SQLite defaults this OFF.
  sqlite.pragma("foreign_keys = ON");
  if (url !== ":memory:") {
    sqlite.pragma("journal_mode = WAL");
  }

  const db = drizzle(sqlite, { schema });

  if (runMigrations) {
    migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  }

  return db;
}
