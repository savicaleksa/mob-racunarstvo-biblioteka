import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  Role,
  type AuthorDetailResponse,
  type AuthorsListResponse,
  type CreateAuthorResponse,
  type UpdateAuthorResponse,
} from "@repo/shared";

import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AuthorsService } from "./authors.service";
import { CreateAuthorDto } from "./dto/create-author.dto";
import { ListAuthorsDto } from "./dto/list-authors.dto";
import { UpdateAuthorDto } from "./dto/update-author.dto";

/**
 * Author surface (spec.md "API contract"). The read routes (`GET`) are auth-only
 * — any authenticated user may browse the Catalog — so they sit behind
 * {@link JwtAuthGuard} with no `@Roles`. The write routes (`POST`/`PATCH`/
 * `DELETE`, issue 04) are Librarian-or-Owner only: they stack
 * `JwtAuthGuard, RolesGuard` (order matters — auth before role) and name both
 * roles explicitly, because there is no implicit hierarchy.
 */
@Controller("authors")
@UseGuards(JwtAuthGuard)
export class AuthorsController {
  constructor(private readonly authorsService: AuthorsService) {}

  @Get()
  list(@Query() query: ListAuthorsDto): AuthorsListResponse {
    return this.authorsService.list(query.search);
  }

  @Get(":id")
  getById(@Param("id", ParseIntPipe) id: number): AuthorDetailResponse {
    return this.authorsService.getById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LIBRARIAN, Role.OWNER)
  create(@Body() body: CreateAuthorDto): CreateAuthorResponse {
    return this.authorsService.create(body);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LIBRARIAN, Role.OWNER)
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateAuthorDto,
  ): UpdateAuthorResponse {
    return this.authorsService.update(id, body);
  }

  @Delete(":id")
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LIBRARIAN, Role.OWNER)
  remove(@Param("id", ParseIntPipe) id: number): void {
    this.authorsService.delete(id);
  }
}
