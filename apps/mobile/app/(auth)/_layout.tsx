import { Redirect, Stack } from "expo-router";

import { useAuth } from "../../src/auth/auth-context";
import { roleHome } from "../../src/navigation/routes";
import { FullScreenLoader } from "../../src/ui/full-screen-loader";

/**
 * Layout for the public `(auth)` group (login / register). If a session is
 * already live, a user has no business here — bounce them to their role home.
 * While hydrating, show a loader so we never flash the login form at an
 * already-signed-in user.
 */
export default function AuthLayout() {
  const { status, user } = useAuth();

  if (status === "loading") {
    return <FullScreenLoader />;
  }

  if (status === "authenticated" && user) {
    return <Redirect href={roleHome(user.role)} />;
  }

  return <Stack screenOptions={{ headerShown: true }} />;
}
