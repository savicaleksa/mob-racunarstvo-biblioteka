import type { ListAuthorsQuery } from "@repo/shared";
import { IsOptional, IsString } from "class-validator";

/**
 * Validated query for `GET /authors` [auth]. `search` is the tokenized query
 * (ADR-0009) matched over the Author `name`; absent/empty means no filter.
 * Implements the shared {@link ListAuthorsQuery} contract.
 */
export class ListAuthorsDto implements ListAuthorsQuery {
  @IsOptional()
  @IsString()
  search?: string;
}
