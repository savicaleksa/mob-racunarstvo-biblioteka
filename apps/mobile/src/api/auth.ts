import type {
  AuthResponse,
  LoginRequest,
  MeResponse,
  RegisterRequest,
} from "@repo/shared";

import { apiClient } from "./client";

/**
 * Thin wrappers over the auth endpoints (issue 02), typed end-to-end with the
 * `@repo/shared` contract shapes — the single source of truth. Every call goes
 * through {@link apiClient}, so the JWT is attached and 401s are handled
 * centrally. Later tickets add sibling modules (`books.ts`, `loans.ts`, …) the
 * same way.
 */
export const authApi = {
  /** `POST /auth/register` [public] — first registrant is OWNER, else MEMBER. */
  async register(body: RegisterRequest): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>("/auth/register", body);
    return data;
  },

  /** `POST /auth/login` [public] — wrong credentials reject with a 401. */
  async login(body: LoginRequest): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>("/auth/login", body);
    return data;
  },

  /** `GET /auth/me` [auth] — the caller's own profile (used to hydrate on launch). */
  async me(): Promise<MeResponse> {
    const { data } = await apiClient.get<MeResponse>("/auth/me");
    return data;
  },
};
