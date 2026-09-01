import { useCallback, useState } from "react";
import { RefreshControl } from "react-native";
import { useTheme } from "react-native-paper";

/**
 * Pull-to-refresh for the app's read-only screens: hand it a TanStack Query
 * `refetch` and drop the result into a `FlatList` / `SectionList` / `ScrollView`
 * `refreshControl` prop.
 *
 * Mutations already invalidate the caches they affect, so data *this* device
 * changes is never stale. This gesture exists for the other direction — a Loan
 * Issued or Returned at the desk, a Book edited by a colleague — which nothing
 * would otherwise pull in, because the query client deliberately keeps
 * `refetchOnWindowFocus: false` (see `query-client.ts`).
 *
 * The `refreshing` flag is owned here rather than read from the query's
 * `isRefetching`, which is true for *any* refetch. Returning a Loan invalidates
 * `loanKeys.all` and `bookKeys.all`, so with `isRefetching` the pull spinner
 * would appear on lists the user is merely looking at, unprompted by any
 * gesture. A local flag is true only for a real pull.
 *
 * The spinner is painted from the Paper palette (ADR-0010) because React
 * Native's default — a grey spinner on a hard white disc — sits badly on the
 * espresso surface in dark mode.
 *
 * Lists using this should also carry `flexGrow: 1` on their
 * `contentContainerStyle`: an empty list otherwise collapses to nothing, and
 * its empty-state message parks at the top instead of centring under the pull.
 */
export function useRefreshControl(refetch: () => Promise<unknown>) {
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void (async () => {
      try {
        await refetch();
      } finally {
        // `finally`, so a failed pull clears the spinner instead of sticking.
        // The error itself is already the query's to report.
        setRefreshing(false);
      }
    })();
  }, [refetch]);

  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={theme.colors.primary}
      colors={[theme.colors.primary]}
      progressBackgroundColor={theme.colors.elevation.level2}
    />
  );
}
