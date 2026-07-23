import { Link, Stack } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { Button, HelperText, Text, TextInput } from "react-native-paper";

import { getErrorMessage } from "../../src/api/errors";
import { useAuth } from "../../src/auth/auth-context";

/**
 * Login screen — plain controlled inputs (ADR-0010). Calls the auth API through
 * the context; on success the `(auth)` layout reactively redirects to the role
 * home. A wrong-credentials 401 is surfaced inline.
 */
export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    email.trim().length > 0 && password.length > 0 && !submitting;

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      // Navigation is handled by the (auth) layout once the session flips.
    } catch (err) {
      setError(getErrorMessage(err, "Could not log in"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: "Log in" }} />
      <View style={styles.container}>
        <Text variant="headlineMedium" style={styles.heading}>
          Welcome back
        </Text>

        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          mode="outlined"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
        />

        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          mode="outlined"
          secureTextEntry
          autoCapitalize="none"
          textContentType="password"
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
          loading={submitting}
          style={styles.submit}
        >
          Log in
        </Button>

        <View style={styles.footer}>
          <Text variant="bodyMedium">No account yet? </Text>
          <Link href="/register" replace>
            <Text variant="bodyMedium" style={styles.link}>
              Register
            </Text>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  heading: { marginBottom: 8, textAlign: "center" },
  submit: { marginTop: 4 },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  link: { fontWeight: "600" },
});
