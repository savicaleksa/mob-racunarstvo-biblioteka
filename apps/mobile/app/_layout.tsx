import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

/**
 * Root layout for the Expo Router app. Wraps every screen in React Native
 * Paper's provider (ADR-0010) and the safe-area provider. Later tickets replace
 * the single stack with role-gated route groups and an auth context; for the
 * walking skeleton it just hosts the placeholder screen.
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <StatusBar style="auto" />
        <Stack>
          <Stack.Screen name="index" options={{ title: "Library" }} />
        </Stack>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
