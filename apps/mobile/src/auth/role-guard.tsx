import type { Role } from "@repo/shared";
import { Redirect } from "expo-router";
import type { ReactNode } from "react";

import { LOGIN_ROUTE, roleHome } from "../navigation/routes";
import { FullScreenLoader } from "../ui/full-screen-loader";
import { useAuth } from "./auth-context";

interface RoleGuardProps {
  /** Roles permitted to see the wrapped screens. */
  allow: readonly Role[];
  children: ReactNode;
}

/**
 * The reusable role-gating primitive (ADR-0010): render `children` only when the
 * signed-in user's role is in `allow`. It is self-sufficient — it does not
 * assume an outer auth gate — so it can wrap any route group or screen:
 *
 * - still hydrating       → a loader (no premature redirect / flash)
 * - not signed in         → redirect to login
 * - signed in, wrong role → redirect to *their own* role home (never a dead end)
 * - signed in, allowed    → render the screens
 *
 * A later ticket gates its area by wrapping that group's `_layout` in
 * `<RoleGuard allow={[Role.LIBRARIAN, Role.OWNER]}>…</RoleGuard>`.
 */
export function RoleGuard({ allow, children }: RoleGuardProps) {
  const { status, user } = useAuth();

  if (status === "loading") {
    return <FullScreenLoader />;
  }

  if (status !== "authenticated" || !user) {
    return <Redirect href={LOGIN_ROUTE} />;
  }

  if (!allow.includes(user.role)) {
    return <Redirect href={roleHome(user.role)} />;
  }

  return <>{children}</>;
}
