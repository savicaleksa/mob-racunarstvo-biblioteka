import type {
  ActiveLoansResponse,
  IssueLoanRequest,
  IssueLoanResponse,
  MyLoansResponse,
  ReturnLoanResponse,
} from "@repo/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { bookKeys } from "./books";
import { apiClient } from "./client";

/**
 * Loans read + write surface (issue 06). `me` backs the Member My Loans screen
 * (ticket 09); `active` / Issue / Return back the Librarian lending screens
 * (ticket 10). Each Loan carries its Book and Author; Active Loans have
 * `returnedAt: null` and an `overdue` flag the API computes.
 *
 * Issue and Return change what is out on loan, which changes derived
 * Availability (ADR-0007), so both invalidate the Books cache (`bookKeys.all`)
 * as well as the Loans cache — the Catalog's free-copy counts stay truthful.
 */
export const loansApi = {
  /** `GET /loans/me` [auth] — own Active + historical Loans, Book + Author joined. */
  async me(): Promise<MyLoansResponse> {
    const { data } = await apiClient.get<MyLoansResponse>("/loans/me");
    return data;
  },

  /**
   * `GET /loans/active` [librarian+] — the showcase JOIN: every Active Loan with
   * its Book, Author, Member, and Due Date; Overdue precomputed.
   */
  async active(): Promise<ActiveLoansResponse> {
    const { data } = await apiClient.get<ActiveLoansResponse>("/loans/active");
    return data;
  },

  /**
   * `POST /loans` [librarian+] — Issue a Loan. `dueDate` is optional (defaults to
   * borrow date + 14 days). 400 on an invalid bookId/memberId; 409 when the Book
   * has no Availability.
   */
  async issue(body: IssueLoanRequest): Promise<IssueLoanResponse> {
    const { data } = await apiClient.post<IssueLoanResponse>("/loans", body);
    return data;
  },

  /** `PATCH /loans/:id/return` [librarian+] — record a Return (409 if already returned). */
  async return(id: number): Promise<ReturnLoanResponse> {
    const { data } = await apiClient.patch<ReturnLoanResponse>(
      `/loans/${id}/return`,
    );
    return data;
  },
};

/** Query-key factory for the Loans cache. */
export const loanKeys = {
  all: ["loans"] as const,
  me: () => ["loans", "me"] as const,
  active: () => ["loans", "active"] as const,
};

/** The signed-in Member's own Loans (current + past). */
export function useMyLoans() {
  return useQuery({
    queryKey: loanKeys.me(),
    queryFn: () => loansApi.me(),
  });
}

/** All Active Loans (librarian+) — Book, Author, Member, Due Date, Overdue. */
export function useActiveLoans() {
  return useQuery({
    queryKey: loanKeys.active(),
    queryFn: () => loansApi.active(),
  });
}

/** Issue a Loan, then refresh Active Loans and the Catalog's Availability. */
export function useIssueLoan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: IssueLoanRequest) => loansApi.issue(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: loanKeys.all });
      void queryClient.invalidateQueries({ queryKey: bookKeys.all });
    },
  });
}

/** Record a Return, then refresh Active Loans and the Catalog's Availability. */
export function useReturnLoan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => loansApi.return(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: loanKeys.all });
      void queryClient.invalidateQueries({ queryKey: bookKeys.all });
    },
  });
}
