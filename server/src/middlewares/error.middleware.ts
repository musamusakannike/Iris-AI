import { Request, Response, NextFunction } from 'express';
import { ApiError, ApiResponse } from '../utils/apiResponse';
import { logger } from '../utils/logger';
import { env } from '../config/env';

/**
 * 404 Handler for undefined routes
 */
export const notFoundHandler = (req: Request, res: Response, _next: NextFunction) => {
  return ApiResponse.error(res, `Cannot find ${req.method} ${req.originalUrl} on this server`, 404);
};

/**
 * Global Error Handler
 */
export const errorHandler = (
  err: Error | ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const statusCode = err instanceof ApiError ? err.statusCode : 500;
  const message = err.message || 'Internal Server Error';

  logger.error(`[Error] ${statusCode} - ${message}`, {
    stack: err.stack,
    ...(err instanceof ApiError && err.details ? { details: err.details } : {}),
  });

  const errorResponse: Record<string, unknown> = {
    ...(err instanceof ApiError && err.details ? { details: err.details } : {}),
  };

  if (env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  return ApiResponse.error(
    res,
    message,
    statusCode,
    Object.keys(errorResponse).length > 0 ? errorResponse : undefined
  );
};
