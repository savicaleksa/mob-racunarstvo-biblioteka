import type {
  AuthorDetailResponse,
  AuthorsListResponse,
  ListAuthorsQuery,
} from "@repo/shared";
import { useQuery } from "@tanstack/react-query";

import { apiClient } from "./client";

/**
 * Authors read surface (issue 03). The Member Catalog uses this to let a reader
 * search Authors by the same tokenized matching as Books (user story 16) — find
 * a writer from partial/reordered name, then jump to their Books. Same one-file
 * shape as `books.ts` (wrapper + keys + hooks) for tickets 10/11 to mirror.
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
