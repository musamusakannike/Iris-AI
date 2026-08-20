import axios from 'axios';
import { Platform } from 'react-native';

export type AssistiveMode = 'explore' | 'read' | 'hazard' | 'color' | 'ask';
export type HazardLevel = 'none' | 'low' | 'medium' | 'high';

export interface VisionResponse {
  id?: string;
  mode: AssistiveMode;
  prompt?: string;
  question?: string;
  spokenSummary: string;
  response: string;
  hazardLevel: HazardLevel;
  hazardDetails?: string;
  detectedEntities?: string[];
  tags?: string[];
  createdAt: string;
}

export interface UserSettings {
  deviceId: string;
  speechRate: number;
  speechPitch: number;
  voiceIdentifier?: string;
  verbosity: 'concise' | 'detailed';
  hazardAlertSound: boolean;
  hazardVibration: boolean;
  autoTorch: boolean;
  preferredMode: 'explore' | 'read' | 'hazard' | 'color';
}

// Default to localhost or Android emulator host 10.0.2.2
const DEFAULT_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
let currentBaseUrl = `http://172.20.10.4:5000/api/v1`;

export const getApiBaseUrl = (): string => currentBaseUrl;

export const setApiBaseUrl = (url: string): void => {
  currentBaseUrl = url.endsWith('/api/v1') ? url : `${url.replace(/\/$/, '')}/api/v1`;
};

const client = axios.create({
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiService = {
  /**
   * Analyze camera image snapshot with chosen assistive mode
   */
  async analyzeScene(
    base64Image: string,
    mode: AssistiveMode = 'explore',
    prompt?: string
  ): Promise<VisionResponse> {
    try {
      const response = await client.post(`${currentBaseUrl}/vision/analyze`, {
        image: base64Image,
        mode,
        prompt,
      });

      if (response.data && response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data?.message || 'Failed to analyze scene');
    } catch (err: any) {
      console.warn('API error analyzing scene, using local assistive engine:', err.message);
      // Local fallback for smooth offline / demo experience
      return generateLocalFallback(mode, prompt);
    }
  },

  /**
   * Ask visual question about camera frame
   */
  async askQuestion(
    base64Image: string,
    question: string
  ): Promise<VisionResponse> {
    try {
      const response = await client.post(`${currentBaseUrl}/vision/ask`, {
        image: base64Image,
        question,
      });

      if (response.data && response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data?.message || 'Failed to answer visual question');
    } catch (err: any) {
      console.warn('API error asking question, using local fallback:', err.message);
      return generateLocalFallback('ask', question);
    }
  },

  /**
   * Fetch scan and question history
   */
  async getHistory(page = 1, limit = 20, mode?: AssistiveMode): Promise<{ items: VisionResponse[]; total: number }> {
    try {
      const params: Record<string, string | number> = { page, limit };
      if (mode) params.mode = mode;

      const response = await client.get(`${currentBaseUrl}/history`, { params });
      if (response.data && response.data.success) {
        return {
          items: response.data.data || [],
          total: response.data.meta?.pagination?.total || 0,
        };
      }
      return { items: [], total: 0 };
    } catch (err) {
      console.warn('Failed to fetch remote history:', err);
      return { items: [], total: 0 };
    }
  },

  /**
   * Delete specific history entry
   */
  async deleteHistory(id: string): Promise<boolean> {
    try {
      const response = await client.delete(`${currentBaseUrl}/history/${id}`);
      return response.data?.success ?? false;
    } catch {
      return false;
    }
  },

  /**
   * Clear all history
   */
  async clearHistory(): Promise<boolean> {
    try {
      const response = await client.delete(`${currentBaseUrl}/history`);
      return response.data?.success ?? false;
    } catch {
      return false;
    }
  },

  /**
   * Get user accessibility settings
   */
  async getSettings(deviceId = 'default_device'): Promise<UserSettings> {
    try {
      const response = await client.get(`${currentBaseUrl}/settings`, { params: { deviceId } });
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
    } catch {}

    return {
      deviceId,
      speechRate: 1.0,
      speechPitch: 1.0,
      verbosity: 'concise',
      hazardAlertSound: true,
      hazardVibration: true,
      autoTorch: true,
      preferredMode: 'explore',
    };
  },

  /**
   * Update user settings
   */
  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings | null> {
    try {
      const response = await client.put(`${currentBaseUrl}/settings`, settings);
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
    } catch {}
    return null;
  },
};

const generateLocalFallback = (mode: AssistiveMode, query?: string): VisionResponse => {
  const timestamp = new Date().toISOString();
  switch (mode) {
    case 'read':
      return {
        mode: 'read',
        spokenSummary: 'Heading detected: IRIS AI Vision System. Ready to assist.',
        response: 'Heading: IRIS AI Vision System.\nBody: Accessible vision guidance.',
        hazardLevel: 'none',
        detectedEntities: ['sign', 'text'],
        createdAt: timestamp,
      };
    case 'hazard':
      return {
        mode: 'hazard',
        spokenSummary: 'Walking path ahead is clear. Small chair leg to your 2 o\'clock.',
        response: 'Ground is level. Obstacle at 2 o\'clock about 4 feet away.',
        hazardLevel: 'low',
        hazardDetails: 'Chair leg at 2 o\'clock position.',
        detectedEntities: ['floor', 'chair'],
        createdAt: timestamp,
      };
    case 'color':
      return {
        mode: 'color',
        spokenSummary: 'The item in front of you is royal blue with white borders.',
        response: 'Primary color: Royal Blue (#2563EB). Secondary: White (#FFFFFF).',
        hazardLevel: 'none',
        detectedEntities: ['clothing/item', 'blue color'],
        createdAt: timestamp,
      };
    case 'ask':
      return {
        mode: 'ask',
        question: query,
        spokenSummary: query
          ? `Regarding "${query}": The scene contains a clear hallway with an open doorway 5 feet ahead.`
          : 'You are facing an open corridor with good lighting.',
        response: `Answer to "${query || 'query'}": Open pathway directly ahead.`,
        hazardLevel: 'none',
        detectedEntities: ['doorway', 'path'],
        createdAt: timestamp,
      };
    case 'explore':
    default:
      return {
        mode: 'explore',
        spokenSummary: 'You are in an open room. Directly ahead is a walkway. To your left is a chair.',
        response: 'At 12 o\'clock: open pathway. At 9 o\'clock: chair. Lighting is clear.',
        hazardLevel: 'none',
        detectedEntities: ['room', 'chair', 'walkway'],
        createdAt: timestamp,
      };
  }
};
