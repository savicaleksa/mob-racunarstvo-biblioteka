# 08 — Mobile auth shell

**What to build:** On a physical phone in Expo Go, a person can register or log in, stay signed in across launches without re-entering credentials, and log out. Their token is stored securely and attached to every request automatically; when it expires or is invalid they are redirected back to login instead of getting stuck. After login they land on the screens appropriate to their role.

**Blocked by:** 01, 02

**Status:** ready-for-agent

- [ ] An axios instance with a request interceptor attaching the JWT from SecureStore and a response interceptor redirecting to login on 401 (ADR-0010).
- [ ] A React Context holding the authenticated user/token, hydrated from SecureStore on launch; TanStack Query set up for server state.
- [ ] Login and Register screens (plain controlled inputs) calling the auth API; a clear error when registering an email that already exists.
- [ ] Role-gated route groups (Expo Router) so a user only sees screens for their role; logout clears the token from the device.
- [ ] API base URL auto-detects the dev machine's LAN IP in development, overridable via `EXPO_PUBLIC_API_URL`.
- [ ] Verified manually: log in on the phone, land on the role-appropriate home, relaunch and stay signed in, and get redirected to login when the token is cleared/expired.
