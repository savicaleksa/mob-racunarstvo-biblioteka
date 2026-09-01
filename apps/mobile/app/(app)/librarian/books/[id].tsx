import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Chip,
  Divider,
  Snackbar,
  Text,
  useTheme,
} from "react-native-paper";

import { useBook, useDeleteBook } from "../../../../src/api/books";
import { getErrorMessage } from "../../../../src/api/errors";
import { useRefreshControl } from "../../../../src/ui/use-refresh-control";

/**
 * Book detail for the Librarian (ticket 10, user stories 29–31): the Book's
 * details plus its computed Availability and Total Copies, then Edit or Delete.
 * Deleting a Book that has ANY Loan (active or historical) is blocked by the API
 * with a 409 (RESTRICT) so lending history is preserved; that domain message is
 * surfaced clearly in a Snackbar. A successful delete pops back to the Catalog.
 */
export default function LibrarianBookDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();
  const theme = useTheme();
  const { data: book, isPending, isError, error, refetch } = useBook(id);
  const deleteBook = useDeleteBook();
  // Availability drifts as readers borrow it (ADR-0007), so allow a re-check.
  const refreshControl = useRefreshControl(refetch);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function confirmDelete() {
    if (!book) {
      return;
    }
    Alert.alert("Delete book", `Delete "${book.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setDeleteError(null);
          deleteBook.mutate(id, {
            onSuccess: () => router.back(),
            onError: (err) =>
              setDeleteError(getErrorMessage(err, "Could not delete the book")),
          });
        },
      },
    ]);
  }

  if (isPending) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: "Book" }} />
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: "Book" }} />
        <Text variant="bodyMedium" style={styles.error}>
          {getErrorMessage(error, "Could not load this book")}
        </Text>
        <Button mode="contained" onPress={() => refetch()}>
          Retry
        </Button>
      </View>
    );
  }

  const borrowable = book.availability > 0;

  return (
    <View style={styles.flex}>
      <Stack.Screen options={{ title: book.title }} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={refreshControl}
      >
        <Text variant="headlineSmall">{book.title}</Text>
        <Text variant="titleMedium" style={styles.author}>
          {book.author.name}
        </Text>

        <View style={styles.chipRow}>
          <Chip icon={borrowable ? "check-circle" : "close-circle"}>
            {borrowable ? `${book.availability} available` : "All on loan"}
          </Chip>
          <Chip icon="book-multiple" mode="outlined">
            {book.totalCopies} {book.totalCopies === 1 ? "copy" : "copies"}
          </Chip>
        </View>

        <Divider style={styles.divider} />

        {book.description ? (
          <Text variant="bodyMedium" style={styles.body}>
            {book.description}
          </Text>
        ) : (
          <Text variant="bodyMedium" style={styles.dim}>
            No description available.
          </Text>
        )}

        <View style={styles.meta}>
          {book.publishedYear !== null ? (
            <MetaRow label="Published" value={String(book.publishedYear)} />
          ) : null}
          {book.isbn ? <MetaRow label="ISBN" value={book.isbn} /> : null}
        </View>

        <View style={styles.actions}>
          <Button
            mode="contained"
            icon="pencil"
            onPress={() =>
              router.push({
                pathname: "/librarian/books/edit/[id]",
                params: { id: String(id) },
              })
            }
          >
            Edit
          </Button>
          <Button
            mode="outlined"
            icon="delete"
            textColor={theme.colors.error}
            onPress={confirmDelete}
            loading={deleteBook.isPending}
            disabled={deleteBook.isPending}
          >
            Delete
          </Button>
        </View>
      </ScrollView>

      <Snackbar
        visible={deleteError !== null}
        onDismiss={() => setDeleteError(null)}
        duration={6000}
      >
        {deleteError}
      </Snackbar>
    </View>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <Text variant="labelLarge" style={styles.dim}>
        {label}
      </Text>
      <Text variant="bodyMedium">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 20, gap: 8 },
  author: { opacity: 0.8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  divider: { marginVertical: 12 },
  body: { lineHeight: 22 },
  meta: { marginTop: 12, gap: 8 },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actions: { marginTop: 24, gap: 12 },
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
