import { IconButton } from "react-native-paper";

import { useAuth } from "../auth/auth-context";

/**
 * A logout action for a screen header (`headerRight`). Clears the token and all
 * cached server state (user story 9); the auth context then reactively bounces
 * back to login. Reused across the Member tab headers so logout is always one
 * tap away without a dedicated screen.
 */
export function HeaderLogoutButton() {
  const { signOut } = useAuth();
  return (
    <IconButton
      icon="logout"
      accessibilityLabel="Log out"
      onPress={() => {
        void signOut();
      }}
    />
  );
}
