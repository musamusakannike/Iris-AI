import { env } from '../config/env';
import { logger } from '../utils/logger';
import { AssistiveMode, HazardLevel } from '../models/scan.model';
import { geminiService, VisionAnalysisResult, generateMockAssistiveResponse } from './gemini.service';
import { vlmService } from './vlm.service';

export { VisionAnalysisResult, generateMockAssistiveResponse };

export const aiVisionService = {
  /**
   * Universal vision analysis gateway
   * Routes to configured AI_PROVIDER (Ollama / OpenAI-Compatible VLM / Gemini / Mock)
   * with automatic fallback failover to guarantee 100% uptime for blind users.
   */
  async analyzeAssistiveImage(
    base64Image: string,
    mimeType = 'image/jpeg',
    mode: AssistiveMode = 'explore',
    customQuery?: string
  ): Promise<VisionAnalysisResult> {
    const provider = env.AI_PROVIDER;

    logger.info(`🎯 AI Vision Dispatcher selected provider: [${provider}] for mode: [${mode}]`);

    // 1. Ollama Self-Hosted VLM (Moondream, Qwen2.5-VL)
    if (provider === 'ollama') {
      try {
        return await vlmService.analyzeWithOllama(base64Image, mode, customQuery);
      } catch (ollamaErr: any) {
        logger.warn(
          `⚠️ Primary Ollama provider failed (${ollamaErr.message}). Initiating fallback sequence...`
        );
        return this.fallbackInference(base64Image, mimeType, mode, customQuery);
      }
    }

    // 2. OpenAI-Compatible VLM (vLLM, SGLang, LocalAI)
    if (provider === 'openai-compatible') {
      try {
        return await vlmService.analyzeWithOpenAICompatible(
          base64Image,
          mimeType,
          mode,
          customQuery
        );
      } catch (customVlmErr: any) {
        logger.warn(
          `⚠️ OpenAI-compatible VLM provider failed (${customVlmErr.message}). Initiating fallback sequence...`
        );
        return this.fallbackInference(base64Image, mimeType, mode, customQuery);
      }
    }

    // 3. Google Gemini Cloud API
    if (provider === 'gemini') {
      try {
        return await geminiService.analyzeAssistiveImage(
          base64Image,
          mimeType,
          mode,
          customQuery
        );
      } catch (geminiErr: any) {
        logger.warn(
          `⚠️ Gemini API failed (${geminiErr.message}). Falling back to local assistive engine.`
        );
        return generateMockAssistiveResponse(mode, customQuery);
      }
    }

    // 4. Mock / Offline Mode
    logger.info('ℹ️ Using local assistive mock engine (AI_PROVIDER=mock).');
    return generateMockAssistiveResponse(mode, customQuery);
  },

  /**
   * Resilient fallback sequence when primary self-hosted VLM fails
   */
  async fallbackInference(
    base64Image: string,
    mimeType: string,
    mode: AssistiveMode,
    customQuery?: string
  ): Promise<VisionAnalysisResult> {
    // Try Gemini if API key is configured
    if (env.GEMINI_API_KEY && env.GEMINI_API_KEY !== 'missing-api-key') {
      try {
        logger.info('🔄 Attempting fallback to Gemini API...');
        return await geminiService.analyzeAssistiveImage(
          base64Image,
          mimeType,
          mode,
          customQuery
        );
      } catch (geminiErr: any) {
        logger.warn('⚠️ Fallback Gemini API failed:', geminiErr.message);
      }
    }

    // Otherwise use on-device assistive mock
    logger.info('🛡️ Providing immediate local assistive fallback response.');
    return generateMockAssistiveResponse(mode, customQuery);
  },

  /**
   * Health check for active AI provider
   */
  async getProviderStatus(): Promise<{
    activeProvider: string;
    ollamaStatus?: { available: boolean; models: string[]; error?: string };
    geminiConfigured: boolean;
  }> {
    const geminiConfigured = Boolean(
      env.GEMINI_API_KEY && env.GEMINI_API_KEY !== 'missing-api-key'
    );

    let ollamaStatus = undefined;
    if (env.AI_PROVIDER === 'ollama' || env.OLLAMA_BASE_URL) {
      ollamaStatus = await vlmService.checkOllamaHealth();
    }

    return {
      activeProvider: env.AI_PROVIDER,
      ollamaStatus,
      geminiConfigured,
    };
  },
};
