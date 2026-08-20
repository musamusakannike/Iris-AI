import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { env } from './config/env';
import { httpLogger } from './middlewares/logger.middleware';
import { globalRateLimiter } from './middlewares/rateLimiter';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { apiRouter } from './routes';
import { ApiResponse } from './utils/apiResponse';

export const createApp = (): Application => {
  const app: Application = express();

  // 1. Security & Protection Middlewares
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(','),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // 2. Request Parsing & Performance Middlewares
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(compression());

  // 3. Logging Middleware
  app.use(httpLogger);

  // 4. Rate Limiting Middleware
  app.use(globalRateLimiter);

  // 5. Root Index Route
  app.get('/', (_req: Request, res: Response) => {
    return ApiResponse.success(
      res,
      {
        name: 'Lumina Eye API Server',
        version: '1.0.0',
        docs: '/api/v1/health',
      },
      'Welcome to Lumina Eye API Server'
    );
  });

  // 6. Mount API routes (/api/v1)
  app.use('/api/v1', apiRouter);

  // 7. 404 & Global Error Handling Middlewares
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
