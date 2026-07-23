import { Module } from "@nestjs/common";

import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

/**
 * Owner user & role management feature (issue 07): list all users and change a
 * user's role between Librarian and Member. Injects the global Drizzle database
 * (via the {@link DRIZZLE} token) and reuses the auth guards; `JwtService` is
 * available because `AuthModule` registers `JwtModule` globally.
 */
@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
