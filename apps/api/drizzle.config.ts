import { defineConfig } from "drizzle-kit";

/**
 * drizzle-kit configuration (ADR-0003/0004). Schema lives in TypeScript;
 * migrations are generated into `./drizzle` and are the sole reproduction path
 * for the database — the `.db` file itself is never committed.
 *
 * Generate a migration after changing the schema:
 *   pnpm --filter @repo/api db:generate
 */
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "library.db",
  },
});
