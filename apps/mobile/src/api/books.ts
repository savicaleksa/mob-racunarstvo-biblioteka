import type {
  BookDetailResponse,
  BooksListResponse,
  ListBooksQuery,
} from "@repo/shared";
import { useQuery } from "@tanstack/react-query";

import { apiClient } from "./client";

/**
 * Books catalog read surface (issue 03), consumed by the Member Catalog and Book
 * detail screens (ticket 09). Structured as one file per domain — a thin
 * `apiClient` wrapper, a query-key factory, and the TanStack Query hooks — so the
 * later staff/owner tickets (10/11) can mirror this shape for their own domains.
 *
 * Every call flows through {@link apiClient}, so the JWT is attached and 401s are
 * handled centrally; types come from `@repo/shared` (the single source of truth).
 */
export const booksApi = {
  /**
   * `GET /books` [auth] — the Catalog. `search` is a tokenized query (ADR-0009)
   * matched over `title + author name`; `available: true` restricts to Books with
   * Availability > 0. Both are omitted from the request when not meaningfully set,
   * so an empty search / off filter means "no filter".
   */
  async list(query: ListBooksQuery = {}): Promise<BooksListResponse> {
    const params: Record<string, string | boolean> = {};
    const search = query.search?.trim();
    if (search) {
      params.search = search;
    }
    if (query.available) {
      params.available = true;
    }
    const { data } = await apiClient.get<BooksListResponse>("/books", {
      params,
    });
    return data;
  },

  /** `GET /books/:id` [auth] — one Book with its Author + derived Availability. */
  async get(id: number): Promise<BookDetailResponse> {
    const { data } = await apiClient.get<BookDetailResponse>(`/books/${id}`);
    return data;
  },
};

/** Query-key factory for the Books cache — one place so keys stay consistent. */
export const bookKeys = {
  all: ["books"] as const,
  list: (query: ListBooksQuery) =>
    ["books", "list", query.search?.trim() ?? "", query.available ?? false] as const,
  detail: (id: number) => ["books", "detail", id] as const,
};

/** Catalog list, reactive to the search text and availability filter. */
export function useBooks(query: ListBooksQuery) {
  return useQuery({
    queryKey: bookKeys.list(query),
    queryFn: () => booksApi.list(query),
  });
}

/** One Book's full detail. Disabled until a valid numeric id is available. */
export function useBook(id: number) {
  return useQuery({
    queryKey: bookKeys.detail(id),
    queryFn: () => booksApi.get(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}
