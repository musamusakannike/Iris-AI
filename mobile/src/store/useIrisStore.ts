import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService, AssistiveMode, UserSettings, VisionResponse } from '../services/api';
import { speechService } from '../services/speech';
import { hapticService } from '../services/haptics';

export type AIState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

const SETTINGS_STORAGE_KEY = '@iris_user_settings_v1';

interface IrisState {
  activeMode: AssistiveMode;
  aiState: AIState;
  isLiveScanning: boolean;
  torchOn: boolean;
  currentDescription: VisionResponse | null;
  currentSpokenText: string;
  hazardAlert: { level: string; details: string } | null;
  history: VisionResponse[];
  settings: UserSettings;
  isLoadingHistory: boolean;

  // Actions
  setActiveMode: (mode: AssistiveMode) => void;
  setAiState: (state: AIState) => void;
  toggleLiveScanning: () => void;
  setLiveScanning: (active: boolean) => void;
  toggleTorch: () => void;
  setCurrentDescription: (desc: VisionResponse | null) => void;
  clearCurrentDescription: () => void;
  setHazardAlert: (alert: { level: string; details: string } | null) => void;
  dismissHazardAlert: () => void;
  fetchHistory: () => Promise<void>;
  addHistoryItem: (item: VisionResponse) => void;
  deleteHistoryItem: (id: string) => Promise<void>;
  clearAllHistory: () => Promise<void>;
  loadSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  speakDescription: (text: string) => Promise<void>;
  stopSpeaking: () => Promise<void>;
}

export const useIrisStore = create<IrisState>((set, get) => ({
  activeMode: 'explore',
  aiState: 'idle',
  isLiveScanning: false,
  torchOn: false,
  currentDescription: null,
  currentSpokenText: '',
  hazardAlert: null,
  history: [],
  isLoadingHistory: false,
  settings: {
    deviceId: 'default_device',
    speechRate: 1.0,
    speechPitch: 1.0,
    voiceIdentifier: undefined,
    verbosity: 'concise',
    hazardAlertSound: true,
    hazardVibration: true,
    autoTorch: true,
    preferredMode: 'explore',
  },

  setActiveMode: (mode: AssistiveMode) => {
    set({ activeMode: mode });
    hapticService.selection();
    const modeNames: Record<AssistiveMode, string> = {
      explore: 'Explore Surroundings Mode',
      read: 'Read and OCR Mode',
      hazard: 'Hazard and Safety Mode',
      color: 'Color and Object Mode',
      ask: 'Ask Question Mode',
    };
    speechService.announce(`${modeNames[mode] || mode} active`);
  },

  setAiState: (aiState: AIState) => {
    set({ aiState });
  },

  toggleLiveScanning: () => {
    const nextState = !get().isLiveScanning;
    set({ isLiveScanning: nextState });
    hapticService.triggerHeavy();
    if (nextState) {
      speechService.announce('Live continuous scan started');
    } else {
      speechService.announce('Live continuous scan stopped');
    }
  },

  setLiveScanning: (active: boolean) => {
    set({ isLiveScanning: active });
  },

  toggleTorch: () => {
    const next = !get().torchOn;
    set({ torchOn: next });
    hapticService.tap();
    speechService.announce(next ? 'Flashlight on' : 'Flashlight off');
  },

  setCurrentDescription: (desc: VisionResponse | null) => {
    set({
      currentDescription: desc,
      currentSpokenText: desc?.spokenSummary || '',
      aiState: desc ? 'speaking' : 'idle',
    });

    if (desc) {
      get().addHistoryItem(desc);
      get().speakDescription(desc.spokenSummary);
    }
  },

  clearCurrentDescription: () => {
    speechService.stop();
    set({ currentDescription: null, currentSpokenText: '', aiState: 'idle' });
  },

  setHazardAlert: (alert) => {
    set({ hazardAlert: alert });
    if (alert) {
      hapticService.warning();
      speechService.speak(`Warning: ${alert.details}`);
    }
  },

  dismissHazardAlert: () => {
    set({ hazardAlert: null });
  },

  fetchHistory: async () => {
    set({ isLoadingHistory: true });
    try {
      const res = await apiService.getHistory(1, 30);
      set({ history: res.items, isLoadingHistory: false });
    } catch {
      set({ isLoadingHistory: false });
    }
  },

  addHistoryItem: (item: VisionResponse) => {
    set((state) => ({
      history: [item, ...state.history.filter((h) => h.id !== item.id && h.spokenSummary !== item.spokenSummary)].slice(0, 50),
    }));
  },

  deleteHistoryItem: async (id: string) => {
    await apiService.deleteHistory(id);
    set((state) => ({
      history: state.history.filter((h) => h.id !== id),
    }));
    hapticService.tap();
  },

  clearAllHistory: async () => {
    await apiService.clearHistory();
    set({ history: [] });
    hapticService.triggerHeavy();
    speechService.announce('History cleared');
  },

  loadSettings: async () => {
    try {
      // 1. Try loading from AsyncStorage
      const cached = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        const merged = { ...get().settings, ...parsed };
        set({ settings: merged });
        speechService.setPreferences(merged.speechRate, merged.speechPitch, merged.voiceIdentifier);
      }

      // 2. Fetch latest from API if online
      const remote = await apiService.getSettings(get().settings.deviceId);
      if (remote) {
        const merged = { ...get().settings, ...remote };
        set({ settings: merged });
        speechService.setPreferences(merged.speechRate, merged.speechPitch, merged.voiceIdentifier);
        await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
      }
    } catch (e) {
      console.warn('Could not load settings:', e);
    }
  },

  updateSettings: async (newSettings: Partial<UserSettings>) => {
    const updated = { ...get().settings, ...newSettings };
    set({ settings: updated });
    speechService.setPreferences(updated.speechRate, updated.speechPitch, updated.voiceIdentifier);
    
    try {
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    } catch {}

    try {
      await apiService.updateSettings(updated);
    } catch {}
  },

  speakDescription: async (text: string) => {
    if (!text) return;
    set({ aiState: 'speaking' });
    hapticService.success();
    await speechService.speak(text, {
      rate: get().settings.speechRate,
      pitch: get().settings.speechPitch,
      voice: get().settings.voiceIdentifier,
      onDone: () => {
        set({ aiState: 'idle' });
      },
    });
  },

  stopSpeaking: async () => {
    await speechService.stop();
    set({ aiState: 'idle' });
  },
}));
