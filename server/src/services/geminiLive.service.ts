import { WebSocket } from 'ws';
import { GoogleGenAI, Modality } from '@google/genai';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { AssistiveMode, HazardLevel, ScanModel } from '../models/scan.model';
import { saveToHistoryFallback } from '../routes/history.route';
import { aiVisionService } from './aiVision.service';

/**
 * Base assistive system prompt for Gemini Live real-time bidirectional interaction.
 */
const GEMINI_LIVE_SYSTEM_INSTRUCTION = `
You are IRIS AI, a real-time, low-latency, empathetic visual companion for a blind or visually impaired person.
You continuously receive camera video frames and voice inputs.

Your Mission:
1. Spatial Direction: Always convey positions using clock angles ("At 12 o'clock", "At your 2 o'clock", "To your left") and approximate distances in feet or meters ("about 3 feet ahead", "within reach").
2. Prioritize Safety: Immediately warn about hazards (steps up/down, curbs, low-hanging obstacles, floor clutter, open doors, approaching vehicles or people).
3. Brevity & Clarity: Keep spoken feedback punchy, natural, conversational, and direct (1-2 sentences). Do not use fluff like "I can see an image of". State what is there directly.
4. Mode Responsiveness:
   - When in EXPLORE mode: summarize spatial layout, open path, and primary objects.
   - When in READ mode: read prominent text, headings, signs, or warnings out loud verbatim.
   - When in HAZARD mode: rigorously analyze walking ground and overhead clearance, giving immediate navigation alerts.
   - When in COLOR mode: state exact colors, patterns, and item names.
   - When answering a question: answer directly and politely.
`;

const getModePromptInstruction = (mode: AssistiveMode, customQuery?: string): string => {
  switch (mode) {
    case 'read':
      return 'Current mode: READ. Read all visible text, signs, labels, or documents directly.';
    case 'hazard':
      return 'Current mode: HAZARD. Scan strictly for walking safety, ground obstacles, steps, and overhead hazards.';
    case 'color':
      return 'Current mode: COLOR. State the exact colors, patterns, and condition of items in view.';
    case 'ask':
      return `User query: "${customQuery || 'What is directly in front of me?'}". Answer directly with spatial orientation.`;
    case 'explore':
    default:
      return 'Current mode: EXPLORE. Provide a brief 1-2 sentence spatial summary of what is ahead and around.';
  }
};

interface ClientLiveSession {
  session: any;
  activeMode: AssistiveMode;
  inFlightText: string;
  lastFrameSentTime: number;
  lastPromptSentTime: number;
  isModelResponding: boolean;
  model: string;
}

export class GeminiLiveService {
  private static instance: GeminiLiveService;
  private clientSessions: Map<WebSocket, ClientLiveSession> = new Map();
  private genAIClient: GoogleGenAI | null = null;

  private primaryModel = env.GEMINI_LIVE_MODEL || 'gemini-3.1-flash-live-preview';
  private fallbackModels = [
    'gemini-3.1-flash-live-preview',
    'gemini-2.5-flash-native-audio-latest',
    'gemini-3.8-live',
  ];

  private constructor() {}

  public static getInstance(): GeminiLiveService {
    if (!GeminiLiveService.instance) {
      GeminiLiveService.instance = new GeminiLiveService();
    }
    return GeminiLiveService.instance;
  }

