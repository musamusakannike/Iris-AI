import pino from 'pino';
import { env } from '../config/env';

/**
 * High-performance structured logger using Pino
 */
export const pinoInstance = pino({
  level: env.LOG_LEVEL || (env.NODE_ENV === 'development' ? 'debug' : 'info'),
  ...(env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  }),
});

/**
 * Application Logger wrapper for clean formatting & structured logs
 */
export const logger = {
  info: (message: string, ...meta: unknown[]) => {
    if (meta.length > 0) {
      pinoInstance.info({ meta }, message);
    } else {
      pinoInstance.info(message);
    }
  },
  warn: (message: string, ...meta: unknown[]) => {
    if (meta.length > 0) {
      pinoInstance.warn({ meta }, message);
    } else {
      pinoInstance.warn(message);
    }
  },
  error: (message: string, ...meta: unknown[]) => {
    if (meta.length > 0) {
      pinoInstance.error({ meta }, message);
    } else {
      pinoInstance.error(message);
    }
  },
  debug: (message: string, ...meta: unknown[]) => {
    if (meta.length > 0) {
      pinoInstance.debug({ meta }, message);
    } else {
      pinoInstance.debug(message);
    }
  },
};
