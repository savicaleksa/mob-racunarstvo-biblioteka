import type { ApiAuthor } from "@repo/shared";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  FAB,
  Searchbar,
  Text,
} from "react-native-paper";

import { useAuthors } from "../../../../src/api/authors";
import { getErrorMessage } from "../../../../src/api/errors";
import { useRefreshControl } from "../../../../src/ui/use-refresh-control";

/**
 * Authors management tab (ticket 10): the roster the Librarian curates. Search
 * narrows the list (tokenized over the name, ADR-0009); the FAB opens the create
 * form; tapping an Author opens its detail where it can be edited or deleted
 * (deletion is blocked while the Author still has Books).
 */
export default function LibrarianAuthorsScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(handle);
  }, [query]);

  const { data, isPending, isError, error, refetch } = useAuthors({
    search: debouncedQuery,
  });
  const refreshControl = useRefreshControl(refetch);

  const controls = (
    <View style={styles.controls}>
      <Searchbar
        placeholder="Search authors"
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
            {getErrorMessage(error, "Could not load the authors")}
          </Text>
          <Button mode="contained" onPress={() => refetch()}>
            Retry
          </Button>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(author) => String(author.id)}
          contentContainerStyle={[
            styles.listContent,
            data.length === 0 ? styles.listContentEmpty : null,
          ]}
          refreshControl={refreshControl}
          ListEmptyComponent={
            <EmptyState label="No authors yet. Tap + to add one." />
          }
          renderItem={({ item }) => (
            <AuthorRow
              author={item}
              onPress={() =>
                router.push({
                  pathname: "/librarian/authors/[id]",
                  params: { id: String(item.id) },
                })
              }
            />
          )}
        />
      )}
      <FAB
        icon="plus"
        label="Add author"
        style={styles.fab}
        onPress={() => router.push("/librarian/authors/new")}
      />
    </View>
  );
}

/** An Author in the management list: name and birth year. */
function AuthorRow({
  author,
  onPress,
}: {
  author: ApiAuthor;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress}>
      <Card.Title
        title={author.name}
        subtitle={author.birthYear ? `Born ${author.birthYear}` : undefined}
        titleNumberOfLines={2}
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
  fab: { position: "absolute", right: 16, bottom: 16 },
});
