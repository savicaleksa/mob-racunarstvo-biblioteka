import { Stack } from "expo-router";

import { RoleLanding } from "../../../src/ui/role-landing";

/** Librarian home (placeholder). Ticket 10 builds catalog management + lending here. */
export default function LibrarianHome() {
  return (
    <>
      <Stack.Screen options={{ title: "Librarian" }} />
      <RoleLanding
        title="Librarian"
        description="Book & Author management and lending will appear here (ticket 10)."
      />
    </>
  );
}
