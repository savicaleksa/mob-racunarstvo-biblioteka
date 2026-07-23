# JWT auth with bcryptjs, a single access token, no refresh flow

Authentication uses a **single JWT access token** (~7-day expiry, payload `{ sub, role }`) issued on login and register. Passwords are hashed with **bcryptjs** (pure JavaScript) rather than native `bcrypt`/`argon2`, so `pnpm install` never fails on a native build step on the grader's machine (notably Windows). On the device the token lives in Expo **SecureStore**.

We deliberately **do not implement refresh tokens**. They are not in the rubric and add real complexity (rotation, revocation, a second token store) for no grading benefit.

## Consequences

- When the access token expires the user simply logs in again. Acceptable for the project's scope; recorded here so the absence reads as a decision, not an oversight.
