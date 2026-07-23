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
  type BookDetailResponse,
  type BooksListResponse,
  type CreateBookResponse,
  type UpdateBookResponse,
} from "@repo/shared";

import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { BooksService } from "./books.service";
import { CreateBookDto } from "./dto/create-book.dto";
import { ListBooksDto } from "./dto/list-books.dto";
import { UpdateBookDto } from "./dto/update-book.dto";

/**
 * Book surface (spec.md "API contract"). The read routes (`GET`) are auth-only
 * — any authenticated user browses the Catalog — so they sit behind
 * {@link JwtAuthGuard} with no `@Roles`. The write routes (`POST`/`PATCH`/
 * `DELETE`, issue 05) are Librarian-or-Owner only: they stack
 * `JwtAuthGuard, RolesGuard` (order matters — auth before role) and name both
 * roles explicitly, because there is no implicit hierarchy. Each Book carries
 * its Author and derived Availability (ADR-0007) on every response.
 */
@Controller("books")
@UseGuards(JwtAuthGuard)
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  list(@Query() query: ListBooksDto): BooksListResponse {
    return this.booksService.list(query.search, query.available);
  }

  @Get(":id")
  getById(@Param("id", ParseIntPipe) id: number): BookDetailResponse {
    return this.booksService.getById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LIBRARIAN, Role.OWNER)
  create(@Body() body: CreateBookDto): CreateBookResponse {
    return this.booksService.create(body);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LIBRARIAN, Role.OWNER)
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateBookDto,
  ): UpdateBookResponse {
    return this.booksService.update(id, body);
  }

  @Delete(":id")
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LIBRARIAN, Role.OWNER)
  remove(@Param("id", ParseIntPipe) id: number): void {
    this.booksService.delete(id);
  }
}
