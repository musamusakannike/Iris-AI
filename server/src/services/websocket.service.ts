import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '../utils/logger';
import { geminiService } from './gemini.service';
import { ScanModel, AssistiveMode } from '../models/scan.model';

export class WebSocketService {
  private static instance: WebSocketService;
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private lastProcessedTimestamp: Map<WebSocket, number> = new Map();

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
      this.lastProcessedTimestamp.set(ws, 0);

      const ip = req.socket.remoteAddress;
      logger.info(`🔌 WebSocket client connected [IP: ${ip}]. Total active: ${this.clients.size}`);

      // Send initial welcome handshake
      this.sendToClient(ws, {
        type: 'CONNECTED',
        message: 'Connected to IRIS AI Real-Time Stream Engine',
        timestamp: new Date().toISOString(),
      });

      ws.on('message', async (data: Buffer | string) => {
        try {
          const parsed = JSON.parse(data.toString());
          await this.handleClientMessage(ws, parsed);
        } catch (err) {
          logger.warn('Received invalid or non-JSON WebSocket message:', err);
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        this.lastProcessedTimestamp.delete(ws);
        logger.info(`🔌 WebSocket client disconnected. Total active: ${this.clients.size}`);
      });

      ws.on('error', (err) => {
        logger.error('WebSocket client error:', err);
      });
    });

    logger.info(`🚀 IRIS AI WebSocket server initialized on path: ${path}`);
    return this.wss;
  }

  /**
   * Handle incoming WebSocket messages from the mobile client
   */
  private async handleClientMessage(ws: WebSocket, message: Record<string, unknown>): Promise<void> {
    const messageType = message.type as string;

    switch (messageType) {
      case 'PING':
        this.sendToClient(ws, {
          type: 'PONG',
          timestamp: new Date().toISOString(),
        });
        break;

      case 'FRAME_STREAM': {
        // Continuous live camera stream frame
        const now = Date.now();
        const lastTime = this.lastProcessedTimestamp.get(ws) || 0;

        // Throttle frame processing to prevent overload (e.g. 1 frame every 1.5 seconds max)
        if (now - lastTime < 1400) {
          return;
        }
        this.lastProcessedTimestamp.set(ws, now);

        const imageBase64 = message.image as string;
        const mode = (message.mode as AssistiveMode) || 'explore';

        if (!imageBase64) {
          return;
        }

        try {
          const result = await geminiService.analyzeAssistiveImage(
            imageBase64,
            'image/jpeg',
            mode
          );

          this.sendToClient(ws, {
            type: 'AI_DESCRIPTION',
            mode,
            spokenSummary: result.spokenSummary,
            response: result.response,
            hazardLevel: result.hazardLevel,
            hazardDetails: result.hazardDetails,
            detectedEntities: result.detectedEntities,
            timestamp: new Date().toISOString(),
          });

          // If hazard is detected, send immediate hazard alert
          if (result.hazardLevel === 'medium' || result.hazardLevel === 'high') {
            this.sendToClient(ws, {
              type: 'HAZARD_ALERT',
              hazardLevel: result.hazardLevel,
              details: result.hazardDetails || result.spokenSummary,
              timestamp: new Date().toISOString(),
            });
          }

          // Asynchronously save to MongoDB if connected
          ScanModel.create({
            mode,
            response: result.response,
            spokenSummary: result.spokenSummary,
            hazardLevel: result.hazardLevel,
            hazardDetails: result.hazardDetails,
            detectedEntities: result.detectedEntities,
            tags: result.tags,
          }).catch((dbErr) => {
            logger.debug('Non-blocking DB save error for stream frame:', dbErr.message);
          });
        } catch (streamErr) {
          logger.error('Error processing live frame in WebSocket:', streamErr);
        }
        break;
      }

      case 'VOICE_QUERY': {
        // User asked a question verbally or typed while pointing camera
        const imageBase64 = message.image as string;
        const question = (message.question as string) || 'What is in front of me?';
        const mode = (message.mode as AssistiveMode) || 'ask';

        this.sendToClient(ws, {
          type: 'STATUS_UPDATE',
          status: 'THINKING',
          message: `Analyzing visual query: "${question}"`,
          timestamp: new Date().toISOString(),
        });

        try {
          const result = await geminiService.analyzeAssistiveImage(
            imageBase64 || '',
            'image/jpeg',
            mode,
            question
          );

          this.sendToClient(ws, {
            type: 'AI_DESCRIPTION',
            mode: 'ask',
            prompt: question,
            spokenSummary: result.spokenSummary,
            response: result.response,
            hazardLevel: result.hazardLevel,
            hazardDetails: result.hazardDetails,
            detectedEntities: result.detectedEntities,
            timestamp: new Date().toISOString(),
          });

          // Save Q&A to MongoDB
          ScanModel.create({
            mode: 'ask',
            prompt: question,
            response: result.response,
            spokenSummary: result.spokenSummary,
            hazardLevel: result.hazardLevel,
            hazardDetails: result.hazardDetails,
            detectedEntities: result.detectedEntities,
            tags: ['voice_query', ...result.tags],
          }).catch((dbErr) => {
            logger.debug('Non-blocking DB save error for voice query:', dbErr.message);
          });
        } catch (queryErr) {
          logger.error('Error handling voice query in WebSocket:', queryErr);
          this.sendToClient(ws, {
            type: 'ERROR',
            message: 'Failed to process voice query with current scene.',
          });
        }
        break;
      }

      default:
        logger.debug(`Unknown WebSocket message type: ${messageType}`);
    }
  }

  /**
   * Send JSON message to a single WebSocket client safely
   */
  public sendToClient(ws: WebSocket, payload: Record<string, unknown>): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
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
      this.lastProcessedTimestamp.clear();

      this.wss.close(() => {
        logger.info('WebSocket server closed.');
        resolve();
      });
    });
  }
}

export const webSocketService = WebSocketService.getInstance();
