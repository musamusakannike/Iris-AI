import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { connectDB, disconnectDB } from './config/db';
import { webSocketService } from './services/websocket.service';
import { logger } from './utils/logger';

const startServer = async () => {
  const app = createApp();
  const server = http.createServer(app);

  // Initialize WebSocket Server on /ws
  webSocketService.init(server, '/ws');

  // Start HTTP & WebSocket server immediately
  server.listen(env.PORT, () => {
    logger.info(`🚀 IRIS AI Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    logger.info(`👉 Health: http://localhost:${env.PORT}/api/v1/health`);
    logger.info(`👉 Vision API: http://localhost:${env.PORT}/api/v1/vision/analyze`);
    logger.info(`🔌 WebSocket: ws://localhost:${env.PORT}/ws`);
  });

  // Attempt database connection in background without blocking server startup
  connectDB().catch(() => {
    logger.warn('⚠️ MongoDB connection could not be established on startup. Server running with memory-resilient storage.');
  });

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Gracefully shutting down server...`);

    await webSocketService.close();

    server.close(async () => {
      logger.info('HTTP server closed.');
      await disconnectDB();
      logger.info('Process terminated gracefully.');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 5000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason: unknown) => {
    logger.error('Unhandled Promise Rejection:', reason);
  });

  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });
};

startServer();
