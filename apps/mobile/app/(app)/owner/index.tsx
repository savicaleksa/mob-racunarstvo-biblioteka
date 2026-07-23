import { Stack } from "expo-router";

import { RoleLanding } from "../../../src/ui/role-landing";

/** Owner home (placeholder). Ticket 11 builds the Users list + role management here. */
export default function OwnerHome() {
  return (
    <>
      <Stack.Screen options={{ title: "Owner" }} />
      <RoleLanding
        title="Owner"
        description="User & role management will appear here (ticket 11)."
      />
    </>
  );
}
