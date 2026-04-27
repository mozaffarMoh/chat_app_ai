import 'dotenv/config';
import * as path from 'path';
import type { Request, Response, NextFunction } from 'express';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, type ExecutionContext } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';
import { JwtGuard } from './common/guards/jwt.guard.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:5173',
    credentials: true,
  });

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Serve uploaded voice recordings, protected by JWT cookie
  const uploadDir = path.resolve(process.env['UPLOAD_DIR'] ?? './uploads');
  const guard = new JwtGuard();
  app.use('/uploads', (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const ctx = {
          switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
          getType: () => 'http',
          getArgs: () => [req, res, next],
          getArgByIndex: (_i: number) => req,
          switchToRpc: () => ({}),
          switchToWs: () => ({}),
          getHandler: () => ({}),
          getClass: () => ({}),
        } as unknown as ExecutionContext;
        await guard.canActivate(ctx);
        next();
      } catch {
        res.status(401).json({ error: 'Unauthorized' });
      }
    })();
  });
  app.useStaticAssets(uploadDir, { prefix: '/uploads' });

  const port = process.env['PORT'] ?? 3001;
  await app.listen(port);
}

void bootstrap();
