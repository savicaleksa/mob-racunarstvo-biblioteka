import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "../src/auth/auth-context";
import { queryClient } from "../src/query/query-client";

/**
 * Root layout: the provider stack every screen sits inside (ADR-0010).
 *
 * SafeArea → Paper (UI) → TanStack Query (server state) → Auth (session,
 * hydrated from SecureStore). The `<Stack>` hosts the route groups — `(auth)`
 * (login/register) and `(app)` (role-gated areas) — plus the `/` redirect hub;
 * headers are owned by the child group layouts.
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <StatusBar style="auto" />
            <Stack screenOptions={{ headerShown: false }} />
          </AuthProvider>
        </QueryClientProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
