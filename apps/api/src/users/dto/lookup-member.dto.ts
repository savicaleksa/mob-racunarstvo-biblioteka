import type { MemberLookupQuery } from "@repo/shared";
import { IsEmail } from "class-validator";

import { NormalizeEmail } from "../../common/normalize-email";

/**
 * Validated query of `GET /users/lookup?email=…` [librarian+] (ADR-0011).
 * Implements the shared {@link MemberLookupQuery} contract.
 *
 * A malformed address is a 400 from `@IsEmail()` rather than a `{ exists:
 * false }` — "that is not an email" and "that email is not registered" are
 * different answers, and the Issue Loan form renders them differently. The value
 * is normalised first so the lookup agrees with what Issue will do with the very
 * same string a moment later; if the two disagreed, a confirmed email could
 * still fail at submit.
 */
export class LookupMemberDto implements MemberLookupQuery {
  @NormalizeEmail()
  @IsEmail()
  email!: string;
}
