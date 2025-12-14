import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

function parseCorsOrigins(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map(item => item.trim())
    .filter(Boolean)
    .map(origin => origin.replace(/\/$/, ""));
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const explicitOrigins = new Set(parseCorsOrigins(process.env.CORS_ORIGINS));
  const allowVercelPreviews = process.env.CORS_ALLOW_VERCEL_PREVIEWS === "true";

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalizedOrigin = origin.replace(/\/$/, "");

      if (/^https?:\/\/localhost:\d+$/.test(normalizedOrigin)) {
        callback(null, true);
        return;
      }

      if (allowVercelPreviews && /^https:\/\/.*\.vercel\.app$/.test(normalizedOrigin)) {
        callback(null, true);
        return;
      }

      if (explicitOrigins.has(normalizedOrigin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`), false);
    }
  });
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
