import type { UpdateBookRequest } from "@repo/shared";
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

/**
 * Validated body of `PATCH /books/:id` [librarian+] (Book CRUD, issue 05).
 * Implements the shared {@link UpdateBookRequest} contract: every field is
 * optional, so only the keys present in the request are updated (including
 * `totalCopies`). A present `authorId` is still validated against an existing
 * Author in the service. `@IsOptional` also lets `isbn`/`publishedYear`/
 * `description` be sent as `null` to clear them.
 */
export class UpdateBookDto implements UpdateBookRequest {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  authorId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  totalCopies?: number;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  isbn?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  publishedYear?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;
}
