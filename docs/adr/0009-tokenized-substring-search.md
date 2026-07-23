# Tokenized per-token substring search for books and authors

Catalog search is **tokenized**: the query is split on whitespace, and **every token must appear as a case-insensitive substring** of the target, ANDed together and order-independent. Books search over `title + author name`, authors over `name`. Implemented in SQL as one escaped `LIKE '%' || :token || '%'` per token (with `%`/`_` escaped so user input can't inject wildcards).

This satisfies the intended behavior precisely: `pet petr`, `Petrovic Petar` (reordered), and `eta etro` (mid-word) all match "Petar Petrovic". It is explicitly **not** a naive full-string `ILIKE` — a single `ILIKE '%eta etro%'` would fail; the behavior only works because the query is tokenized and each token matched independently.

## Considered Options

- **Naive full-string `ILIKE`** — rejected: fails on reordering and multi-token queries.
- **SQLite FTS5** — genuine full-text search with ranking, but requires FTS virtual tables kept in sync via triggers on every write. More machinery and a sync-bug surface than this feature warrants.

## Consequences

- Substring `LIKE` cannot use an index, so search scans the table. Fine at this scale; FTS5 is the upgrade path if that ever matters.
- Typo tolerance (edit-distance / trigram) is explicitly out of scope; only reordering and substring matching are supported.
