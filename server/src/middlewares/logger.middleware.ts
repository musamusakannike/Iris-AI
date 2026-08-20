import morgan from 'morgan';
import pinoHttp from 'pino-http';
import { RequestHandler } from 'express';
import { env } from '../config/env';
import { pinoInstance } from '../utils/logger';

/**
 * Pino HTTP Request Logger middleware
 */
export const pinoHttpMiddleware = pinoHttp({
  logger: pinoInstance,
  autoLogging: {
    ignore: (req) => req.url === '/api/v1/health',
  },
});

/**
 * Morgan HTTP logging middleware tailored for dev / production environments
 */
export const httpLogger: RequestHandler =
  env.NODE_ENV === 'production'
    ? morgan('combined', {
        skip: (req) => req.url === '/api/v1/health',
      })
    : morgan('dev');
