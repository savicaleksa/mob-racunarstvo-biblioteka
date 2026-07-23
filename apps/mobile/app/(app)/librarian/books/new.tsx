import type { CreateBookRequest } from "@repo/shared";
import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { Button, HelperText, TextInput } from "react-native-paper";

import { useCreateBook } from "../../../../src/api/books";
import { getErrorMessage } from "../../../../src/api/errors";
import { AuthorPicker } from "../../../../src/ui/author-picker";

/**
 * Create Book form (ticket 10, user story 27). `title` and an Author are
 * required; the Author is chosen from the existing roster (a bad reference is a
 * 400 the API surfaces). `totalCopies` defaults to 1 when left blank; ISBN,
 * published year, and description are optional. On success we pop back to the
 * Catalog, which the mutation has invalidated. Plain controlled inputs.
 */
export default function NewBookScreen() {
  const router = useRouter();
  const createBook = useCreateBook();

  const [title, setTitle] = useState("");
  const [authorId, setAuthorId] = useState<number | null>(null);
  const [totalCopies, setTotalCopies] = useState("");
  const [isbn, setIsbn] = useState("");
  const [publishedYear, setPublishedYear] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const trimmedCopies = totalCopies.trim();
  const copiesInvalid =
    trimmedCopies.length > 0 && !/^\d+$/.test(trimmedCopies);
  const copiesTooLow = /^\d+$/.test(trimmedCopies) && Number(trimmedCopies) < 1;
  const trimmedYear = publishedYear.trim();
  const yearInvalid = trimmedYear.length > 0 && !/^\d{1,4}$/.test(trimmedYear);

  const canSubmit =
    title.trim().length > 0 &&
    authorId !== null &&
    !copiesInvalid &&
    !copiesTooLow &&
    !yearInvalid &&
    !createBook.isPending;

  function handleSubmit() {
    setError(null);
    if (authorId === null) {
      return;
    }
    const body: CreateBookRequest = { title: title.trim(), authorId };
    if (trimmedCopies.length > 0) {
      body.totalCopies = Number(trimmedCopies);
    }
    if (isbn.trim().length > 0) {
      body.isbn = isbn.trim();
    }
    if (trimmedYear.length > 0) {
      body.publishedYear = Number(trimmedYear);
    }
    if (description.trim().length > 0) {
      body.description = description.trim();
    }
    createBook.mutate(body, {
      onSuccess: () => router.back(),
      onError: (err) =>
        setError(getErrorMessage(err, "Could not create the book")),
    });
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <TextInput
          label="Title"
          value={title}
          onChangeText={setTitle}
          mode="outlined"
        />
        <AuthorPicker value={authorId} onChange={setAuthorId} />
        <TextInput
          label="Total copies (default 1)"
          value={totalCopies}
          onChangeText={setTotalCopies}
          mode="outlined"
          keyboardType="number-pad"
        />
        {copiesInvalid || copiesTooLow ? (
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
        {error ? (
          <HelperText type="error" visible>
            {error}
          </HelperText>
        ) : null}
        <Button
          mode="contained"
          onPress={handleSubmit}
          disabled={!canSubmit}
          loading={createBook.isPending}
          style={styles.submit}
        >
          Create book
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 20, gap: 12 },
  submit: { marginTop: 8 },
});
