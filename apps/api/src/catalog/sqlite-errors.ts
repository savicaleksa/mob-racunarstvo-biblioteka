/**
 * Prefix of better-sqlite3's error code for any constraint violation. A
 * RESTRICT foreign key (ADR-0008) surfaces here — SQLite reports the RESTRICT
 * subcode as `SQLITE_CONSTRAINT_TRIGGER` (not `..._FOREIGNKEY`), so we match on
 * the shared prefix rather than an exact code. Both Author deletes (still has
 * Books) and Book deletes (still has Loans) rely on this to turn the raw
 * constraint failure into a friendly 409 instead of a 500.
 */
const SQLITE_CONSTRAINT_PREFIX = "SQLITE_CONSTRAINT";

/**
 * True when `error` is a better-sqlite3 constraint failure — in this codebase
 * that always means a RESTRICT foreign key blocked a delete (ADR-0008), which
 * callers surface as a `ConflictException`.
 */
export function isForeignKeyConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string" &&
    (error as { code: string }).code.startsWith(SQLITE_CONSTRAINT_PREFIX)
  );
}
