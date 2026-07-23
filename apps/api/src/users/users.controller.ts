import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from "@nestjs/common";
import {
  Role,
  type UpdateUserRoleResponse,
  type UsersListResponse,
} from "@repo/shared";

import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { UpdateUserRoleDto } from "./dto/update-user-role.dto";
import { UsersService } from "./users.service";

/**
 * Owner user & role management surface (spec.md "API contract", issue 07). Both
 * routes are Owner-only: they stack `JwtAuthGuard, RolesGuard` (order matters —
 * auth before role) and name `Role.OWNER` alone, so a MEMBER or a LIBRARIAN is
 * 403'd. This is the sole Owner-only surface, which also proves the role guard
 * rejects the two lower roles.
 *
 * The Owner role itself is never assignable here: {@link UpdateUserRoleDto}
 * accepts only `ASSIGNABLE_ROLES` (`LIBRARIAN | MEMBER`), and the service further
 * refuses to change an existing Owner's role (ADR-0006).
 */
@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(): UsersListResponse {
    return this.usersService.list();
  }

  @Patch(":id/role")
  updateRole(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateUserRoleDto,
  ): UpdateUserRoleResponse {
    return this.usersService.updateRole(id, body.role);
  }
}
