import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RolesGuard } from "./guards/roles.guard";
import { JWT_EXPIRES_IN, JWT_SECRET } from "./jwt.config";

/**
 * Wires the auth feature and, crucially, registers `JwtModule` as **global** so
 * that {@link JwtAuthGuard} (which injects `JwtService`) can be applied with
 * `@UseGuards(...)` from any feature module in tickets 03–07 without each of
 * them re-importing JwtModule. The guards are exported too, so downstream
 * modules import `JwtAuthGuard` / `RolesGuard` by path and reference them
 * directly in `@UseGuards(...)`.
 */
@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: JWT_SECRET,
      signOptions: { expiresIn: JWT_EXPIRES_IN },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, RolesGuard],
  exports: [JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
