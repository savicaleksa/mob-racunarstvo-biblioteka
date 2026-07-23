import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Role } from "@repo/shared";

/**
 * Placeholder home screen for the walking skeleton (issue 01). It renders
 * nothing functional — its purpose is to prove the Expo Router + React Native
 * Paper stack boots in Expo Go and that the shared-types package (`@repo/shared`)
 * resolves and type-checks on the mobile side too. The list of roles below is
 * read straight from the single source of truth in `@repo/shared`.
 */
export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
      <Text variant="headlineMedium">Library Management</Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        Walking skeleton — nothing here yet.
      </Text>
      <Text variant="labelLarge" style={styles.subtitle}>
        Roles: {Object.values(Role).join(" · ")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  subtitle: {
    textAlign: "center",
    opacity: 0.7,
  },
});
