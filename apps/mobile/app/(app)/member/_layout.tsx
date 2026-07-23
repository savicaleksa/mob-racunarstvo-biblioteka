import { Role } from "@repo/shared";
import { Stack } from "expo-router";

import { RoleGuard } from "../../../src/auth/role-guard";

/**
 * The Member area (ticket 09: Catalog, Book detail, My Loans). Gated to MEMBER
 * only — staff have their own richer areas — enforcing the role boundary from
 * user story 21. Later screens are added as files under this directory
 * (e.g. `catalog.tsx`, `books/[id].tsx`, `loans.tsx`).
 */
export default function MemberLayout() {
  return (
    <RoleGuard allow={[Role.MEMBER]}>
      <Stack screenOptions={{ headerShown: true }} />
    </RoleGuard>
  );
}
