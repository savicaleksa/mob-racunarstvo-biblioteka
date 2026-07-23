import type {
  AuthorDetailResponse,
  AuthorsListResponse,
  CreateAuthorRequest,
  CreateAuthorResponse,
  ListAuthorsQuery,
  UpdateAuthorRequest,
  UpdateAuthorResponse,
} from "@repo/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "./client";
import { bookKeys } from "./books";

/**
 * Authors read + write surface. Reads (issue 03) back the Member Catalog's
 * Author search (ticket 09); the CRUD writes (issue 04) back the Librarian
 * Author management screens (ticket 10). Same one-file shape as `books.ts`
 * (wrapper + keys + hooks). A Book embeds its Author, so Author writes also
 * invalidate the Books cache (`bookKeys.all`) to keep Book lists' Author names
 * fresh.
 */
export const authorsApi = {
  /**
   * `GET /authors` [auth]. `search` is a tokenized query (ADR-0009) matched over
   * the Author `name`; omitted from the request when empty (→ no filter).
   */
  async list(query: ListAuthorsQuery = {}): Promise<AuthorsListResponse> {
    const params: Record<string, string> = {};
    const search = query.search?.trim();
    if (search) {
      params.search = search;
    }
    const { data } = await apiClient.get<AuthorsListResponse>("/authors", {
      params,
    });
    return data;
  },

  /** `GET /authors/:id` [auth] — one Author. */
  async get(id: number): Promise<AuthorDetailResponse> {
    const { data } = await apiClient.get<AuthorDetailResponse>(`/authors/${id}`);
    return data;
  },

  /** `POST /authors` [librarian+] — create an Author. */
  async create(body: CreateAuthorRequest): Promise<CreateAuthorResponse> {
    const { data } = await apiClient.post<CreateAuthorResponse>(
      "/authors",
      body,
    );
    return data;
  },

  /** `PATCH /authors/:id` [librarian+] — update an Author. */
  async update(
    id: number,
    body: UpdateAuthorRequest,
  ): Promise<UpdateAuthorResponse> {
    const { data } = await apiClient.patch<UpdateAuthorResponse>(
      `/authors/${id}`,
      body,
    );
    return data;
  },

  /**
   * `DELETE /authors/:id` [librarian+] — remove an Author. Rejected with a 409
   * (surfaced as a domain message) when the Author still has Books (RESTRICT).
   */
  async remove(id: number): Promise<void> {
    await apiClient.delete(`/authors/${id}`);
  },
};

/** Query-key factory for the Authors cache. */
export const authorKeys = {
  all: ["authors"] as const,
  list: (query: ListAuthorsQuery) =>
    ["authors", "list", query.search?.trim() ?? ""] as const,
  detail: (id: number) => ["authors", "detail", id] as const,
};

/** Author list, reactive to the search text. */
export function useAuthors(query: ListAuthorsQuery) {
  return useQuery({
    queryKey: authorKeys.list(query),
    queryFn: () => authorsApi.list(query),
  });
}

/** One Author's detail. Disabled until a valid numeric id is available. */
export function useAuthor(id: number) {
  return useQuery({
    queryKey: authorKeys.detail(id),
    queryFn: () => authorsApi.get(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

/** Create an Author, then refresh the Author lists. */
export function useCreateAuthor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAuthorRequest) => authorsApi.create(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: authorKeys.all });
    },
  });
}

/**
 * Update an Author, then refresh the Author lists and the Books cache (Book
 * rows embed the Author name, so a rename must show through there too).
 */
export function useUpdateAuthor(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateAuthorRequest) => authorsApi.update(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: authorKeys.all });
      void queryClient.invalidateQueries({ queryKey: bookKeys.all });
    },
  });
}

/** Delete an Author, then refresh the Author lists. */
export function useDeleteAuthor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => authorsApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: authorKeys.all });
    },
  });
}
