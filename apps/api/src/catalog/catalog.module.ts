import { Module } from "@nestjs/common";

import { AuthorsController } from "./authors.controller";
import { AuthorsService } from "./authors.service";
import { BooksController } from "./books.controller";
import { BooksService } from "./books.service";

/**
 * Catalog read feature (issue 03): the Authors and Books browse APIs. Injects
 * the global Drizzle database (via the {@link DRIZZLE} token) and stacks
 * {@link JwtAuthGuard} on its routes; `JwtService` is available because
 * `AuthModule` registers `JwtModule` globally. Author CRUD (ticket 04), Book
 * CRUD (ticket 05) and lending (ticket 06) extend this module.
 */
@Module({
  controllers: [AuthorsController, BooksController],
  providers: [AuthorsService, BooksService],
  exports: [AuthorsService, BooksService],
})
export class CatalogModule {}
