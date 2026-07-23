import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import type { AuthResponse, JwtPayload, MeResponse } from "@repo/shared";

import { AuthService } from "./auth.service";
import { CurrentUser } from "./decorators/current-user.decorator";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

/**
 * Auth HTTP surface (spec.md "API contract"). `register` and `login` are
 * public; `me` is the proving ground for the RBAC primitives — it sits behind
 * {@link JwtAuthGuard} and reads the caller via {@link CurrentUser}.
 */
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(dto);
  }

  @Post("login")
  login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(dto);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: JwtPayload): MeResponse {
    return { user: this.authService.getProfile(user.sub) };
  }
}
