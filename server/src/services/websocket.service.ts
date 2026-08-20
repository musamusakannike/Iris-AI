import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '../utils/logger';

export class WebSocketService {
  private static instance: WebSocketService;
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  private constructor() {}

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  /**
   * Initialize WebSocket server attached to HTTP server
   */
  public init(server: HttpServer, path = '/ws'): WebSocketServer {
    this.wss = new WebSocketServer({ server, path });

    this.wss.on('connection', (ws: WebSocket, req) => {
      this.clients.add(ws);
      const ip = req.socket.remoteAddress;
      logger.info(`🔌 WebSocket client connected [IP: ${ip}]. Total active: ${this.clients.size}`);

      // Send initial welcome/ping handshake
      ws.send(
        JSON.stringify({
          type: 'CONNECTED',
          message: 'Connected to Lumina Eye WebSocket Server',
          timestamp: new Date().toISOString(),
        })
      );

      ws.on('message', (message: string) => {
        try {
          const parsed = JSON.parse(message.toString());
          logger.debug('Received WebSocket message:', parsed);

          // Echo back or handle action
          if (parsed.type === 'PING') {
            ws.send(JSON.stringify({ type: 'PONG', timestamp: new Date().toISOString() }));
          }
        } catch {
          logger.warn('Received non-JSON WebSocket message');
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        logger.info(`🔌 WebSocket client disconnected. Total active: ${this.clients.size}`);
      });

      ws.on('error', (err) => {
        logger.error('WebSocket client error:', err);
      });
    });

    logger.info(`🚀 WebSocket server initialized on path: ${path}`);
    return this.wss;
  }

  /**
   * Broadcast message to all connected clients
   */
  public broadcast(payload: Record<string, unknown>): void {
    const data = JSON.stringify(payload);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  /**
   * Close all client connections and terminate WebSocket server
   */
  public close(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.wss) {
        return resolve();
      }

      for (const client of this.clients) {
        client.terminate();
      }
      this.clients.clear();

      this.wss.close(() => {
        logger.info('WebSocket server closed.');
        resolve();
      });
    });
  }
}

export const webSocketService = WebSocketService.getInstance();
