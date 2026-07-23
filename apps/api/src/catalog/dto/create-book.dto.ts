import type { CreateBookRequest } from "@repo/shared";
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

/**
 * Validated body of `POST /books` [librarian+] (Book CRUD, issue 05).
 * Implements the shared {@link CreateBookRequest} contract so the wire shape
 * stays in lockstep with `apps/mobile`. `title` and `authorId` are required;
 * whether `authorId` actually references an existing Author is checked in the
 * service (a clean domain error, not a 500). `totalCopies` is optional and
 * defaults to 1 in the service when omitted; `isbn`/`publishedYear`/
 * `description` are optional (nullable) and default to `null`.
 */
export class CreateBookDto implements CreateBookRequest {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title!: string;

  @IsInt()
  @Min(1)
  authorId!: number;

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
