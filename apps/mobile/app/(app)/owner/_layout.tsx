import { Role } from "@repo/shared";
import { Stack } from "expo-router";

import { RoleGuard } from "../../../src/auth/role-guard";
import { HeaderLogoutButton } from "../../../src/ui/header-logout-button";

/**
 * The Owner area (ticket 11: Users list + role management). Gated to OWNER only.
 * An Owner also has access to the Librarian area (shared staff functions); this
 * area is exclusively the Owner-only administration, and its Users screen links
 * across to `/librarian` so the Owner can operate the library too (story 43).
 * Each screen carries a logout action in its header.
 */
export default function OwnerLayout() {
  return (
    <RoleGuard allow={[Role.OWNER]}>
      <Stack
        screenOptions={{
          headerShown: true,
          headerRight: () => <HeaderLogoutButton />,
        }}
      />
    </RoleGuard>
  );
}
