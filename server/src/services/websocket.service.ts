import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '../utils/logger';
import { aiVisionService } from './aiVision.service';
import { geminiLiveService } from './geminiLive.service';
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

      // Send initial welcome handshake with live capabilities info
      this.sendToClient(ws, {
        type: 'CONNECTED',
        message: 'Connected to IRIS AI Real-Time Stream Engine (Gemini Live Ready)',
        geminiLiveEnabled: geminiLiveService.isConfigured(),
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
        geminiLiveService.closeSession(ws);
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

      case 'START_LIVE_SESSION': {
        const mode = (message.mode as AssistiveMode) || 'explore';
        logger.info(`✨ Client requested START_LIVE_SESSION with mode: ${mode}`);
        const sessionState = await geminiLiveService.getOrCreateSession(ws, mode);
        this.sendToClient(ws, {
          type: 'STATUS_UPDATE',
          status: sessionState ? 'LIVE_ACTIVE' : 'FALLBACK_ACTIVE',
          provider: sessionState ? 'gemini-live' : 'standard-ai',
          message: sessionState
            ? `Gemini Live active (${sessionState.model})`
            : 'Gemini Live offline; fallback assistive stream active',
          timestamp: new Date().toISOString(),
        });
        break;
      }

      case 'STOP_LIVE_SESSION': {
        logger.info('🛑 Client requested STOP_LIVE_SESSION');
        geminiLiveService.closeSession(ws);
        this.sendToClient(ws, {
          type: 'STATUS_UPDATE',
          status: 'LIVE_STOPPED',
          timestamp: new Date().toISOString(),
        });
        break;
      }

      case 'MODE_CHANGE': {
        const mode = (message.mode as AssistiveMode) || 'explore';
        logger.info(`🔄 Mode change received: ${mode}`);
        await geminiLiveService.handleModeChange(ws, mode);
        break;
      }

      case 'FRAME_STREAM': {
        // Continuous live camera stream frame
        const imageBase64 = message.image as string;
        const mode = (message.mode as AssistiveMode) || 'explore';

        if (!imageBase64) {
          return;
        }

        // 1. Prioritize Gemini Live real-time bidirectional stream
        if (geminiLiveService.isConfigured()) {
          const handled = await geminiLiveService.handleFrame(ws, imageBase64, mode);
          if (handled) {
            return;
          }
        }

        // 2. Fallback: REST AI Vision Gateway (Ollama / Gemini REST / Mock)
        const now = Date.now();
        const lastTime = this.lastProcessedTimestamp.get(ws) || 0;

        if (now - lastTime < 1400) {
          return;
        }
        this.lastProcessedTimestamp.set(ws, now);

        try {
          const result = await aiVisionService.analyzeAssistiveImage(
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
            provider: 'fallback',
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
          logger.error('Error processing live frame in fallback WebSocket:', streamErr);
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

        // 1. Try Gemini Live query first
        if (geminiLiveService.isConfigured()) {
          const handled = await geminiLiveService.handleVoiceQuery(ws, question, imageBase64, mode);
          if (handled) {
            return;
          }
        }

        // 2. Fallback to AI Vision REST
        try {
          const result = await aiVisionService.analyzeAssistiveImage(
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
            provider: 'fallback',
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
          logger.error('Error handling voice query in WebSocket fallback:', queryErr);
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
