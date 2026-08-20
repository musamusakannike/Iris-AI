import { Response } from 'express';

export interface ApiResponseData<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: unknown;
  meta?: Record<string, unknown>;
}

export class ApiResponse {
  static success<T>(
    res: Response,
    data: T,
    message = 'Success',
    statusCode = 200,
    meta?: Record<string, unknown>
  ): Response {
    const payload: ApiResponseData<T> = {
      success: true,
      message,
      data,
      ...(meta && { meta }),
    };
    return res.status(statusCode).json(payload);
  }

  static error(
    res: Response,
    message = 'An error occurred',
    statusCode = 500,
    error?: unknown
  ): Response {
    const payload: ApiResponseData = {
      success: false,
      message,
      ...(error !== undefined ? { error } : {}),
    };
    return res.status(statusCode).json(payload);
  }

  static badRequest(res: Response, message = 'Bad Request', error?: unknown): Response {
    return ApiResponse.error(res, message, 400, error);
  }

  static notFound(res: Response, message = 'Resource Not Found'): Response {
    return ApiResponse.error(res, message, 404);
  }

  static serverError(res: Response, message = 'Internal Server Error', error?: unknown): Response {
    return ApiResponse.error(res, message, 500, error);
  }

  static paginated<T>(
    res: Response,
    items: T[],
    pagination: { page: number; limit: number; total: number; totalPages: number },
    message = 'Success'
  ): Response {
    return ApiResponse.success(res, items, message, 200, { pagination });
  }
}

export class ApiError extends Error {
  public statusCode: number;
  public details?: unknown;

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}
