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

  // Attempt database connection
  try {
    await connectDB();
  } catch (error) {
    logger.warn('⚠️ MongoDB connection could not be established on startup. Server running in degraded mode.');
  }

  server.listen(env.PORT, () => {
    logger.info(`🚀 Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    logger.info(`👉 API Health Endpoint: http://localhost:${env.PORT}/api/v1/health`);
    logger.info(`🔌 WebSocket Endpoint: ws://localhost:${env.PORT}/ws`);
  });

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Gracefully shutting down server...`);

    // Close WebSocket connections first
    await webSocketService.close();

    server.close(async () => {
      logger.info('HTTP server closed.');
      await disconnectDB();
      logger.info('Process terminated gracefully.');
      process.exit(0);
    });

    // Force close after 10 seconds if hanging
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
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
