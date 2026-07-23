import type { ListBooksQuery } from "@repo/shared";
import { Transform } from "class-transformer";
import { IsBoolean, IsOptional, IsString } from "class-validator";

/**
 * Validated query for `GET /books` [auth]. `search` is the tokenized query
 * (ADR-0009) matched over `title + author name`; `available=true` restricts the
 * list to Books whose derived Availability is greater than zero. Query strings
 * arrive as text, so `available` is coerced: only the literal `"true"` enables
 * the filter. Implements the shared {@link ListBooksQuery} contract.
 */
export class ListBooksDto implements ListBooksQuery {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  available?: boolean;
}
