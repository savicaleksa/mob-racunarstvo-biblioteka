import type { ApiBook } from "@repo/shared";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  FAB,
  Searchbar,
  Text,
} from "react-native-paper";

import { useBooks } from "../../../../src/api/books";
import { getErrorMessage } from "../../../../src/api/errors";
import { useRefreshControl } from "../../../../src/ui/use-refresh-control";

/**
 * Books management tab (ticket 10): the Librarian's view of the Catalog, each
 * Book showing its computed Availability. Search narrows the list (tokenized,
 * ADR-0009); the FAB opens the create form; tapping a Book opens its detail
 * where it can be edited or deleted.
 */
export default function LibrarianBooksScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(handle);
  }, [query]);

  const { data, isPending, isError, error, refetch } = useBooks({
    search: debouncedQuery,
  });
  const refreshControl = useRefreshControl(refetch);

  const controls = (
    <View style={styles.controls}>
      <Searchbar
        placeholder="Search books or author"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );

  return (
    <View style={styles.flex}>
      {controls}
      {isPending ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Text variant="bodyMedium" style={styles.error}>
            {getErrorMessage(error, "Could not load the Catalog")}
          </Text>
          <Button mode="contained" onPress={() => refetch()}>
            Retry
          </Button>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(book) => String(book.id)}
          contentContainerStyle={[
            styles.listContent,
            data.length === 0 ? styles.listContentEmpty : null,
          ]}
          refreshControl={refreshControl}
          ListEmptyComponent={
            <EmptyState label="No books yet. Tap + to add one." />
          }
          renderItem={({ item }) => (
            <BookRow
              book={item}
              onPress={() =>
                router.push({
                  pathname: "/librarian/books/[id]",
                  params: { id: String(item.id) },
                })
              }
            />
          )}
        />
      )}
      <FAB
        icon="plus"
        label="Add book"
        style={styles.fab}
        onPress={() => router.push("/librarian/books/new")}
      />
    </View>
  );
}

/** A Book in the management list: title, Author, and current Availability. */
function BookRow({ book, onPress }: { book: ApiBook; onPress: () => void }) {
  const borrowable = book.availability > 0;
  return (
    <Card onPress={onPress}>
      <Card.Title
        title={book.title}
        subtitle={book.author.name}
        titleNumberOfLines={2}
        right={() => (
          <Chip
            compact
            icon={borrowable ? "check-circle" : "close-circle"}
            style={styles.availChip}
          >
            {book.availability}/{book.totalCopies}
          </Chip>
        )}
      />
    </Card>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <View style={styles.centered}>
      <Text variant="bodyMedium" style={styles.dim}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  controls: { padding: 12, gap: 12 },
  listContent: {
    padding: 12,
    paddingTop: 0,
    gap: 8,
    paddingBottom: 96,
    flexGrow: 1,
  },
  // No cards to clear the FAB of, so drop the clearance and centre honestly.
  listContentEmpty: { paddingBottom: 12 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  error: { textAlign: "center" },
  dim: { opacity: 0.7 },
  availChip: { marginRight: 12 },
  fab: { position: "absolute", right: 16, bottom: 16 },
});
