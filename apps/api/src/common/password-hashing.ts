import * as bcrypt from "bcryptjs";

/**
 * The single definition of how this app turns a password into a stored hash.
 *
 * Two call sites need it and they must agree, or a seeded account would not be
 * loggable-in: `AuthService.register` (async, on the request path) and the
 * database seed (sync, in a one-shot CLI script). Rather than have each name
 * its own work factor, both go through here.
 *
 * 10 rounds is the bcryptjs default — enough for a demo, and the number lives
 * in one place if it ever needs raising.
 */
const BCRYPT_ROUNDS = 10;

/** Hash a plaintext password for storage in `users.password_hash`. */
export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Synchronous {@link hashPassword}, for the seed script — it runs outside Nest
 * in a straight-line CLI and has no reason to be async.
 */
export function hashPasswordSync(password: string): string {
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

/** Verify a plaintext password against a stored hash. */
export function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}
