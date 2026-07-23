import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Divider,
  Snackbar,
  Text,
} from "react-native-paper";

import { useAuthor, useDeleteAuthor } from "../../../../src/api/authors";
import { getErrorMessage } from "../../../../src/api/errors";

/**
 * Author detail (ticket 10, user stories 24–26): view one Author, then Edit or
 * Delete. Deleting an Author who still has Books is blocked by the API with a
 * 409 (RESTRICT); that domain message is surfaced clearly in a Snackbar rather
 * than silently failing, so the Librarian learns why. A successful delete pops
 * back to the roster.
 */
export default function LibrarianAuthorDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();
  const { data: author, isPending, isError, error, refetch } = useAuthor(id);
  const deleteAuthor = useDeleteAuthor();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function confirmDelete() {
    if (!author) {
      return;
    }
    Alert.alert("Delete author", `Delete "${author.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setDeleteError(null);
          deleteAuthor.mutate(id, {
            onSuccess: () => router.back(),
            onError: (err) =>
              setDeleteError(
                getErrorMessage(err, "Could not delete the author"),
              ),
          });
        },
      },
    ]);
  }

  if (isPending) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: "Author" }} />
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: "Author" }} />
        <Text variant="bodyMedium" style={styles.error}>
          {getErrorMessage(error, "Could not load this author")}
        </Text>
        <Button mode="contained" onPress={() => refetch()}>
          Retry
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <Stack.Screen options={{ title: author.name }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headlineSmall">{author.name}</Text>
        {author.birthYear !== null ? (
          <Text variant="titleMedium" style={styles.dim}>
            Born {author.birthYear}
          </Text>
        ) : null}

        <Divider style={styles.divider} />

        {author.bio ? (
          <Text variant="bodyMedium" style={styles.body}>
            {author.bio}
          </Text>
        ) : (
          <Text variant="bodyMedium" style={styles.dim}>
            No bio available.
          </Text>
        )}

        <View style={styles.actions}>
          <Button
            mode="contained"
            icon="pencil"
            onPress={() =>
              router.push({
                pathname: "/librarian/authors/edit/[id]",
                params: { id: String(id) },
              })
            }
          >
            Edit
          </Button>
          <Button
            mode="outlined"
            icon="delete"
            textColor="#B3261E"
            onPress={confirmDelete}
            loading={deleteAuthor.isPending}
            disabled={deleteAuthor.isPending}
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 20, gap: 8 },
  divider: { marginVertical: 12 },
  body: { lineHeight: 22 },
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
