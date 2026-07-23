import { Global, Module, type DynamicModule } from "@nestjs/common";

import { createDatabase, type DrizzleDatabase } from "./connection";

/** DI injection token for the Drizzle database instance. */
export const DRIZZLE = Symbol("DRIZZLE");

export interface DrizzleModuleOptions {
  /** SQLite location; forwarded to {@link createDatabase}. */
  url?: string;
  /** Whether to run migrations on connect. Defaults to `true`. */
  migrate?: boolean;
}

/**
 * Hand-written Drizzle provider module (ADR-0003): there is no official NestJS
 * Drizzle integration, so this small module wires a `better-sqlite3`-backed
 * Drizzle client into Nest DI under the {@link DRIZZLE} token. It is `@Global`
 * so any feature module can inject the database without re-importing.
 *
 * Consumers inject it with `@Inject(DRIZZLE) private readonly db: DrizzleDatabase`.
 */
@Global()
@Module({})
export class DrizzleModule {
  static forRoot(options: DrizzleModuleOptions = {}): DynamicModule {
    const provider = {
      provide: DRIZZLE,
      useFactory: (): DrizzleDatabase =>
        createDatabase({ url: options.url, migrate: options.migrate }),
    };

    return {
      module: DrizzleModule,
      providers: [provider],
      exports: [provider],
    };
  }
}
