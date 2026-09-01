import { normalizeEmail } from "@repo/shared";
import { Transform } from "class-transformer";

/**
 * Apply the shared {@link normalizeEmail} to a DTO's email field before
 * validation.
 *
 * Runs inside the global `ValidationPipe` (`transform: true` in both `main.ts`
 * and the e2e harness), which transforms the plain payload into the DTO class
 * before validating it — so `@IsEmail()` sees the already-normalised value, and
 * every service below the HTTP boundary receives the canonical form. Placed on
 * every DTO that carries an email, so there is one rule across register, login,
 * member lookup and Issue rather than a per-route convention.
 *
 * The normalisation itself lives in `@repo/shared` so the mobile client applies
 * exactly the same rule (ADR-0011).
 */
export function NormalizeEmail(): PropertyDecorator {
  return Transform(({ value }) => normalizeEmail(value));
}
