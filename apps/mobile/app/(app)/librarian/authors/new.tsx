import type { CreateAuthorRequest } from "@repo/shared";
import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { Button, HelperText, TextInput } from "react-native-paper";

import { useCreateAuthor } from "../../../../src/api/authors";
import { getErrorMessage } from "../../../../src/api/errors";

/**
 * Create Author form (ticket 10, user story 22). `name` is required; `bio` and
 * `birthYear` are optional. On success we pop back to the roster, which the
 * mutation has already invalidated so the new Author shows up. Plain controlled
 * inputs (ADR-0010).
 */
export default function NewAuthorScreen() {
  const router = useRouter();
  const createAuthor = useCreateAuthor();

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [error, setError] = useState<string | null>(null);

  const trimmedYear = birthYear.trim();
  const yearInvalid = trimmedYear.length > 0 && !/^\d{1,4}$/.test(trimmedYear);
  const canSubmit =
    name.trim().length > 0 && !yearInvalid && !createAuthor.isPending;

  function handleSubmit() {
    setError(null);
    const body: CreateAuthorRequest = { name: name.trim() };
    if (bio.trim().length > 0) {
      body.bio = bio.trim();
    }
    if (trimmedYear.length > 0) {
      body.birthYear = Number(trimmedYear);
    }
    createAuthor.mutate(body, {
      onSuccess: () => router.back(),
      onError: (err) =>
        setError(getErrorMessage(err, "Could not create the author")),
    });
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <TextInput
          label="Name"
          value={name}
          onChangeText={setName}
          mode="outlined"
        />
        <TextInput
          label="Bio (optional)"
          value={bio}
          onChangeText={setBio}
          mode="outlined"
          multiline
          numberOfLines={4}
        />
        <TextInput
          label="Birth year (optional)"
          value={birthYear}
          onChangeText={setBirthYear}
          mode="outlined"
          keyboardType="number-pad"
        />
        {yearInvalid ? (
          <HelperText type="error" visible>
            Birth year must be a number.
          </HelperText>
        ) : null}
        {error ? (
          <HelperText type="error" visible>
            {error}
          </HelperText>
        ) : null}
        <Button
          mode="contained"
          onPress={handleSubmit}
          disabled={!canSubmit}
          loading={createAuthor.isPending}
          style={styles.submit}
        >
          Create author
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
