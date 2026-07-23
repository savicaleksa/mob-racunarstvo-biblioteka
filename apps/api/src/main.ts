import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  // Boot with the default (env `DATABASE_URL` / file) database.
  const app = await NestFactory.create(AppModule.register());

  // Global validation pipe (ADR-0002): class-validator DTOs are validated on
  // every request. `whitelist` strips unknown properties; `transform` coerces
  // payloads into their DTO classes.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`API listening on http://localhost:${port}`);
}

void bootstrap();
