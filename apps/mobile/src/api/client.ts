import { create, isAxiosError, type AxiosInstance } from "axios";

import { getToken } from "../auth/token-store";
import { API_BASE_URL } from "./config";

/**
 * Handler invoked when an authenticated request comes back `401` (an expired or
 * invalid token — there is no refresh flow, ADR-0005). The auth context
 * registers one via {@link setUnauthorizedHandler} on mount; it clears the
 * session, which reactively bounces the user to the login screen. Requests to
 * the public auth endpoints are exempt (see the response interceptor) so a
 * wrong-password login does not masquerade as a session expiry.
 */
let unauthorizedHandler: (() => void) | null = null;

/** Register the session-expiry handler (called once by the auth context). */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

/** Public auth routes whose own `401`s (bad credentials) must not clear a session. */
const PUBLIC_AUTH_PATHS = ["/auth/login", "/auth/register"];

/**
 * The single axios instance every API call in the app flows through (ADR-0010).
 *
 * - **Request interceptor** — attaches the JWT from SecureStore as
 *   `Authorization: Bearer <token>` on every outgoing request, so callers never
 *   thread the token by hand.
 * - **Response interceptor** — on a `401` from any non-public route, fires the
 *   registered {@link unauthorizedHandler} so the app redirects back to login
 *   instead of getting stuck on a broken authenticated screen. The error is
 *   still re-thrown so the calling mutation/query can react too.
 *
 * The base URL is resolved once (LAN IP auto-detect / `EXPO_PUBLIC_API_URL`).
 */
export const apiClient: AxiosInstance = create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (isAxiosError(error) && error.response?.status === 401) {
      const url = error.config?.url ?? "";
      const isPublicAuth = PUBLIC_AUTH_PATHS.some((path) => url.includes(path));
      if (!isPublicAuth) {
        unauthorizedHandler?.();
      }
    }
    return Promise.reject(error);
  },
);
