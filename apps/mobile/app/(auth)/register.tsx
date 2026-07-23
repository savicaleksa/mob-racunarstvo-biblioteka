import { Link, Stack } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { Button, HelperText, Text, TextInput } from "react-native-paper";

import { getErrorMessage } from "../../src/api/errors";
import { useAuth } from "../../src/auth/auth-context";

/**
 * Register screen — plain controlled inputs (ADR-0010). The first person to
 * register becomes the OWNER, everyone else a MEMBER (decided server-side). A
 * duplicate email comes back as a 409 whose message ("Email is already
 * registered") is surfaced inline so the user knows to log in instead.
 */
export default function RegisterScreen() {
  const { register } = useAuth();
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
      await register(email.trim(), password);
      // Navigation is handled by the (auth) layout once the session flips.
    } catch (err) {
      setError(getErrorMessage(err, "Could not register"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: "Register" }} />
      <View style={styles.container}>
        <Text variant="headlineMedium" style={styles.heading}>
          Create your account
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
          textContentType="newPassword"
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
          Register
        </Button>

        <View style={styles.footer}>
          <Text variant="bodyMedium">Already have an account? </Text>
          <Link href="/login" replace>
            <Text variant="bodyMedium" style={styles.link}>
              Log in
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
