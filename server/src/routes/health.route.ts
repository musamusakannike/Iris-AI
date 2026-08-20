import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { ApiResponse } from '../utils/apiResponse';

const router = Router();

const getMongoStatus = (): string => {
  const states = ['Disconnected', 'Connected', 'Connecting', 'Disconnecting'];
  return states[mongoose.connection.readyState] || 'Unknown';
};

router.get('/', (_req: Request, res: Response) => {
  const healthData = {
    service: 'Lumina Eye API',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    database: {
      status: getMongoStatus(),
      readyState: mongoose.connection.readyState,
    },
    environment: process.env.NODE_ENV || 'development',
    memoryUsage: {
      rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
    },
  };

  return ApiResponse.success(res, healthData, 'Server is running smoothly');
});

export const healthRouter = router;
