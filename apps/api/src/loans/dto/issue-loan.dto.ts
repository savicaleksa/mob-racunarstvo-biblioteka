import type { IssueLoanRequest } from "@repo/shared";
import { IsDateString, IsEmail, IsInt, IsOptional, Min } from "class-validator";

import { NormalizeEmail } from "../../common/normalize-email";

/**
 * Validated body of `POST /loans` [librarian+] (Lending, issue 06). Implements
 * the shared {@link IssueLoanRequest} contract so the wire shape stays in
 * lockstep with `apps/mobile`. `bookId` and `memberEmail` are required; whether
 * they actually reference an existing Book and user is checked in the service (a
 * clean domain error, not a 500).
 *
 * The borrower is named by email rather than by id (ADR-0011): a Librarian has
 * no route that lists users, so an id is a number they cannot look up, while an
 * email is one the member can simply tell them. `@NormalizeEmail` trims and
 * lowercases it, so the match is case-insensitive and stray whitespace from a
 * pasted address does not turn a real member into "no such account".
 *
 * `dueDate` is optional: an ISO-8601 date-time string that overrides the default
 * Due Date (borrow date + 14 days), computed in the service when omitted.
 */
export class IssueLoanDto implements IssueLoanRequest {
  @IsInt()
  @Min(1)
  bookId!: number;

  @NormalizeEmail()
  @IsEmail()
  memberEmail!: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
