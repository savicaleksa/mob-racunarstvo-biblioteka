import type {
  AssignableRole,
  MemberLookupResponse,
  UpdateUserRoleResponse,
  UsersListResponse,
} from "@repo/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "./client";

/**
 * Users read + role-change surface (issue 07), backing the Owner screen
 * (ticket 11) and the Librarian's member-email check on the Issue Loan form
 * (ADR-0011). `list` and `updateRole` are Owner-only; `lookup` is librarian+.
 * Same one-file shape as the other
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

  /**
   * `GET /users/lookup?email=` [librarian+] — whether an account with this email
   * is registered. Always 200, so `{ exists: false }` is data rather than a
   * thrown error; a rejection here means the check could not run at all.
   */
  async lookup(email: string): Promise<MemberLookupResponse> {
    const { data } = await apiClient.get<MemberLookupResponse>(
      "/users/lookup",
      { params: { email } },
    );
    return data;
  },
};

/** Query-key factory for the Users cache. */
export const userKeys = {
  all: ["users"] as const,
  list: () => ["users", "list"] as const,
  lookup: (email: string) => ["users", "lookup", email] as const,
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

/**
 * Check whether `email` belongs to a registered account (librarian+), for the
 * Issue Loan form's member check.
 *
 * Disabled while `email` is null, which is how the caller withholds a value not
 * worth spending a request on. The caller decides *when* to ask — on blur, not
 * on every keystroke — and screens out anything that cannot be an address
 * before passing it here; this endpoint is an email-existence oracle and should
 * be asked as few times as possible (ADR-0011).
 *
 * The three outcomes are deliberately distinct for the UI: `data.exists === false`
 * means the email is genuinely not registered, while `isError` means the check
 * itself failed (offline, expired token) and must NOT be rendered as "no such
 * member". Results are deliberately *not* held stale: someone can register while
 * this form is open, and a cached "not registered" would outlive the truth.
 *
 * `retry: false` keeps a failed check from silently retrying behind the
 * Librarian's back — the form surfaces the failure and re-checks on the next
 * blur.
 */
export function useMemberLookup(email: string | null) {
  return useQuery({
    queryKey: userKeys.lookup(email ?? ""),
    queryFn: () => usersApi.lookup(email!),
    enabled: email !== null && email.length > 0,
    retry: false,
  });
}
