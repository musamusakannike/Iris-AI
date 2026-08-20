import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

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
  isEnhanced: boolean;
  isNeural: boolean;
  badge?: 'HD NEURAL' | 'STUDIO' | 'NATURAL' | 'STANDARD';
}

class SpeechService {
  private isSpeaking = false;
  private currentRate = 1.0;
  private currentPitch = 1.0;
  private currentVoice?: string;
  private cachedVoices: VoiceInfo[] = [];
  private bestEnhancedVoiceId?: string;

  public setPreferences(rate = 1.0, pitch = 1.0, voice?: string): void {
    this.currentRate = rate;
    this.currentPitch = pitch;
    this.currentVoice = voice && voice !== 'default' ? voice : undefined;
  }

  /**
   * Determine voice quality rating and neural classification
   */
  private classifyVoice(v: Speech.Voice): {
    quality: string;
    isEnhanced: boolean;
    isNeural: boolean;
    badge: 'HD NEURAL' | 'STUDIO' | 'NATURAL' | 'STANDARD';
    rank: number;
  } {
    const rawQuality = String(v.quality || '').toLowerCase();
    const id = (v.identifier || '').toLowerCase();
    const name = (v.name || '').toLowerCase();

    // Check for Enhanced / Premium / Siri / Neural indicators
    const isPremium =
      rawQuality.includes('enhanced') ||
      rawQuality.includes('premium') ||
      rawQuality.includes('300') ||
      rawQuality === '2' || // iOS VoiceQuality.Enhanced
      name.includes('enhanced') ||
      name.includes('premium') ||
      name.includes('neural') ||
      name.includes('siri') ||
      id.includes('enhanced') ||
      id.includes('premium') ||
      id.includes('neural') ||
      id.includes('siri');

    const isStudio =
      name.includes('studio') ||
      name.includes('natural') ||
      name.includes('wavenet') ||
      id.includes('wavenet') ||
      id.includes('high-quality') ||
      id.includes('hq');

    let badge: 'HD NEURAL' | 'STUDIO' | 'NATURAL' | 'STANDARD' = 'STANDARD';
    let rank = 10;

    if (isPremium || isStudio) {
      if (name.includes('siri') || name.includes('ava') || name.includes('zoe') || name.includes('alex')) {
        badge = 'HD NEURAL';
        rank = 100;
      } else if (isPremium) {
        badge = 'HD NEURAL';
        rank = 90;
      } else {
        badge = 'STUDIO';
        rank = 80;
      }
    } else if (
      name.includes('samantha') ||
      name.includes('daniel') ||
      name.includes('karen') ||
      name.includes('oliver') ||
      name.includes('serena')
    ) {
      badge = 'NATURAL';
      rank = 50;
    }

    return {
      quality: isPremium ? 'Enhanced HD' : isStudio ? 'Studio' : 'Default',
      isEnhanced: isPremium || isStudio,
      isNeural: isPremium,
      badge,
      rank,
    };
  }

  /**
   * Fetch all available Text-to-Speech voices on the device, sorted by quality
   */
  public async getAvailableVoices(): Promise<VoiceInfo[]> {
    try {
      const rawVoices = await Speech.getAvailableVoicesAsync();
      if (!rawVoices || rawVoices.length === 0) {
        return [];
      }

      const mapped: (VoiceInfo & { rank: number })[] = rawVoices.map((v) => {
        const classification = this.classifyVoice(v);
        return {
          identifier: v.identifier,
          name: v.name,
          quality: classification.quality,
          language: v.language,
          networkConnectionRequired: (v as any).networkConnectionRequired,
          isEnhanced: classification.isEnhanced,
          isNeural: classification.isNeural,
          badge: classification.badge,
          rank: classification.rank,
        };
      });

      // Sort: English first, higher quality ranking first, local/offline first
      mapped.sort((a, b) => {
        const aIsEn = a.language.toLowerCase().startsWith('en') ? 1 : 0;
        const bIsEn = b.language.toLowerCase().startsWith('en') ? 1 : 0;
        if (aIsEn !== bIsEn) return bIsEn - aIsEn;

        // Rank by quality tier
        if (a.rank !== b.rank) return b.rank - a.rank;

        // Prefer offline / local voices
        const aOffline = !a.networkConnectionRequired ? 1 : 0;
        const bOffline = !b.networkConnectionRequired ? 1 : 0;
        if (aOffline !== bOffline) return bOffline - aOffline;

        return a.name.localeCompare(b.name);
      });

      this.cachedVoices = mapped.map(({ rank, ...rest }) => rest);

      // Auto-identify best enhanced voice for default speech
      const best = mapped.find(
        (v) => v.language.toLowerCase().startsWith('en') && v.isEnhanced && !v.networkConnectionRequired
      ) || mapped.find((v) => v.language.toLowerCase().startsWith('en') && v.isEnhanced)
        || mapped.find((v) => v.language.toLowerCase().startsWith('en'));

      if (best) {
        this.bestEnhancedVoiceId = best.identifier;
      }

      return this.cachedVoices;
    } catch (error) {
      console.warn('Error fetching available voices:', error);
      return [];
    }
  }

  /**
   * Find the highest quality Enhanced/Neural offline voice on the device
   */
  public async getBestEnhancedVoice(preferredLanguage = 'en'): Promise<VoiceInfo | null> {
    if (this.cachedVoices.length === 0) {
      await this.getAvailableVoices();
    }

    const matches = this.cachedVoices.filter((v) =>
      v.language.toLowerCase().startsWith(preferredLanguage.toLowerCase())
    );

    // 1. Look for HD Neural or Studio voices that don't need network
    const topOffline = matches.find((v) => v.isEnhanced && !v.networkConnectionRequired);
    if (topOffline) return topOffline;

    // 2. Look for any Enhanced voice
    const anyEnhanced = matches.find((v) => v.isEnhanced);
    if (anyEnhanced) return anyEnhanced;

    // 3. Look for preferred natural voices (Samantha, Daniel, etc.)
    const natural = matches.find((v) => v.badge === 'NATURAL');
    if (natural) return natural;

    return matches[0] || this.cachedVoices[0] || null;
  }

  /**
   * Speak text out loud immediately with the highest quality local voice available.
   * If something is already being spoken, stops it first.
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

      // Determine selected voice: explicit option > user preference > best discovered enhanced voice
      let selectedVoice = options?.voice ?? this.currentVoice;
      if (!selectedVoice || selectedVoice === 'default') {
        if (!this.bestEnhancedVoiceId) {
          const best = await this.getBestEnhancedVoice();
          if (best) {
            this.bestEnhancedVoiceId = best.identifier;
          }
        }
        selectedVoice = this.bestEnhancedVoiceId;
      }

      if (selectedVoice && selectedVoice !== 'default') {
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
    const text = voiceName && voiceName !== 'System Default'
      ? `Hello! This is ${voiceName}. IRIS AI offline spatial vision guidance is active.`
      : 'Hello! This is IRIS AI with high definition on-device spatial voice.';

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

