import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  Role,
  type ApiUser,
  type AuthResponse,
  type JwtPayload,
} from "@repo/shared";
import { eq, sql } from "drizzle-orm";

import { hashPassword, verifyPassword } from "../common/password-hashing";
import { DRIZZLE } from "../db/drizzle.module";
import type { DrizzleDatabase } from "../db/connection";
import { users, type User } from "../db/schema";
import type { LoginDto } from "./dto/login.dto";
import type { RegisterDto } from "./dto/register.dto";

/**
 * Auth use-cases behind the HTTP layer (ADR-0005/0006): registration with the
 * first-user-becomes-Owner bootstrap, credential-checked login, and profile
 * lookup. The service owns all password hashing and token signing; nothing it
 * returns ever carries the password hash.
 */
@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Register a new account. The very first account created (empty users table)
   * becomes the `OWNER`; every subsequent one is a `MEMBER` (ADR-0006). A
   * repeated email is a 409 — surfaced explicitly rather than leaking the raw
   * unique-constraint violation.
   */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, dto.email))
      .get();

    if (existing) {
      throw new ConflictException("Email is already registered");
    }

    const role = this.isFirstUser() ? Role.OWNER : Role.MEMBER;
    const passwordHash = await hashPassword(dto.password);

    const inserted = this.db
      .insert(users)
      .values({ email: dto.email, passwordHash, role })
      .returning()
      .get();

    return this.issue(inserted);
  }

  /**
   * Verify an email + password pair and issue a token. Unknown email and wrong
   * password both yield the same 401 so *this* route cannot be used to probe
   * which emails are registered.
   *
   * That is no longer the whole story for the API: `GET /users/lookup` answers
   * exactly that question, deliberately, for a Librarian or the Owner
   * (ADR-0011). The distinction is the audience — login is unauthenticated and
   * open to the world, the lookup requires a privileged token. Keep this route
   * uniform regardless.
   */
  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = this.db
      .select()
      .from(users)
      .where(eq(users.email, dto.email))
      .get();

    if (!user || !(await verifyPassword(dto.password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid email or password");
    }

    return this.issue(user);
  }

  /** Look up a user's public profile by id (the JWT `sub`) for `GET /auth/me`. */
  getProfile(userId: number): ApiUser {
    const user = this.db.select().from(users).where(eq(users.id, userId)).get();

    if (!user) {
      // Token verified but the user no longer exists (e.g. deleted).
      throw new UnauthorizedException("User no longer exists");
    }

    return this.toApiUser(user);
  }

  private isFirstUser(): boolean {
    const row = this.db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .get();
    return (row?.count ?? 0) === 0;
  }

  /** Sign a token for a user and pair it with their public profile. */
  private issue(user: User): AuthResponse {
    const payload: JwtPayload = { sub: user.id, role: user.role as Role };
    const token = this.jwtService.sign(payload);
    return { token, user: this.toApiUser(user) };
  }

  /** Project a DB row to the wire shape, dropping the password hash. */
  private toApiUser(user: User): ApiUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role as Role,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
