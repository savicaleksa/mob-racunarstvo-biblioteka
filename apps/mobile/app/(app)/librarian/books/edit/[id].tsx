import type { ApiBook, UpdateBookRequest } from "@repo/shared";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, HelperText, Text, TextInput } from "react-native-paper";

import { useBook, useUpdateBook } from "../../../../../src/api/books";
import { getErrorMessage } from "../../../../../src/api/errors";
import { AuthorPicker } from "../../../../../src/ui/author-picker";

/**
 * Edit Book (ticket 10, user story 28), including Total Copies. The screen
 * handles loading; the form is a child that mounts only once the Book is loaded,
 * so it seeds its controlled inputs from props with `useState` initializers — no
 * setState-in-effect. Save PATCHes the shown fields and pops back; the mutation
 * invalidates the Catalog so Availability/details refresh. ISBN/published
 * year/description are sent as `null` when cleared.
 */
export default function EditBookScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);
  const { data: book, isPending, isError, error, refetch } = useBook(id);

  if (isPending) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: "Edit Book" }} />
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: "Edit Book" }} />
        <Text variant="bodyMedium" style={styles.error}>
          {getErrorMessage(error, "Could not load this book")}
        </Text>
        <Button mode="contained" onPress={() => refetch()}>
          Retry
        </Button>
      </View>
    );
  }

  return <EditBookForm id={id} book={book} />;
}

function EditBookForm({ id, book }: { id: number; book: ApiBook }) {
  const router = useRouter();
  const updateBook = useUpdateBook(id);

  const [title, setTitle] = useState(book.title);
  const [authorId, setAuthorId] = useState<number | null>(book.author.id);
  const [totalCopies, setTotalCopies] = useState(String(book.totalCopies));
  const [isbn, setIsbn] = useState(book.isbn ?? "");
  const [publishedYear, setPublishedYear] = useState(
    book.publishedYear !== null ? String(book.publishedYear) : "",
  );
  const [description, setDescription] = useState(book.description ?? "");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const trimmedCopies = totalCopies.trim();
  const copiesInvalid =
    trimmedCopies.length === 0 ||
    !/^\d+$/.test(trimmedCopies) ||
    Number(trimmedCopies) < 1;
  const trimmedYear = publishedYear.trim();
  const yearInvalid = trimmedYear.length > 0 && !/^\d{1,4}$/.test(trimmedYear);

  const canSubmit =
    title.trim().length > 0 &&
    authorId !== null &&
    !copiesInvalid &&
    !yearInvalid &&
    !updateBook.isPending;

  function handleSubmit() {
    setSubmitError(null);
    if (authorId === null) {
      return;
    }
    const body: UpdateBookRequest = {
      title: title.trim(),
      authorId,
      totalCopies: Number(trimmedCopies),
      isbn: isbn.trim().length > 0 ? isbn.trim() : null,
      publishedYear: trimmedYear.length > 0 ? Number(trimmedYear) : null,
      description: description.trim().length > 0 ? description.trim() : null,
    };
    updateBook.mutate(body, {
      onSuccess: () => router.back(),
      onError: (err) =>
        setSubmitError(getErrorMessage(err, "Could not update the book")),
    });
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: "Edit Book" }} />
      <ScrollView contentContainerStyle={styles.content}>
        <TextInput
          label="Title"
          value={title}
          onChangeText={setTitle}
          mode="outlined"
        />
        <AuthorPicker value={authorId} onChange={setAuthorId} />
        <TextInput
          label="Total copies"
          value={totalCopies}
          onChangeText={setTotalCopies}
          mode="outlined"
          keyboardType="number-pad"
        />
        {copiesInvalid ? (
          <HelperText type="error" visible>
            Total copies must be a whole number of at least 1.
          </HelperText>
        ) : null}
        <TextInput
          label="ISBN (optional)"
          value={isbn}
          onChangeText={setIsbn}
          mode="outlined"
          autoCapitalize="none"
        />
        <TextInput
          label="Published year (optional)"
          value={publishedYear}
          onChangeText={setPublishedYear}
          mode="outlined"
          keyboardType="number-pad"
        />
        {yearInvalid ? (
          <HelperText type="error" visible>
            Published year must be a number.
          </HelperText>
        ) : null}
        <TextInput
          label="Description (optional)"
          value={description}
          onChangeText={setDescription}
          mode="outlined"
          multiline
          numberOfLines={4}
        />
        {submitError ? (
          <HelperText type="error" visible>
            {submitError}
          </HelperText>
        ) : null}
        <Button
          mode="contained"
          onPress={handleSubmit}
          disabled={!canSubmit}
          loading={updateBook.isPending}
          style={styles.submit}
        >
          Save changes
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 20, gap: 12 },
  submit: { marginTop: 8 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  error: { textAlign: "center" },
});
