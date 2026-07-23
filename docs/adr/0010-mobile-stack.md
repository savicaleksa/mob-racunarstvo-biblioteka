# Expo mobile stack: Expo Router, TanStack Query, Paper, run in Expo Go

The Expo app uses **Expo Router** (file-based routing, with role-gated route groups), **TanStack Query** for server state (loading/error/refetch/mutations), **axios** with a request interceptor that attaches the JWT and a response interceptor that redirects to login on 401, **React Context** for auth state hydrated from SecureStore, and **React Native Paper** for UI. Every one of these runs in **Expo Go** with no custom native modules, so no custom dev build is needed.

The app is demoed on a **physical phone via Expo Go over LAN**. The API base URL auto-detects the dev machine's LAN IP in development, overridable via `EXPO_PUBLIC_API_URL` (documented in the README) — because a device cannot reach the host's `localhost`.

## Consequences

- The phone and the machine running the API must share a network. `EXPO_PUBLIC_API_URL` covers the emulator case (`10.0.2.2` / `localhost`) and the tunnel fallback without code changes.
