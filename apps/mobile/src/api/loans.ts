import type { MyLoansResponse } from "@repo/shared";
import { useQuery } from "@tanstack/react-query";

import { apiClient } from "./client";

/**
 * The caller's own Loans (issue 06), consumed by the Member My Loans screen
 * (ticket 09). Each Loan carries its Book and Author; Active Loans have
 * `returnedAt: null` and an `overdue` flag the API computes (Active AND Due Date
 * in the past). Same one-file shape as `books.ts` for later tickets to mirror
 * (ticket 10 adds `loansApi.active` / Issue / Return alongside this).
 */
export const loansApi = {
  /** `GET /loans/me` [auth] — own Active + historical Loans, Book + Author joined. */
  async me(): Promise<MyLoansResponse> {
    const { data } = await apiClient.get<MyLoansResponse>("/loans/me");
    return data;
  },
};

/** Query-key factory for the Loans cache. */
export const loanKeys = {
  all: ["loans"] as const,
  me: () => ["loans", "me"] as const,
};

/** The signed-in Member's own Loans (current + past). */
export function useMyLoans() {
  return useQuery({
    queryKey: loanKeys.me(),
    queryFn: () => loansApi.me(),
  });
}
