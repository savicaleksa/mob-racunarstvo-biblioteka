import { Redirect } from "expo-router";

import { useAuth } from "../src/auth/auth-context";
import { LOGIN_ROUTE, roleHome } from "../src/navigation/routes";
import { FullScreenLoader } from "../src/ui/full-screen-loader";

/**
 * The `/` redirect hub. While the session hydrates from SecureStore it shows a
 * loader; then it sends the user to login (unauthenticated) or to their
 * role-appropriate home (authenticated) — so a returning user lands straight on
 * their screens without re-entering credentials.
 */
export default function Index() {
  const { status, user } = useAuth();

  if (status === "loading") {
    return <FullScreenLoader />;
  }

  if (status !== "authenticated" || !user) {
    return <Redirect href={LOGIN_ROUTE} />;
  }

  return <Redirect href={roleHome(user.role)} />;
}
