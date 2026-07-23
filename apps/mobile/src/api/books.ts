import type {
  BookDetailResponse,
  BooksListResponse,
  CreateBookRequest,
  CreateBookResponse,
  ListBooksQuery,
  UpdateBookRequest,
  UpdateBookResponse,
} from "@repo/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "./client";

/**
 * Books catalog read + write surface. Reads (issue 03) back the Member Catalog
 * and Book detail (ticket 09); the CRUD writes (issue 05) back the Librarian
 * Book management screens (ticket 10). Structured as one file per domain — a
 * thin `apiClient` wrapper, a query-key factory, and the TanStack Query hooks.
 *
 * Every call flows through {@link apiClient}, so the JWT is attached and 401s are
 * handled centrally; types come from `@repo/shared` (the single source of truth).
 * Writes invalidate `bookKeys.all` so the Catalog and derived Availability
 * refresh (Availability is computed on read, ADR-0007).
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

  /** `POST /books` [librarian+] — create a Book (bad authorId → 400 message). */
  async create(body: CreateBookRequest): Promise<CreateBookResponse> {
    const { data } = await apiClient.post<CreateBookResponse>("/books", body);
    return data;
  },

  /** `PATCH /books/:id` [librarian+] — update a Book, including Total Copies. */
  async update(
    id: number,
    body: UpdateBookRequest,
  ): Promise<UpdateBookResponse> {
    const { data } = await apiClient.patch<UpdateBookResponse>(
      `/books/${id}`,
      body,
    );
    return data;
  },

  /**
   * `DELETE /books/:id` [librarian+] — remove a Book. Rejected with a 409
   * (surfaced as a domain message) when the Book has ANY Loan (RESTRICT), so
   * lending history is preserved.
   */
  async remove(id: number): Promise<void> {
    await apiClient.delete(`/books/${id}`);
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

/** Create a Book, then refresh the Catalog (list + Availability). */
export function useCreateBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateBookRequest) => booksApi.create(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookKeys.all });
    },
  });
}

/** Update a Book (incl. Total Copies), then refresh the Catalog + Availability. */
export function useUpdateBook(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateBookRequest) => booksApi.update(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookKeys.all });
    },
  });
}

/** Delete a Book, then refresh the Catalog. */
export function useDeleteBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => booksApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookKeys.all });
    },
  });
}
