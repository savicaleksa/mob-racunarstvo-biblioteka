import { Module, type DynamicModule } from "@nestjs/common";

import { AuthModule } from "./auth/auth.module";
import { CatalogModule } from "./catalog/catalog.module";
import { DrizzleModule, type DrizzleModuleOptions } from "./db/drizzle.module";
import { HealthController } from "./health/health.controller";

/**
 * Root module. Wires the Drizzle provider, the health check, and the feature
 * modules: `AuthModule` (issue 02) and `CatalogModule` (issue 03, the Authors +
 * Books read APIs). Lending and user-management modules are added by later
 * tickets.
 *
 * The module is configured exclusively through {@link AppModule.register} so
 * there is a single Drizzle import path: `main.ts` calls it with the default
 * (env/file) database, and the e2e harness calls it with a fresh ephemeral
 * `:memory:` database. The class carries no static `@Module` imports/providers,
 * because Nest would merge those with the dynamic module and import Drizzle
 * twice.
 */
@Module({})
export class AppModule {
  static register(drizzle: DrizzleModuleOptions = {}): DynamicModule {
    return {
      module: AppModule,
      imports: [DrizzleModule.forRoot(drizzle), AuthModule, CatalogModule],
      controllers: [HealthController],
    };
  }
}
