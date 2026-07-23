import type { ApiAuthor, UpdateAuthorRequest } from "@repo/shared";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, HelperText, Text, TextInput } from "react-native-paper";

import { useAuthor, useUpdateAuthor } from "../../../../../src/api/authors";
import { getErrorMessage } from "../../../../../src/api/errors";

/**
 * Edit Author (ticket 10, user story 23). The screen handles loading; the form
 * itself is a child that mounts only once the Author is loaded, so it can seed
 * its controlled inputs from props with `useState` initializers — no
 * setState-in-effect. `bio`/`birthYear` are sent as `null` when cleared.
 */
export default function EditAuthorScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);
  const { data: author, isPending, isError, error, refetch } = useAuthor(id);

  if (isPending) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: "Edit Author" }} />
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: "Edit Author" }} />
        <Text variant="bodyMedium" style={styles.error}>
          {getErrorMessage(error, "Could not load this author")}
        </Text>
        <Button mode="contained" onPress={() => refetch()}>
          Retry
        </Button>
      </View>
    );
  }

  return <EditAuthorForm id={id} author={author} />;
}

function EditAuthorForm({ id, author }: { id: number; author: ApiAuthor }) {
  const router = useRouter();
  const updateAuthor = useUpdateAuthor(id);

  const [name, setName] = useState(author.name);
  const [bio, setBio] = useState(author.bio ?? "");
  const [birthYear, setBirthYear] = useState(
    author.birthYear !== null ? String(author.birthYear) : "",
  );
  const [submitError, setSubmitError] = useState<string | null>(null);

  const trimmedYear = birthYear.trim();
  const yearInvalid = trimmedYear.length > 0 && !/^\d{1,4}$/.test(trimmedYear);
  const canSubmit =
    name.trim().length > 0 && !yearInvalid && !updateAuthor.isPending;

  function handleSubmit() {
    setSubmitError(null);
    const body: UpdateAuthorRequest = {
      name: name.trim(),
      bio: bio.trim().length > 0 ? bio.trim() : null,
      birthYear: trimmedYear.length > 0 ? Number(trimmedYear) : null,
    };
    updateAuthor.mutate(body, {
      onSuccess: () => router.back(),
      onError: (err) =>
        setSubmitError(getErrorMessage(err, "Could not update the author")),
    });
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: "Edit Author" }} />
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
        {submitError ? (
          <HelperText type="error" visible>
            {submitError}
          </HelperText>
        ) : null}
        <Button
          mode="contained"
          onPress={handleSubmit}
          disabled={!canSubmit}
          loading={updateAuthor.isPending}
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
