import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const frontend = process.env.FRONTEND_URL;
  const corsOrigin = frontend
    ? frontend.split(',').map((s) => s.trim())
    : true;
  app.enableCors({ origin: corsOrigin, credentials: true });
  // Railway / reverse proxy — correct client IP & optional secure cookies.
  const http = app.getHttpAdapter().getInstance();
  if (typeof http?.set === 'function') {
    http.set('trust proxy', 1);
  }
  /** Unified deploy: static web + API cùng origin; local dev vẫn proxy /api về backend này. */
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(
    process.env.WEB_DIST_PATH
      ? `App (API + web) running on http://localhost:${port}`
      : `API running on http://localhost:${port}`,
  );
}
bootstrap();
