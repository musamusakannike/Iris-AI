import { Platform } from 'react-native';
import { AssistiveMode, VisionResponse } from './api';

export type WebSocketStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface StreamListener {
  onDescription?: (data: VisionResponse) => void;
  onStreamChunk?: (chunk: string, mode: AssistiveMode) => void;
  onHazardAlert?: (data: { hazardLevel: string; details: string }) => void;
  onStatusChange?: (status: WebSocketStatus) => void;
}

const DEFAULT_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
let currentWsUrl = `ws://${DEFAULT_HOST}:5000/ws`;

export const getWsUrl = (): string => currentWsUrl;
export const setWsUrl = (url: string): void => {
  currentWsUrl = url;
};

class IrisWebSocketClient {
  private socket: WebSocket | null = null;
  private status: WebSocketStatus = 'disconnected';
  private listeners: Set<StreamListener> = new Set();
  private reconnectTimer: any = null;
  private isExplicitlyClosed = false;

  public connect(url?: string): void {
    if (url) currentWsUrl = url;
    if (this.socket && (this.status === 'connected' || this.status === 'connecting')) {
      return;
    }

    this.isExplicitlyClosed = false;
    this.setStatus('connecting');

    try {
      this.socket = new WebSocket(currentWsUrl);

      this.socket.onopen = () => {
        this.setStatus('connected');
        console.log('🔌 Connected to IRIS AI WebSocket');
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleIncomingMessage(message);
        } catch (err) {
          console.warn('Failed to parse WebSocket message:', err);
        }
      };

      this.socket.onclose = () => {
        this.setStatus('disconnected');
        this.socket = null;
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      };

      this.socket.onerror = (err) => {
        console.warn('IRIS WebSocket error:', err);
        this.setStatus('error');
      };
    } catch (err) {
      console.warn('Error instantiating WebSocket:', err);
      this.setStatus('error');
      this.scheduleReconnect();
    }
  }

  public disconnect(): void {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.setStatus('disconnected');
  }

  public subscribe(listener: StreamListener): () => void {
    this.listeners.add(listener);
    listener.onStatusChange?.(this.status);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public sendFrame(base64Image: string, mode: AssistiveMode = 'explore'): void {
    if (!this.socket || this.status !== 'connected') {
      return;
    }

    this.socket.send(
      JSON.stringify({
        type: 'FRAME_STREAM',
        image: base64Image,
        mode,
        timestamp: new Date().toISOString(),
      })
    );
  }

  public sendVoiceQuery(base64Image: string, question: string, mode: AssistiveMode = 'ask'): void {
    if (!this.socket || this.status !== 'connected') {
      return;
    }

    this.socket.send(
      JSON.stringify({
        type: 'VOICE_QUERY',
        image: base64Image,
        question,
        mode,
        timestamp: new Date().toISOString(),
      })
    );
  }

  private handleIncomingMessage(msg: Record<string, any>): void {
    switch (msg.type) {
      case 'AI_STREAM_CHUNK': {
        const chunk = msg.chunk as string;
        const mode = (msg.mode as AssistiveMode) || 'explore';
        for (const listener of this.listeners) {
          listener.onStreamChunk?.(chunk, mode);
        }
        break;
      }

      case 'AI_DESCRIPTION': {
        const data: VisionResponse = {
          mode: msg.mode || 'explore',
          spokenSummary: msg.spokenSummary,
          response: msg.response,
          hazardLevel: msg.hazardLevel || 'none',
          hazardDetails: msg.hazardDetails,
          detectedEntities: msg.detectedEntities,
          tags: msg.tags,
          createdAt: msg.timestamp || new Date().toISOString(),
        };
        for (const listener of this.listeners) {
          listener.onDescription?.(data);
        }
        break;
      }

      case 'HAZARD_ALERT': {
        for (const listener of this.listeners) {
          listener.onHazardAlert?.({
            hazardLevel: msg.hazardLevel,
            details: msg.details,
          });
        }
        break;
      }
    }
  }

  private setStatus(newStatus: WebSocketStatus): void {
    this.status = newStatus;
    for (const listener of this.listeners) {
      listener.onStatusChange?.(newStatus);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      console.log('🔄 Attempting WebSocket reconnect...');
      this.connect();
    }, 4000);
  }

  public getStatus(): WebSocketStatus {
    return this.status;
  }
}

export const irisWebSocket = new IrisWebSocketClient();
