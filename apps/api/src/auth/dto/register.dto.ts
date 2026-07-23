import type { RegisterRequest } from "@repo/shared";
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

/**
 * Validated body of `POST /auth/register`. Implements the shared
 * {@link RegisterRequest} contract so the wire shape stays in lockstep with
 * `apps/mobile`; the decorators add the server-side validation the global
 * ValidationPipe enforces.
 */
export class RegisterDto implements RegisterRequest {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt only hashes the first 72 bytes; reject silently-truncated input.
  password!: string;
}
