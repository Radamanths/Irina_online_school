import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: [/localhost:\d+$/] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true
    })
  );
  const port = process.env.PORT ? Number(process.env.PORT) : 4000;
  await app.listen(port);
  Logger.log(`🚀 API ready on http://localhost:${port}`);
}

bootstrap().catch(error => {
  Logger.error("Failed to bootstrap API", error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
