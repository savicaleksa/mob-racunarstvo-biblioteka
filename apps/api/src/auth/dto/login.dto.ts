import type { LoginRequest } from "@repo/shared";
import { IsEmail, IsString, IsNotEmpty } from "class-validator";

import { NormalizeEmail } from "../../common/normalize-email";

/**
 * Validated body of `POST /auth/login`. Implements the shared
 * {@link LoginRequest} contract. Login only checks that the fields are present
 * and well-formed; credential correctness is decided by the service, which
 * returns a uniform 401 so the error never reveals whether the email exists.
 * The email is normalised before the lookup, so the casing used at login need
 * not match the casing used at registration.
 */
export class LoginDto implements LoginRequest {
  @NormalizeEmail()
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
