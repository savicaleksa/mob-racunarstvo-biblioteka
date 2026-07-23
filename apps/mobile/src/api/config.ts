import Constants from "expo-constants";

/**
 * The port the NestJS API listens on. Matches `apps/api` `main.ts`
 * (`process.env.PORT ?? 3000`); keep the two in sync.
 */
const API_PORT = 3000;

/**
 * Resolve the base URL of the HTTP API for the current runtime (ADR-0010).
 *
 * Order of precedence:
 * 1. `EXPO_PUBLIC_API_URL` — an explicit override baked in at bundle time. This
 *    covers the Android emulator (`http://10.0.2.2:3000`), an `expo start
 *    --tunnel` session, or any non-default host/port. Documented in the README.
 * 2. The dev machine's LAN IP, auto-detected from Expo's manifest `hostUri`
 *    (the `host:port` Metro is served on). A physical phone in Expo Go cannot
 *    reach the host's `localhost`, so we reuse the host that is already serving
 *    the JS bundle and point it at {@link API_PORT}.
 * 3. `http://localhost:3000` — a last-resort fallback (e.g. web / same machine).
 *
 * Resolved once at module load; the host does not change within a session.
 */
export function resolveApiBaseUrl(): string {
  const override = process.env.EXPO_PUBLIC_API_URL;
  if (override && override.trim().length > 0) {
    return override.trim().replace(/\/+$/, "");
  }

  // `hostUri` looks like `192.168.1.23:8081`; strip the Metro port and swap in
  // the API port. `expoGoConfig.debuggerHost` is the older Expo Go fallback.
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.expoGoConfig?.debuggerHost ??
    undefined;

  if (hostUri) {
    const host = hostUri.split(":")[0];
    if (host) {
      return `http://${host}:${API_PORT}`;
    }
  }

  return `http://localhost:${API_PORT}`;
}

/** The API base URL for this session. */
export const API_BASE_URL = resolveApiBaseUrl();
