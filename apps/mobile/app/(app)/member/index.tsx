import { Stack } from "expo-router";

import { RoleLanding } from "../../../src/ui/role-landing";

/** Member home (placeholder). Ticket 09 builds the Catalog + My Loans here. */
export default function MemberHome() {
  return (
    <>
      <Stack.Screen options={{ title: "Library" }} />
      <RoleLanding
        title="Member"
        description="Your Catalog and Loans will appear here (ticket 09)."
      />
    </>
  );
}
