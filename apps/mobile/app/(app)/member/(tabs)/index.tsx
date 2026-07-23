import type { ApiAuthor, ApiBook } from "@repo/shared";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  SegmentedButtons,
  Searchbar,
  Text,
} from "react-native-paper";

import { getErrorMessage } from "../../../../src/api/errors";
import { useAuthors } from "../../../../src/api/authors";
import { useBooks } from "../../../../src/api/books";

/** Which entity the search box is querying. */
type SearchMode = "books" | "authors";

/**
 * Catalog screen (ticket 09): browse the library's Books, filter to only those
 * currently available, and search — over Books (title + Author, tokenized) or
 * over Authors by name (user story 16). Searching Authors and tapping one drops
 * back into the Books list pre-filtered to that writer, so a reader can "find
 * everything by a writer" from a partial, reordered name. Tapping a Book opens
 * its full detail.
 *
 * The raw query is passed straight to the API, which does the tokenized matching
 * (ADR-0009); the input is debounced so we don't fire a request per keystroke.
 */
export default function CatalogScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<SearchMode>("books");
  const [query, setQuery] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);

  // Debounce the search text so each keystroke doesn't hit the API.
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(handle);
  }, [query]);

  const booksQuery = useBooks({ search: debouncedQuery, available: availableOnly });
  const authorsQuery = useAuthors({ search: debouncedQuery });
  const active = mode === "books" ? booksQuery : authorsQuery;

  const controls = (
    <View style={styles.controls}>
      <SegmentedButtons
        value={mode}
        onValueChange={(value) => setMode(value as SearchMode)}
        buttons={[
          { value: "books", label: "Books", icon: "book-open-variant" },
          { value: "authors", label: "Authors", icon: "account" },
        ]}
      />
      <Searchbar
        placeholder={mode === "books" ? "Search books or author" : "Search authors"}
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {mode === "books" ? (
        <Chip
          icon="check-circle-outline"
          selected={availableOnly}
          showSelectedOverlay
          onPress={() => setAvailableOnly((value) => !value)}
          style={styles.filterChip}
        >
          Available only
        </Chip>
      ) : null}
    </View>
  );

  function jumpToAuthorBooks(author: ApiAuthor) {
    setQuery(author.name);
    setDebouncedQuery(author.name);
    setMode("books");
  }

  if (active.isPending) {
    return (
      <View style={styles.flex}>
        {controls}
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      </View>
    );
  }

  if (active.isError) {
    return (
      <View style={styles.flex}>
        {controls}
        <View style={styles.centered}>
          <Text variant="bodyMedium" style={styles.error}>
            {getErrorMessage(active.error, "Could not load the Catalog")}
          </Text>
          <Button mode="contained" onPress={() => active.refetch()}>
            Retry
          </Button>
        </View>
      </View>
    );
  }

  if (mode === "authors") {
    return (
      <View style={styles.flex}>
        {controls}
        <FlatList
          data={authorsQuery.data ?? []}
          keyExtractor={(author) => String(author.id)}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState label="No authors match your search." />}
          renderItem={({ item }) => (
            <AuthorRow author={item} onPress={() => jumpToAuthorBooks(item)} />
          )}
        />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      {controls}
      <FlatList
        data={booksQuery.data ?? []}
        keyExtractor={(book) => String(book.id)}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            label={
              availableOnly
                ? "No available books match your search."
                : "No books match your search."
            }
          />
        }
        renderItem={({ item }) => (
          <BookRow
            book={item}
            onPress={() =>
              router.push({
                pathname: "/member/books/[id]",
                params: { id: String(item.id) },
              })
            }
          />
        )}
      />
    </View>
  );
}

/** A Book in the Catalog list: title, Author, and current Availability. */
function BookRow({ book, onPress }: { book: ApiBook; onPress: () => void }) {
  return (
    <Card onPress={onPress}>
      <Card.Title
        title={book.title}
        subtitle={book.author.name}
        titleNumberOfLines={2}
        right={() => <AvailabilityChip availability={book.availability} />}
      />
    </Card>
  );
}

/** An Author in the search list: name, birth year, and a bio snippet. */
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
      {author.bio ? (
        <Card.Content>
          <Text variant="bodySmall" numberOfLines={2} style={styles.dim}>
            {author.bio}
          </Text>
          <Text variant="labelSmall" style={styles.dim}>
            Tap to see their books
          </Text>
        </Card.Content>
      ) : (
        <Card.Content>
          <Text variant="labelSmall" style={styles.dim}>
            Tap to see their books
          </Text>
        </Card.Content>
      )}
    </Card>
  );
}

/** Availability badge — a count when borrowable, "All on loan" when none free. */
function AvailabilityChip({ availability }: { availability: number }) {
  const borrowable = availability > 0;
  return (
    <Chip
      compact
      icon={borrowable ? "check-circle" : "close-circle"}
      style={styles.availChip}
    >
      {borrowable ? `${availability} available` : "All on loan"}
    </Chip>
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
  filterChip: { alignSelf: "flex-start" },
  listContent: { padding: 12, paddingTop: 0, gap: 8 },
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
});
