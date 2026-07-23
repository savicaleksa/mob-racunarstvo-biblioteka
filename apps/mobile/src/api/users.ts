import type {
  AssignableRole,
  UpdateUserRoleResponse,
  UsersListResponse,
} from "@repo/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "./client";

/**
 * Users read + role-change surface (issue 07), backing the Owner screen
 * (ticket 11). Both routes are Owner-only. Same one-file shape as the other
 * domains (`books.ts`/`authors.ts`/`loans.ts`): a thin `apiClient` wrapper, a
 * query-key factory, and TanStack Query hooks, typed end-to-end with the
 * `@repo/shared` contract shapes.
 *
 * The role target is constrained to `AssignableRole` (LIBRARIAN | MEMBER) — the
 * API refuses `OWNER` as a target (400) and refuses changing the bootstrap
 * Owner's own role (400); those come back as clear messages for the UI.
 */
export const usersApi = {
  /** `GET /users` [owner] — the full roster (public {@link import("@repo/shared").ApiUser} shape; no passwordHash). */
  async list(): Promise<UsersListResponse> {
    const { data } = await apiClient.get<UsersListResponse>("/users");
    return data;
  },

  /**
   * `PATCH /users/:id/role` [owner] — change a user's role. `role` is limited to
   * an `AssignableRole`; the API rejects `OWNER` and the Owner's own row (400)
   * and a missing id (404).
   */
  async updateRole(
    id: number,
    role: AssignableRole,
  ): Promise<UpdateUserRoleResponse> {
    const { data } = await apiClient.patch<UpdateUserRoleResponse>(
      `/users/${id}/role`,
      { role },
    );
    return data;
  },
};

/** Query-key factory for the Users cache. */
export const userKeys = {
  all: ["users"] as const,
  list: () => ["users", "list"] as const,
};

/** All registered users with their roles (Owner-only). */
export function useUsers() {
  return useQuery({
    queryKey: userKeys.list(),
    queryFn: () => usersApi.list(),
  });
}

/** Change a user's role, then refresh the Users roster. */
export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: number; role: AssignableRole }) =>
      usersApi.updateRole(id, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}
