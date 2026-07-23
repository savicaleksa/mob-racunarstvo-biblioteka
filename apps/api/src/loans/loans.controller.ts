import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  Role,
  type ActiveLoansResponse,
  type IssueLoanResponse,
  type JwtPayload,
  type MyLoansResponse,
  type ReturnLoanResponse,
} from "@repo/shared";

import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { IssueLoanDto } from "./dto/issue-loan.dto";
import { LoansService } from "./loans.service";

/**
 * Lending surface (spec.md "API contract", issue 06). Issue, Return, and the
 * Active Loans showcase JOIN are Librarian-or-Owner only: they stack
 * `JwtAuthGuard, RolesGuard` (order matters — auth before role) and name both
 * roles explicitly, because there is no implicit hierarchy. `GET /loans/me` is
 * any-authenticated: it carries only {@link JwtAuthGuard} and reads the caller
 * via {@link CurrentUser}, scoping the result to their own `sub`.
 */
@Controller("loans")
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LIBRARIAN, Role.OWNER)
  issue(@Body() body: IssueLoanDto): IssueLoanResponse {
    return this.loansService.issue(body);
  }

  @Patch(":id/return")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LIBRARIAN, Role.OWNER)
  return(@Param("id", ParseIntPipe) id: number): ReturnLoanResponse {
    return this.loansService.return(id);
  }

  @Get("active")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LIBRARIAN, Role.OWNER)
  active(): ActiveLoansResponse {
    return this.loansService.activeLoans();
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: JwtPayload): MyLoansResponse {
    return this.loansService.myLoans(user.sub);
  }
}
