import type { UpdateAuthorRequest } from "@repo/shared";
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

/**
 * Validated body of `PATCH /authors/:id` [librarian+] (Author CRUD, issue 04).
 * Implements the shared {@link UpdateAuthorRequest} contract: every field is
 * optional, so only the keys present in the request are updated. `@IsOptional`
 * also lets `bio`/`birthYear` be sent as `null` to clear them.
 */
export class UpdateAuthorDto implements UpdateAuthorRequest {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  birthYear?: number | null;
}
