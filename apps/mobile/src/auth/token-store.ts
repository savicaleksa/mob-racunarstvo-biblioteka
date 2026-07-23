import * as SecureStore from "expo-secure-store";

/**
 * Key under which the JWT access token is persisted in the device keychain
 * (Expo SecureStore, ADR-0005). SecureStore keys must be alphanumeric plus
 * `.`, `-`, `_`.
 */
const TOKEN_KEY = "library.auth.token";

/** Read the stored JWT, or `null` when the user has never signed in / signed out. */
export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

/** Persist the JWT securely so the session survives app relaunches. */
export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

/** Remove the JWT from the device (logout, or after a 401). */
export async function deleteToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