  /**
   * Initialize or retrieve GoogleGenAI client
   */
  private getClient(): GoogleGenAI | null {
    const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'missing-api-key' || apiKey.startsWith('your_')) {
      return null;
    }
    if (!this.genAIClient) {
      this.genAIClient = new GoogleGenAI({ apiKey });
    }
    return this.genAIClient;
  }

  /**
   * Check if Gemini Live is configured and available
   */
  public isConfigured(): boolean {
    return this.getClient() !== null;
  }

  /**
   * Get active session for a client WebSocket or establish a new one
   */
  public async getOrCreateSession(
    ws: WebSocket,
    initialMode: AssistiveMode = 'explore'
  ): Promise<ClientLiveSession | null> {
    const existing = this.clientSessions.get(ws);
    if (existing && existing.session) {
      return existing;
    }

    const ai = this.getClient();
    if (!ai) {
      logger.warn('Gemini Live cannot start: GEMINI_API_KEY is not configured.');
      return null;
    }

    const modelsToTry = [
      this.primaryModel,
      ...this.fallbackModels.filter((m) => m !== this.primaryModel),
    ];

    for (const model of modelsToTry) {
      try {
        logger.info(`✨ Establishing Gemini Live session with model [${model}]...`);

        const sessionState: ClientLiveSession = {
          session: null,
          activeMode: initialMode,
          inFlightText: '',
          lastFrameSentTime: 0,
          lastPromptSentTime: 0,
          isModelResponding: false,
          model,
        };

        const session = await ai.live.connect({
          model,
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: {
              parts: [{ text: GEMINI_LIVE_SYSTEM_INSTRUCTION }],
            },
            outputAudioTranscription: {},
          },
          callbacks: {
            onopen: () => {
              logger.info(`⚡ Gemini Live WebSocket connected for client with model [${model}].`);
              this.safeSend(ws, {
                type: 'STATUS_UPDATE',
                status: 'LIVE_READY',
                model,
                message: `Gemini Live connected (${model})`,
                timestamp: new Date().toISOString(),
              });
            },
            onmessage: (msg: any) => {
              this.handleLiveServerMessage(ws, sessionState, msg);
            },
            onerror: (err: any) => {
              logger.warn(`Gemini Live socket error for model [${model}]:`, err?.message || err);
              this.safeSend(ws, {
                type: 'STATUS_UPDATE',
                status: 'LIVE_WARNING',
                message: 'Gemini Live encountered a momentary streaming warning.',
                timestamp: new Date().toISOString(),
              });
            },
            onclose: (closeEvt: any) => {
              logger.info(`Gemini Live session closed for client. Code: ${closeEvt?.code}, Reason: ${closeEvt?.reason || 'none'}`);
              this.clientSessions.delete(ws);
            },
          },
        });

        sessionState.session = session;
        this.clientSessions.set(ws, sessionState);
        return sessionState;
      } catch (err: any) {
        logger.warn(`Failed to connect Gemini Live with model [${model}]: ${err.message}`);
      }
    }

    logger.error('❌ All Gemini Live models failed to connect.');
    return null;
  }

  /**
   * Handle incoming messages from Gemini Live server
   */
  private handleLiveServerMessage(
    ws: WebSocket,
    sessionState: ClientLiveSession,
    msg: any
  ): void {
    const timestamp = new Date().toISOString();

    // 1. Check for real-time text transcription chunk
    if (msg.serverContent?.outputTranscription?.text) {
      const textChunk = msg.serverContent.outputTranscription.text;
      sessionState.inFlightText += textChunk;
      sessionState.isModelResponding = true;

      this.safeSend(ws, {
        type: 'LIVE_TRANSCRIPTION_CHUNK',
        text: textChunk,
        fullTextSoFar: sessionState.inFlightText,
        mode: sessionState.activeMode,
        timestamp,
      });
    }

    // 2. Check for real-time audio chunk (24kHz PCM)
    if (msg.serverContent?.modelTurn?.parts) {
      for (const part of msg.serverContent.modelTurn.parts) {
        if (part.inlineData?.data) {
          sessionState.isModelResponding = true;
          this.safeSend(ws, {
            type: 'LIVE_AUDIO_CHUNK',
            audioPcm24k: part.inlineData.data,
            mimeType: part.inlineData.mimeType || 'audio/pcm;rate=24000',
            timestamp,
          });
        }
      }
    }

    // 3. User barge-in / model interrupted
    if (msg.serverContent?.interrupted) {
      logger.info('Gemini Live: Model turn was interrupted by user barge-in.');
      sessionState.isModelResponding = false;
      sessionState.inFlightText = '';

      this.safeSend(ws, {
        type: 'INTERRUPTED',
        timestamp,
      });
    }

    // 4. Turn complete
    if (msg.serverContent?.turnComplete) {
      sessionState.isModelResponding = false;
      const completeText = sessionState.inFlightText.trim();
      sessionState.inFlightText = '';

      if (completeText) {
        const { hazardLevel, hazardDetails, detectedEntities } = this.extractHazardAndEntities(completeText);

        const aiDescriptionPayload = {
          type: 'AI_DESCRIPTION',
          mode: sessionState.activeMode,
          spokenSummary: completeText,
          response: completeText,
          hazardLevel,
          hazardDetails,
          detectedEntities,
          tags: ['gemini-live', sessionState.activeMode, hazardLevel],
          provider: 'gemini-live',
          timestamp,
        };

        this.safeSend(ws, aiDescriptionPayload);

        // Immediate hazard alert broadcast if hazard detected
        if (hazardLevel === 'medium' || hazardLevel === 'high') {
          this.safeSend(ws, {
            type: 'HAZARD_ALERT',
            hazardLevel,
            details: hazardDetails || completeText,
            timestamp,
          });
        }

        // Save scan to history
        ScanModel.create({
          mode: sessionState.activeMode,
          response: completeText,
          spokenSummary: completeText,
          hazardLevel,
          hazardDetails,
          detectedEntities,
          tags: ['gemini-live', sessionState.activeMode],
        }).catch((dbErr) => {
          logger.debug('Non-blocking DB save for Gemini Live turn:', dbErr.message);
        });

        saveToHistoryFallback({
          mode: sessionState.activeMode,
          response: completeText,
          spokenSummary: completeText,
          hazardLevel,
          hazardDetails,
          detectedEntities,
          tags: ['gemini-live', sessionState.activeMode],
          createdAt: new Date(),
        });
      }
    }
  }

  /**
   * Process an incoming video/camera frame from the client
   */
  public async handleFrame(
    ws: WebSocket,
    base64Image: string,
    mode: AssistiveMode = 'explore'
  ): Promise<boolean> {
    const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
    if (!cleanBase64) return false;

    const liveSession = await this.getOrCreateSession(ws, mode);
    if (!liveSession || !liveSession.session) {
      // Return false to let caller fall back to REST assistive vision
      return false;
    }

    const now = Date.now();
    // Enforce >= 1000ms between frames (Gemini Live spec <= 1 FPS)
    if (now - liveSession.lastFrameSentTime < 1000) {
      return true;
    }
    liveSession.lastFrameSentTime = now;
    liveSession.activeMode = mode;

    try {
      // 1. Stream video frame
      liveSession.session.sendRealtimeInput({
        video: {
          mimeType: 'image/jpeg',
          data: cleanBase64,
        },
      });

      // 2. Prompt Gemini Live to verbalize the frame if it is not currently answering
      if (!liveSession.isModelResponding && now - liveSession.lastPromptSentTime > 2500) {
        liveSession.lastPromptSentTime = now;
        const promptInstruction = getModePromptInstruction(mode);
        liveSession.session.sendRealtimeInput({
          text: promptInstruction,
        });
      }

      return true;
    } catch (err: any) {
      logger.warn('Error pushing frame to Gemini Live session:', err?.message || err);
      return false;
    }
  }

  /**
   * Process a voice or text query for the scene
   */
  public async handleVoiceQuery(
    ws: WebSocket,
    question: string,
    base64Image?: string,
    mode: AssistiveMode = 'ask'
  ): Promise<boolean> {
    const liveSession = await this.getOrCreateSession(ws, mode);
    if (!liveSession || !liveSession.session) {
      return false;
    }

    try {
      if (base64Image) {
        const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
        if (cleanBase64) {
          liveSession.session.sendRealtimeInput({
            video: {
              mimeType: 'image/jpeg',
              data: cleanBase64,
            },
          });
        }
      }

      liveSession.session.sendRealtimeInput({
        text: `Question: "${question}". Provide a helpful, spatial, direct answer.`,
      });

      return true;
    } catch (err: any) {
      logger.warn('Error sending voice query to Gemini Live:', err?.message || err);
      return false;
    }
  }

  /**
   * Handle assistive mode change during an active live session
   */
  public async handleModeChange(
    ws: WebSocket,
    newMode: AssistiveMode
  ): Promise<void> {
    const liveSession = this.clientSessions.get(ws);
    if (!liveSession || !liveSession.session) {
      return;
    }

    liveSession.activeMode = newMode;
    const prompt = getModePromptInstruction(newMode);

    try {
      liveSession.session.sendRealtimeInput({
        text: `Mode changed. ${prompt}`,
      });
    } catch (err: any) {
      logger.debug('Failed to inform Gemini Live of mode change:', err?.message);
    }
  }

  /**
   * Stop and close active Gemini Live session for a WebSocket client
   */
  public closeSession(ws: WebSocket): void {
    const sessionState = this.clientSessions.get(ws);
    if (sessionState && sessionState.session) {
      try {
        sessionState.session.close();
      } catch (err) {
        logger.debug('Error closing Gemini Live session:', err);
      }
    }
    this.clientSessions.delete(ws);
  }

  /**
   * Create an ephemeral token for direct client-to-server Gemini Live WebSockets
   */
  public async createEphemeralToken(): Promise<{ name: string } | null> {
    const ai = this.getClient();
    if (!ai || !ai.authTokens) {
      return null;
    }
    try {
      const token = await ai.authTokens.create({
        config: { uses: 1 },
      });
      if (token && token.name) {
        return { name: token.name };
      }
      return null;
    } catch (err: any) {
      logger.error('Failed to create Gemini Live ephemeral token:', err?.message || err);
      return null;
    }
  }

  /**
   * Get total number of active Gemini Live sessions
   */
  public getActiveSessionsCount(): number {
    return this.clientSessions.size;
  }

  /**
   * Extract hazard level and entities from model transcript
   */
  private extractHazardAndEntities(text: string): {
    hazardLevel: HazardLevel;
    hazardDetails: string;
    detectedEntities: string[];
  } {
    const lower = text.toLowerCase();
    let hazardLevel: HazardLevel = 'none';
    let hazardDetails = '';

    const highDangerKeywords = [
      'danger',
      'stop',
      'falling',
      'staircase going down',
      'stairs going down',
      'drop off',
      'incoming vehicle',
      'moving car',
      'steep drop',
      'fire',
      'wet floor',
    ];

    const cautionKeywords = [
      'caution',
      'watch out',
      'careful',
      'step',
      'curb',
      'uneven',
      'obstacle',
      'cable',
      'chair leg',
      'low branch',
      'threshold',
      'door slightly open',
    ];

    for (const kw of highDangerKeywords) {
      if (lower.includes(kw)) {
        hazardLevel = 'high';
        hazardDetails = `Hazard detected: ${kw}`;
        break;
      }
    }

    if (hazardLevel === 'none') {
      for (const kw of cautionKeywords) {
        if (lower.includes(kw)) {
          hazardLevel = 'medium';
          hazardDetails = `Obstacle noted: ${kw}`;
          break;
        }
      }
    }

    // Heuristic entity extraction for common objects
    const entityCandidates = [
      'chair',
      'table',
      'door',
      'doorway',
      'wall',
      'stairs',
      'steps',
      'person',
      'sidewalk',
      'curb',
      'car',
      'bicycle',
      'sign',
      'window',
      'computer',
      'phone',
      'floor',
      'corridor',
      'hallway',
    ];

    const detectedEntities = entityCandidates.filter((item) => lower.includes(item));

    return {
      hazardLevel,
      hazardDetails,
      detectedEntities,
    };
  }

  private safeSend(ws: WebSocket, payload: Record<string, unknown>): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }
}

export const geminiLiveService = GeminiLiveService.getInstance();
