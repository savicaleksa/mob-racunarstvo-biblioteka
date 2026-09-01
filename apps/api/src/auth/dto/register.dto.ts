import type { RegisterRequest } from "@repo/shared";
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

import { NormalizeEmail } from "../../common/normalize-email";

/**
 * Validated body of `POST /auth/register`. Implements the shared
 * {@link RegisterRequest} contract so the wire shape stays in lockstep with
 * `apps/mobile`; the decorators add the server-side validation the global
 * ValidationPipe enforces. The email is normalised to its canonical lowercase
 * form before it is stored, so the `users.email` column only ever holds
 * lowercase and a case-variant of an existing address is a duplicate (409), not
 * a second account.
 */
export class RegisterDto implements RegisterRequest {
  @NormalizeEmail()
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt only hashes the first 72 bytes; reject silently-truncated input.
  password!: string;
}
