import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from "@nestjs/common";
import type { AuthorDetailResponse, AuthorsListResponse } from "@repo/shared";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthorsService } from "./authors.service";
import { ListAuthorsDto } from "./dto/list-authors.dto";

/**
 * Author read surface (spec.md "API contract"). Both routes are auth-only —
 * any authenticated user may browse the Catalog — so they sit behind
 * {@link JwtAuthGuard} with no `@Roles`. Librarian-only Author CRUD is added in
 * ticket 04.
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
}
