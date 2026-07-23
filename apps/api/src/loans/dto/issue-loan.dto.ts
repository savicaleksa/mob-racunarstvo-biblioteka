import type { IssueLoanRequest } from "@repo/shared";
import { IsDateString, IsInt, IsOptional, Min } from "class-validator";

/**
 * Validated body of `POST /loans` [librarian+] (Lending, issue 06). Implements
 * the shared {@link IssueLoanRequest} contract so the wire shape stays in
 * lockstep with `apps/mobile`. `bookId` and `memberId` are required; whether
 * they actually reference an existing Book and user is checked in the service (a
 * clean domain error, not a 500). `dueDate` is optional: an ISO-8601 date-time
 * string that overrides the default Due Date (borrow date + 14 days), computed
 * in the service when omitted.
 */
export class IssueLoanDto implements IssueLoanRequest {
  @IsInt()
  @Min(1)
  bookId!: number;

  @IsInt()
  @Min(1)
  memberId!: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
