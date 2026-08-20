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

  // Attempt database connection in background
  connectDB().catch(() => {
    logger.warn('⚠️ MongoDB connection could not be established on startup. Server running with memory-resilient storage.');
  });

  // Graceful shutdown handling
  let isShuttingDown = false;
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info(`Received ${signal}. Gracefully shutting down server...`);

    try {
      await webSocketService.close();
    } catch {}

    try {
      server.close();
    } catch {}

    try {
      await disconnectDB();
    } catch {}

    process.exit(0);
  };

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason: unknown) => {
    logger.error('Unhandled Promise Rejection:', reason);
  });

  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });
};

startServer();
