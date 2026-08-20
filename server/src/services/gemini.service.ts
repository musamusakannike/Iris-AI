import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let genAIClient: GoogleGenAI | null = null;

export const getGeminiClient = (): GoogleGenAI => {
  if (!genAIClient) {
    const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.warn('⚠️ GEMINI_API_KEY is not set. Gemini API calls will fail until a valid key is provided.');
    }
    genAIClient = new GoogleGenAI({ apiKey: apiKey || 'missing-api-key' });
  }
  return genAIClient;
};

export const geminiService = {
  /**
   * Generate text response using Google GenAI
   */
  async generateText(prompt: string, model = 'gemini-2.5-flash'): Promise<string> {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text || '';
  },

  /**
   * Analyze image with prompt
   */
  async analyzeImage(
    base64Image: string,
    mimeType: string,
    prompt: string,
    model = 'gemini-2.5-flash'
  ): Promise<string> {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Image,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
    });
    return response.text || '';
  },
};
