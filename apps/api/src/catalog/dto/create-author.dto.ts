import type { CreateAuthorRequest } from "@repo/shared";
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

/**
 * Validated body of `POST /authors` [librarian+] (Author CRUD, issue 04).
 * Implements the shared {@link CreateAuthorRequest} contract so the wire shape
 * stays in lockstep with `apps/mobile`. `name` is required and non-empty; `bio`
 * and `birthYear` are optional (nullable) and default to `null` in the service
 * when omitted.
 */
export class CreateAuthorDto implements CreateAuthorRequest {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  birthYear?: number | null;
}
