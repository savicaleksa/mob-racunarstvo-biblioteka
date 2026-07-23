import { isAxiosError } from "axios";

/**
 * Extract a human-readable message from an unknown thrown value — typically an
 * axios error carrying a NestJS error body `{ statusCode, message, error }`.
 *
 * NestJS `message` is a string for domain errors (e.g. the `409` "Email is
 * already registered") and a string[] for `class-validator` failures; both are
 * handled. Falls back to the axios message, then a generic string, so a screen
 * can always show *something* actionable.
 */
export function getErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string | string[] }
      | undefined;
    const message = data?.message;
    if (Array.isArray(message) && message.length > 0) {
      return message.join("\n");
    }
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
    if (error.code === "ECONNABORTED" || error.message === "Network Error") {
      return "Cannot reach the server. Check your connection and the API URL.";
    }
    if (error.message) {
      return error.message;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
