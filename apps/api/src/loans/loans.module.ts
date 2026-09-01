import { Module } from "@nestjs/common";

import { UsersModule } from "../users/users.module";
import { LoansController } from "./loans.controller";
import { LoansService } from "./loans.service";

/**
 * Lending feature (issue 06): Issue a Loan, record a Return, view all Active
 * Loans (the showcase multi-table JOIN), and view the caller's own Loans.
 * Injects the global Drizzle database (via the {@link DRIZZLE} token) and reuses
 * the auth guards; `JwtService` is available because `AuthModule` registers
 * `JwtModule` globally. Availability is derived from Active Loans (ADR-0007), the
 * same single source of truth the Catalog reads — never a stored counter.
 *
 * Imports {@link UsersModule} for one thing only: resolving a Loan's member from
 * the email Issue names them by, through the same lookup the Librarian's
 * pre-flight check uses (ADR-0011).
 */
@Module({
  imports: [UsersModule],
  controllers: [LoansController],
  providers: [LoansService],
  exports: [LoansService],
})
export class LoansModule {}
