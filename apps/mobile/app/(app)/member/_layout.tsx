import { Role } from "@repo/shared";
import { Stack } from "expo-router";

import { RoleGuard } from "../../../src/auth/role-guard";

/**
 * The Member area (ticket 09). Gated to MEMBER only — staff have their own richer
 * areas — enforcing the role boundary from user story 21; no per-screen role
 * checks are needed below this guard.
 *
 * Structure: a Stack hosting the two primary destinations as a bottom-tab group
 * (`(tabs)`: Catalog + My Loans) and the Book detail screen pushed on top of the
 * tabs. The tabs own their own headers, so the group is rendered header-less by
 * the Stack; Book detail gets a Stack header (back button + the Book's title).
 */
export default function MemberLayout() {
  return (
    <RoleGuard allow={[Role.MEMBER]}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="books/[id]" options={{ title: "Book" }} />
      </Stack>
    </RoleGuard>
  );
}
