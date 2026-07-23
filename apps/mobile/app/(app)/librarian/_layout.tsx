import { Role } from "@repo/shared";
import { Stack } from "expo-router";

import { RoleGuard } from "../../../src/auth/role-guard";

/**
 * The Librarian area (ticket 10: Book/Author CRUD, Issue Loan, Active Loans).
 * Gated to LIBRARIAN and OWNER — an Owner can do everything a Librarian can
 * (spec) — so both roles reach these screens; Members are redirected away. No
 * per-screen role checks are needed below this guard.
 *
 * Structure mirrors the Member area: a Stack hosting the three primary
 * destinations as a bottom-tab group (`(tabs)`: Books, Authors, Active Loans)
 * rendered header-less (the tabs own their headers), with the detail, create,
 * edit, and Issue-Loan screens pushed on top with their own Stack headers.
 */
export default function LibrarianLayout() {
  return (
    <RoleGuard allow={[Role.LIBRARIAN, Role.OWNER]}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="books/[id]" options={{ title: "Book" }} />
        <Stack.Screen name="books/new" options={{ title: "New Book" }} />
        <Stack.Screen name="books/edit/[id]" options={{ title: "Edit Book" }} />
        <Stack.Screen name="authors/[id]" options={{ title: "Author" }} />
        <Stack.Screen name="authors/new" options={{ title: "New Author" }} />
        <Stack.Screen
          name="authors/edit/[id]"
          options={{ title: "Edit Author" }}
        />
        <Stack.Screen name="loans/new" options={{ title: "Issue Loan" }} />
      </Stack>
    </RoleGuard>
  );
}
