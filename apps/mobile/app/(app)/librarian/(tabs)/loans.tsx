import type { ActiveLoanRow } from "@repo/shared";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, FlatList, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  FAB,
  Snackbar,
  Text,
  useTheme,
} from "react-native-paper";

import { getErrorMessage } from "../../../../src/api/errors";
import { useActiveLoans, useReturnLoan } from "../../../../src/api/loans";
import { formatDate } from "../../../../src/ui/format";
import { useRefreshControl } from "../../../../src/ui/use-refresh-control";

/**
 * Active Loans tab (ticket 10): everything currently out on loan in one place —
 * each row joins Book, Author, Member (email), and Due Date, with Overdue
 * surfaced (user stories 37–38). A Return is recorded from here; on success the
 * Loans + Books caches are invalidated so the row disappears and the freed copy
 * shows back up in Availability. The FAB opens the Issue Loan form.
 */
export default function ActiveLoansScreen() {
  const router = useRouter();
  const { data, isPending, isError, error, refetch } = useActiveLoans();
  const returnLoan = useReturnLoan();
  const refreshControl = useRefreshControl(refetch);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  function confirmReturn(loan: ActiveLoanRow) {
    Alert.alert(
      "Record return",
      `Return "${loan.book.title}" borrowed by ${loan.member.email}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Return",
          onPress: () => {
            returnLoan.mutate(loan.id, {
              onError: (err) =>
                setSnackbar(getErrorMessage(err, "Could not record the return")),
            });
          },
        },
      ],
    );
  }

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
          {getErrorMessage(error, "Could not load active loans")}
        </Text>
        <Button mode="contained" onPress={() => refetch()}>
          Retry
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <FlatList
        data={data}
        keyExtractor={(loan) => String(loan.id)}
        contentContainerStyle={[
          styles.listContent,
          data.length === 0 ? styles.listContentEmpty : null,
        ]}
        refreshControl={refreshControl}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text variant="bodyMedium" style={styles.dim}>
              Nothing is out on loan right now. Tap + to issue one.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <LoanRow
            loan={item}
            returning={returnLoan.isPending}
            onReturn={() => confirmReturn(item)}
          />
        )}
      />
      <FAB
        icon="plus"
        label="Issue loan"
        style={styles.fab}
        onPress={() => router.push("/librarian/loans/new")}
      />
      <Snackbar
        visible={snackbar !== null}
        onDismiss={() => setSnackbar(null)}
        duration={5000}
      >
        {snackbar}
      </Snackbar>
    </View>
  );
}

/** One Active Loan: Book + Author, Member email, Due Date, Overdue, Return. */
function LoanRow({
  loan,
  returning,
  onReturn,
}: {
  loan: ActiveLoanRow;
  returning: boolean;
  onReturn: () => void;
}) {
  const theme = useTheme();
  return (
    <Card>
      <Card.Title
        title={loan.book.title}
        subtitle={loan.book.author.name}
        titleNumberOfLines={2}
      />
      <Card.Content style={styles.cardContent}>
        <Text variant="bodySmall" style={styles.dim}>
          Borrowed by {loan.member.email}
        </Text>
        <View style={styles.dueRow}>
          <Text variant="bodySmall" style={styles.dim}>
            Due {formatDate(loan.dueDate)}
          </Text>
          {loan.overdue ? (
            <Chip
              compact
              icon="alert"
              mode="flat"
              style={{ backgroundColor: theme.colors.errorContainer }}
              textStyle={{ color: theme.colors.onErrorContainer }}
            >
              Overdue
            </Chip>
          ) : (
            <Chip compact icon="clock-outline" mode="outlined">
              Active
            </Chip>
          )}
        </View>
      </Card.Content>
      <Card.Actions>
        <Button
          mode="contained-tonal"
          icon="book-arrow-left"
          onPress={onReturn}
          disabled={returning}
        >
          Return
        </Button>
      </Card.Actions>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listContent: { padding: 12, gap: 8, paddingBottom: 96, flexGrow: 1 },
  // No cards to clear the FAB of, so drop the clearance and centre honestly.
  listContentEmpty: { paddingBottom: 12 },
  cardContent: { gap: 4 },
  dueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  error: { textAlign: "center" },
  dim: { opacity: 0.7 },
  fab: { position: "absolute", right: 16, bottom: 16 },
});
