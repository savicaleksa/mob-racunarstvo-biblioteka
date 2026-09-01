import { Stack, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Chip,
  Divider,
  Text,
} from "react-native-paper";

import { getErrorMessage } from "../../../../src/api/errors";
import { useBook } from "../../../../src/api/books";
import { useRefreshControl } from "../../../../src/ui/use-refresh-control";

/**
 * Book detail screen (ticket 09): a Book's full details — Author, current
 * Availability, description, published year, and ISBN when present (user story
 * 15). The Book id comes from the route param; the header title becomes the
 * Book's title once loaded.
 */
export default function BookDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);
  const { data: book, isPending, isError, error, refetch } = useBook(id);
  // Availability drifts as others borrow it (ADR-0007), so allow a re-check.
  const refreshControl = useRefreshControl(refetch);

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
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={refreshControl}
    >
      <Stack.Screen options={{ title: book.title }} />

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
        <Text variant="bodyMedium" style={styles.description}>
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
        {book.author.birthYear !== null ? (
          <MetaRow
            label="Author born"
            value={String(book.author.birthYear)}
          />
        ) : null}
      </View>

      {book.author.bio ? (
        <>
          <Divider style={styles.divider} />
          <Text variant="titleSmall">About the author</Text>
          <Text variant="bodyMedium" style={styles.description}>
            {book.author.bio}
          </Text>
        </>
      ) : null}
    </ScrollView>
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
  content: { padding: 20, gap: 8 },
  author: { opacity: 0.8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  divider: { marginVertical: 12 },
  description: { lineHeight: 22 },
  meta: { marginTop: 12, gap: 8 },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
});
