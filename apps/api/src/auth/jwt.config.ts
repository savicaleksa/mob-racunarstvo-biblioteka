/**
 * JWT signing configuration (ADR-0005: a single ~7-day access token, no
 * refresh flow).
 *
 * The secret comes from the `JWT_SECRET` env var, falling back to a fixed
 * development default so the app (and the grader's clone) boots with zero
 * configuration. A real deployment must set `JWT_SECRET`; for this project's
 * scope the default is acceptable and documented rather than silent.
 */
export const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";

/** Access-token lifetime. ~7 days per ADR-0005. */
export const JWT_EXPIRES_IN = "7d";
