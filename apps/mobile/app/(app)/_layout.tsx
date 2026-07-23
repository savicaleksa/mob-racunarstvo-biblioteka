import { Redirect, Stack } from "expo-router";

import { useAuth } from "../../src/auth/auth-context";
import { LOGIN_ROUTE } from "../../src/navigation/routes";
import { FullScreenLoader } from "../../src/ui/full-screen-loader";

/**
 * Layout for the authenticated `(app)` group. The single auth gate: while
 * hydrating show a loader; with no live session redirect to login. Role gating
 * happens one level deeper, per area, via `<RoleGuard>` — so this layout only
 * answers "are you signed in at all?". Child areas: `member/`, `librarian/`,
 * `owner/`.
 */
export default function AppLayout() {
  const { status, user } = useAuth();

  if (status === "loading") {
    return <FullScreenLoader />;
  }

  if (status !== "authenticated" || !user) {
    return <Redirect href={LOGIN_ROUTE} />;
  }

  // Header-less container: the gate only decides "signed in or not". Each role
  // area renders its own (single) header via its nested Stack.
  return <Stack screenOptions={{ headerShown: false }} />;
}
