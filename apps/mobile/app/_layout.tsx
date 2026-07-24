import { ThemeProvider } from "@react-navigation/native";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "../src/auth/auth-context";
import { queryClient } from "../src/query/query-client";
import {
  LibraryDarkTheme,
  LibraryLightTheme,
  LibraryNavigationDarkTheme,
  LibraryNavigationLightTheme,
} from "../src/ui/theme";

/**
 * Root layout: the provider stack every screen sits inside (ADR-0010).
 *
 * SafeArea → Paper (UI) → Navigation theme → TanStack Query (server state) →
 * Auth (session, hydrated from SecureStore). The OS `useColorScheme()` picks
 * the light or dark wood-and-leaves palette and drives BOTH Paper (Cards,
 * Surfaces, Text) and React Navigation (headers, tab bars, screen background) —
 * they are separate theming systems, so both must be fed or dark mode only half
 * lands. The `<Stack>` hosts the route groups — `(auth)` (login/register) and
 * `(app)` (role-gated areas) — plus the `/` redirect hub; headers are owned by
 * the child group layouts.
 */
export default function RootLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const paperTheme = isDark ? LibraryDarkTheme : LibraryLightTheme;
  const navigationTheme = isDark
    ? LibraryNavigationDarkTheme
    : LibraryNavigationLightTheme;

  return (
    <SafeAreaProvider>
      <PaperProvider theme={paperTheme}>
        <ThemeProvider value={navigationTheme}>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <StatusBar style={isDark ? "light" : "dark"} />
              <Stack screenOptions={{ headerShown: false }} />
            </AuthProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
