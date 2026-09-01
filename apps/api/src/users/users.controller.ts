import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  Role,
  type MemberLookupResponse,
  type UpdateUserRoleResponse,
  type UsersListResponse,
} from "@repo/shared";

import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { LookupMemberDto } from "./dto/lookup-member.dto";
import { UpdateUserRoleDto } from "./dto/update-user-role.dto";
import { UsersService } from "./users.service";

/**
 * Users surface (spec.md "API contract", issue 07; ADR-0011). Every route stacks
 * `JwtAuthGuard, RolesGuard` (order matters — auth before role), but they do
 * *not* share one role list, so `@Roles` sits on each route rather than on the
 * class.
 *
 * `list` and `updateRole` are Owner-only — the roster and the role switch are
 * the Owner's alone, and they remain the surface that proves the role guard
 * 403s the two lower roles. `lookup` is librarian+, the single deliberate
 * exception: issuing a Loan names the borrower by email, so a Librarian must be
 * able to confirm one resolves to an account. It answers with a bare boolean and
 * discloses nothing else about the user (ADR-0011).
 *
 * The Owner role itself is never assignable here: {@link UpdateUserRoleDto}
 * accepts only `ASSIGNABLE_ROLES` (`LIBRARIAN | MEMBER`), and the service further
 * refuses to change an existing Owner's role (ADR-0006).
 */
@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.OWNER)
  list(): UsersListResponse {
    return this.usersService.list();
  }

  /**
   * Always 200 — `{ exists: false }` is an answer, not an error (see
   * `MemberLookupResponse`). If a parameterised `GET /users/:id` is ever added,
   * it must be declared *after* this route so the literal `lookup` segment is
   * not swallowed by it.
   */
  @Get("lookup")
  @Roles(Role.LIBRARIAN, Role.OWNER)
  lookup(@Query() query: LookupMemberDto): MemberLookupResponse {
    return this.usersService.existsByEmail(query.email);
  }

  @Patch(":id/role")
  @Roles(Role.OWNER)
  updateRole(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateUserRoleDto,
  ): UpdateUserRoleResponse {
    return this.usersService.updateRole(id, body.role);
  }
}
