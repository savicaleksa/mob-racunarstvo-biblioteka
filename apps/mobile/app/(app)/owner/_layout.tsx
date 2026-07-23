import { Role } from "@repo/shared";
import { Stack } from "expo-router";

import { RoleGuard } from "../../../src/auth/role-guard";

/**
 * The Owner area (ticket 11: Users list + role management). Gated to OWNER only.
 * An Owner also has access to the Librarian area (shared staff functions); this
 * area is exclusively the Owner-only administration. Later screens are added as
 * files under this directory.
 */
export default function OwnerLayout() {
  return (
    <RoleGuard allow={[Role.OWNER]}>
      <Stack screenOptions={{ headerShown: true }} />
    </RoleGuard>
  );
}
