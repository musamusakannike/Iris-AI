import * as Speech from 'expo-speech';

export interface SpeechOptions {
  rate?: number; // 0.5 to 2.0 (default 1.0)
  pitch?: number; // 0.5 to 1.5 (default 1.0)
  voice?: string; // Voice identifier
  language?: string;
  onDone?: () => void;
  onError?: (error: Error) => void;
}

export interface VoiceInfo {
  identifier: string;
  name: string;
  quality: string;
  language: string;
  networkConnectionRequired?: boolean;
}

class SpeechService {
  private isSpeaking = false;
  private currentRate = 1.0;
  private currentPitch = 1.0;
  private currentVoice?: string;

  public setPreferences(rate = 1.0, pitch = 1.0, voice?: string): void {
    this.currentRate = rate;
    this.currentPitch = pitch;
    this.currentVoice = voice;
  }

  /**
   * Fetch all available Text-to-Speech voices on the device
   */
  public async getAvailableVoices(): Promise<VoiceInfo[]> {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      if (!voices || voices.length === 0) {
        return [];
      }
      return voices.map((v) => ({
        identifier: v.identifier,
        name: v.name,
        quality: String(v.quality || 'Default'),
        language: v.language,
        networkConnectionRequired: (v as any).networkConnectionRequired,
      }));
    } catch (error) {
      console.warn('Error fetching available voices:', error);
      return [];
    }
  }

  /**
   * Speak text out loud immediately. If something is already being spoken, stops it first.
   */
  public async speak(text: string, options?: SpeechOptions): Promise<void> {
    if (!text || text.trim().length === 0) return;

    try {
      // Stop previous utterance
      await this.stop();

      this.isSpeaking = true;

      const speakOptions: Speech.SpeechOptions = {
        rate: options?.rate ?? this.currentRate,
        pitch: options?.pitch ?? this.currentPitch,
        language: options?.language ?? 'en-US',
        onDone: () => {
          this.isSpeaking = false;
          options?.onDone?.();
        },
        onStopped: () => {
          this.isSpeaking = false;
        },
        onError: (err) => {
          this.isSpeaking = false;
          options?.onError?.(err);
        },
      };

      const selectedVoice = options?.voice ?? this.currentVoice;
      if (selectedVoice) {
        speakOptions.voice = selectedVoice;
      }

      Speech.speak(text, speakOptions);
    } catch (error) {
      this.isSpeaking = false;
      console.warn('Error in SpeechService.speak:', error);
    }
  }

  /**
   * Play a short voice sample preview for testing personas
   */
  public async previewVoice(
    voiceId?: string,
    voiceName?: string,
    pitch?: number,
    rate?: number
  ): Promise<void> {
    const text = voiceName
      ? `Hello! This is ${voiceName}. IRIS AI vision guidance is ready.`
      : 'Hello! This is the selected IRIS voice persona. Ready to assist.';

    await this.speak(text, {
      voice: voiceId,
      pitch: pitch ?? this.currentPitch,
      rate: rate ?? this.currentRate,
    });
  }

  /**
   * Stop current speech immediately
   */
  public async stop(): Promise<void> {
    try {
      const speaking = await Speech.isSpeakingAsync();
      if (speaking) {
        await Speech.stop();
      }
    } catch {
      // Fallback
    } finally {
      this.isSpeaking = false;
    }
  }

  /**
   * Announce an accessibility or mode change prompt
   */
  public async announce(text: string): Promise<void> {
    return this.speak(text, { rate: 1.05 });
  }

  public getSpeakingStatus(): boolean {
    return this.isSpeaking;
  }
}

export const speechService = new SpeechService();

