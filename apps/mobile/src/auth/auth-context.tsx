import type { ApiUser } from "@repo/shared";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { authApi } from "../api/auth";
import { setUnauthorizedHandler } from "../api/client";
import { queryClient } from "../query/query-client";
import { deleteToken, getToken, setToken } from "./token-store";

/**
 * Lifecycle of the auth session:
 * - `loading` — hydrating from SecureStore on launch; nothing decided yet.
 * - `authenticated` — a valid token is present and `user` is populated.
 * - `unauthenticated` — no token, or the stored token was rejected / cleared.
 */
type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  /** The signed-in user, or `null` while loading / unauthenticated. */
  user: ApiUser | null;
  /** Log in with email + password; throws on bad credentials (surface it in the UI). */
  signIn(email: string, password: string): Promise<void>;
  /** Register a new account; throws (e.g. 409 duplicate email) for the UI to surface. */
  register(email: string, password: string): Promise<void>;
  /** Clear the token from the device and drop all cached server state. */
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Holds the authenticated user/token and hydrates it from SecureStore on launch
 * (ADR-0010). It is the one place that writes the token store and flips auth
 * status, so the route guards can stay declarative (`if (!user) redirect`).
 *
 * On mount it reads the persisted token and validates it via `GET /auth/me`:
 * a good token yields the fresh profile (role included, so the correct screens
 * show); a rejected token is cleared. It also registers the axios 401 handler
 * so an expired token mid-session tears the session down the same way.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<ApiUser | null>(null);

  /** Drop the session locally: forget the token and every cached query. */
  const clearSession = useCallback(async () => {
    await deleteToken();
    setUser(null);
    setStatus("unauthenticated");
    queryClient.clear();
  }, []);

  // Hydrate from SecureStore once on launch.
  useEffect(() => {
    let active = true;
    (async () => {
      const token = await getToken();
      if (!token) {
        if (active) setStatus("unauthenticated");
        return;
      }
      try {
        const { user: me } = await authApi.me();
        if (!active) return;
        setUser(me);
        setStatus("authenticated");
      } catch {
        // Expired / invalid token — the interceptor may also fire; either way
        // we land unauthenticated with a clean token store.
        if (!active) return;
        await deleteToken();
        setUser(null);
        setStatus("unauthenticated");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Register the axios 401 handler (session expiry → back to login).
  useEffect(() => {
    setUnauthorizedHandler(() => {
      void clearSession();
    });
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { token, user: signedIn } = await authApi.login({ email, password });
    await setToken(token);
    setUser(signedIn);
    setStatus("authenticated");
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const { token, user: registered } = await authApi.register({
      email,
      password,
    });
    await setToken(token);
    setUser(registered);
    setStatus("authenticated");
  }, []);

  const signOut = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, signIn, register, signOut }),
    [status, user, signIn, register, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Access the auth session. Must be used within {@link AuthProvider}. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
