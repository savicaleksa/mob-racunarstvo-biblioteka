/**
 * The canonical form of an email address in this system: trimmed and lowercased.
 *
 * Email is the library's user-facing identity — members log in with one, and a
 * Librarian names a Loan's member with one (ADR-0011) — so the same address
 * typed on two different screens must resolve to the same account. It lives in
 * `@repo/shared` alongside the wire contracts for the same reason they do: the
 * API and the mobile app have to agree on it exactly. If the client normalised
 * differently from the server, an email the Librarian saw confirmed could still
 * be rejected a moment later at submit.
 *
 * Non-string input is passed through untouched, so a validator (server-side) or
 * the input itself (client-side) still reports the real problem rather than this
 * throwing first.
 */
export function normalizeEmail(value: unknown): unknown {
  return typeof value === "string" ? value.trim().toLowerCase() : value;
}

/** {@link normalizeEmail} for callers that already hold a string. */
export function canonicalEmail(email: string): string {
  return email.trim().toLowerCase();
}
