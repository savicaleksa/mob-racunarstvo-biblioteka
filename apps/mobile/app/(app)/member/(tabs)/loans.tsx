import type { MyLoan } from "@repo/shared";
import { useMemo } from "react";
import { SectionList, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Text,
} from "react-native-paper";

import { getErrorMessage } from "../../../../src/api/errors";
import { useMyLoans } from "../../../../src/api/loans";
import { formatDate } from "../../../../src/ui/format";

/**
 * My Loans screen (ticket 09): the Member's own current (Active) and past
 * (returned) Loans, each showing its Book and Author. Active Loans show their Due
 * Date; Overdue ones (the API's `overdue` flag — Active AND past due) are called
 * out with a red badge so the reader knows what to prioritise (user stories
 * 17–20). Active Loans are listed first, Overdue ahead of the rest within them.
 */
export default function MyLoansScreen() {
  const { data, isPending, isError, error, refetch } = useMyLoans();

  const sections = useMemo(() => {
    const loans = data ?? [];
    const active = loans
      .filter((loan) => loan.returnedAt === null)
      // Overdue first, then by soonest Due Date.
      .sort((a, b) => {
        if (a.overdue !== b.overdue) {
          return a.overdue ? -1 : 1;
        }
        return a.dueDate.localeCompare(b.dueDate);
      });
    const past = loans
      .filter((loan) => loan.returnedAt !== null)
      // Most recently returned first.
      .sort((a, b) => (b.returnedAt ?? "").localeCompare(a.returnedAt ?? ""));

    const result: { title: string; data: MyLoan[] }[] = [];
    if (active.length > 0) {
      result.push({ title: "Current loans", data: active });
    }
    if (past.length > 0) {
      result.push({ title: "Past loans", data: past });
    }
    return result;
  }, [data]);

  if (isPending) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text variant="bodyMedium" style={styles.error}>
          {getErrorMessage(error, "Could not load your loans")}
        </Text>
        <Button mode="contained" onPress={() => refetch()}>
          Retry
        </Button>
      </View>
    );
  }

  if (sections.length === 0) {
    return (
      <View style={styles.centered}>
        <Text variant="bodyMedium" style={styles.dim}>
          You have no loans yet. Borrow a Book from the Catalog and it will appear
          here.
        </Text>
      </View>
    );
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(loan) => String(loan.id)}
      contentContainerStyle={styles.listContent}
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section }) => (
        <Text variant="titleMedium" style={styles.sectionHeader}>
          {section.title}
        </Text>
      )}
      renderItem={({ item }) => <LoanRow loan={item} />}
    />
  );
}

/** One Loan: Book + Author, with a Due Date / return date and Overdue status. */
function LoanRow({ loan }: { loan: MyLoan }) {
  const returned = loan.returnedAt !== null;
  return (
    <Card>
      <Card.Title
        title={loan.book.title}
        subtitle={loan.book.author.name}
        titleNumberOfLines={2}
      />
      <Card.Content style={styles.cardContent}>
        {returned ? (
          <Text variant="bodySmall" style={styles.dim}>
            Returned {formatDate(loan.returnedAt as string)}
          </Text>
        ) : (
          <View style={styles.dueRow}>
            <Text variant="bodySmall" style={styles.dim}>
              Due {formatDate(loan.dueDate)}
            </Text>
            {loan.overdue ? (
              <Chip
                compact
                icon="alert"
                mode="flat"
                style={styles.overdueChip}
                textStyle={styles.overdueChipText}
              >
                Overdue
              </Chip>
            ) : (
              <Chip compact icon="clock-outline" mode="outlined">
                Active
              </Chip>
            )}
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  listContent: { padding: 12, gap: 8 },
  sectionHeader: { marginTop: 8, marginBottom: 4 },
  cardContent: { gap: 4 },
  dueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  overdueChip: { backgroundColor: "#B3261E" },
  overdueChipText: { color: "#FFFFFF" },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  error: { textAlign: "center" },
  dim: { opacity: 0.7 },
});
