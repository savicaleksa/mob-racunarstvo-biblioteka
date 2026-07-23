import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from "@nestjs/common";
import type { BookDetailResponse, BooksListResponse } from "@repo/shared";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { BooksService } from "./books.service";
import { ListBooksDto } from "./dto/list-books.dto";

/**
 * Book read surface (spec.md "API contract"). Both routes are auth-only — any
 * authenticated user browses the Catalog — so they sit behind
 * {@link JwtAuthGuard} with no `@Roles`. Each Book carries its Author and
 * derived Availability. Librarian-only Book CRUD is added in ticket 05.
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
}
