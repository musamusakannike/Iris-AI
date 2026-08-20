import * as Speech from 'expo-speech';

export interface SpeechOptions {
  rate?: number; // 0.5 to 2.0 (default 1.0)
  pitch?: number; // 0.5 to 1.5 (default 1.0)
  language?: string;
  onDone?: () => void;
  onError?: (error: Error) => void;
}

class SpeechService {
  private isSpeaking = false;
  private currentRate = 1.0;
  private currentPitch = 1.0;

  public setPreferences(rate = 1.0, pitch = 1.0): void {
    this.currentRate = rate;
    this.currentPitch = pitch;
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

      Speech.speak(text, {
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
      });
    } catch (error) {
      this.isSpeaking = false;
      console.warn('Error in SpeechService.speak:', error);
    }
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
