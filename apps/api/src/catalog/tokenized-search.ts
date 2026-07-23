import { sql, type SQL, type SQLWrapper } from "drizzle-orm";

/**
 * Tokenized substring search (ADR-0009).
 *
 * A search query is split on whitespace into tokens; **every** token must appear
 * as a case-insensitive substring of the target expression, ANDed together and
 * order-independent. Each token becomes one escaped `LIKE '%' || token || '%'`
 * so a multi-word or reordered query still matches: `pet petr`,
 * `Petrovic Petar` and `eta etro` all match "Petar Petrovic".
 *
 * Shared by the Authors and Books read APIs (issue 03) and reusable by Author
 * CRUD search (ticket 04): pass the SQL expression to match over (a single
 * column for Authors, `title || ' ' || name` for Books).
 */

/** Backslash is our LIKE escape character (`... ESCAPE '\'`). */
const LIKE_ESCAPE = "\\";

/**
 * Split a raw query into search tokens. Whitespace-delimited; empty/whitespace
 * input yields no tokens. Exposed for callers that want the token list directly.
 */
export function tokenize(query: string | null | undefined): string[] {
  if (!query) {
    return [];
  }
  return query.split(/\s+/).filter((token) => token.length > 0);
}

/**
 * Escape the LIKE wildcards `%` and `_` (and the escape char itself) in user
 * input so a token is matched literally and cannot inject wildcards.
 */
function escapeLike(token: string): string {
  return token.replace(/[\\%_]/g, (char) => LIKE_ESCAPE + char);
}

/**
 * Build a Drizzle `SQL` condition that matches `target` against a tokenized
 * `query`: one case-insensitive `LIKE '%token%'` per token, ANDed together.
 *
 * Returns `undefined` when the query is empty/absent so the caller can treat it
 * as "no filter" (drizzle's `and(...)` skips `undefined` operands).
 *
 * @param target The SQL expression to search within — a column (e.g.
 *   `authors.name`) or a concatenation like `books.title || ' ' || authors.name`.
 * @param query The raw user search string.
 */
export function tokenizedSearchFilter(
  target: SQLWrapper,
  query: string | null | undefined,
): SQL | undefined {
  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return undefined;
  }

  const conditions = tokens.map((token) => {
    const pattern = `%${escapeLike(token.toLowerCase())}%`;
    // lower(target) makes matching case-insensitive across the whole target;
    // the pattern is already lowercased. ESCAPE neutralises %/_ in user input.
    return sql`lower(${target}) like ${pattern} escape ${LIKE_ESCAPE}`;
  });

  return sql.join(conditions, sql` and `);
}
