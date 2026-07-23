import { QueryClient } from "@tanstack/react-query";

/**
 * The app-wide TanStack Query client for server state (ADR-0010) — loading,
 * error, refetch, and mutation handling for every screen. A single shared
 * instance so caches are consistent across the app and can be cleared on logout
 * / session expiry (see the auth context). Later tickets (09/10/11) read and
 * mutate through this same client with `useQuery` / `useMutation`.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A 401 is handled by the axios interceptor (redirect to login), so a
      // single retry is enough to ride out a transient network blip without
      // hammering an unreachable LAN host.
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});
