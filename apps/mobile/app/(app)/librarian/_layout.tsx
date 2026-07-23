import { Role } from "@repo/shared";
import { Stack } from "expo-router";

import { RoleGuard } from "../../../src/auth/role-guard";

/**
 * The Librarian area (ticket 10: Book/Author CRUD, Issue Loan, Active Loans).
 * Gated to LIBRARIAN and OWNER — an Owner can do everything a Librarian can
 * (spec) — so both roles reach these screens; Members are redirected away.
 * Later screens are added as files under this directory.
 */
export default function LibrarianLayout() {
  return (
    <RoleGuard allow={[Role.LIBRARIAN, Role.OWNER]}>
      <Stack screenOptions={{ headerShown: true }} />
    </RoleGuard>
  );
}
