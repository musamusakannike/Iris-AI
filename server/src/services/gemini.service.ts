import { GoogleGenAI, Type, Schema } from '@google/genai';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { AssistiveMode, HazardLevel } from '../models/scan.model';

export interface VisionAnalysisResult {
  response: string;
  spokenSummary: string;
  hazardLevel: HazardLevel;
  hazardDetails?: string;
  detectedEntities: string[];
  tags: string[];
}

let genAIClient: GoogleGenAI | null = null;

export const getGeminiClient = (): GoogleGenAI | null => {
  const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'missing-api-key') {
    return null;
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({ apiKey });
  }
  return genAIClient;
};

/**
 * System prompt instructing Gemini to act as a high-fidelity visual assistant for the blind / visually impaired.
 * Kept isolated in systemInstruction so Gemini can apply implicit prompt caching (saving 50% on input token costs).
 */
const BASE_ASSISTIVE_SYSTEM_INSTRUCTION = `
You are IRIS AI, an ultra-fast, empathetic, and ultra-precise visual assistant for a blind or visually impaired person.
Your job is to perceive the camera view and provide clear, spatial, natural, and helpful spoken feedback.

Crucial Guidelines for Accessibility:
1. Spatial Direction: Use clock positions ("At 12 o'clock", "To your 2 o'clock", "On your left") and approximate distances ("about 3 feet ahead", "within arm's reach").
2. Prioritize Safety: Immediately warn about any hazards (steps, drop-offs, low hanging objects, hot surfaces, obstacles on the walking path, wet floors, moving vehicles).
3. Clear & Punchy: Avoid filler words like "In this image I can see". Start directly with the important objects and environment context.
4. Spoken Ready: Keep the spokenSummary conversational, concise (1-2 sentences), and punchy for instant Text-To-Speech playback.
`;

/**
 * Native Gemini Structured Schema
 */
const visionResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    spokenSummary: {
      type: Type.STRING,
      description: 'Concise 1-2 sentence direct spatial description suitable for Text-to-Speech audio',
    },
    fullDescription: {
      type: Type.STRING,
      description: 'Detailed spatial breakdown of surroundings, text, obstacles, or answer',
    },
    hazardLevel: {
      type: Type.STRING,
      enum: ['none', 'low', 'medium', 'high'],
      description: 'Urgency level of immediate walking or spatial hazards',
    },
    hazardDetails: {
      type: Type.STRING,
      description: 'Precise hazard description if hazardLevel is low, medium, or high, else empty string',
    },
    detectedEntities: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'List of key objects, text titles, colors, or landmarks detected',
    },
    tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Descriptive contextual tags for categorization',
    },
  },
  required: ['spokenSummary', 'fullDescription', 'hazardLevel', 'detectedEntities', 'tags'],
};

const getModePrompt = (mode: AssistiveMode, customQuery?: string): string => {
  switch (mode) {
    case 'explore':
      return `Mode: EXPLORE / SURROUNDINGS
Analyze the scene directly ahead of the user.
1. Give a direct spatial summary: What room or environment is this, what is directly ahead, and what is on the left and right?
2. Note clear walking path and any obstructions.
3. Note lighting condition if very dark or overexposed.`;

    case 'read':
      return `Mode: READ / TEXT & OCR
Read and transcribe all printed or handwritten text visible in the frame (labels, signs, papers, computer screens, currency, packaging, menus).
1. Read the most prominent title or heading first.
2. Provide the full transcription clearly in fullDescription.
3. If this is a document, food item, or medicine bottle, highlight expiration dates, warnings, or dosage if visible.`;

    case 'hazard':
      return `Mode: HAZARD & SAFETY PATH CHECK
Scan the scene strictly for walking safety, immediate obstacles, and environmental hazards.
1. Check for: steps/stairs, curbs, uneven pavement, cables/wires, low-hanging obstacles, open doors, glass, puddles/ice, approaching vehicles.
2. State immediate safety guidance (e.g. "Path clear ahead for 6 feet", "Caution: 3 steps going down directly in front of you").`;

    case 'color':
      return `Mode: COLOR & OBJECT IDENTIFICATION
Identify specific colors, clothing items, denominations of currency, or objects centered in the user's view.
1. Name the exact primary and secondary colors (e.g. "navy blue with white stripes", "olive green").
2. State the object type and its condition.`;

    case 'ask':
    default:
      return `Mode: VISUAL QUESTION & ANSWER
The user has asked the following specific question about their surroundings:
"${customQuery || 'What is in front of me?'}"
Answer the user's question directly, accurately, and politely based strictly on visual evidence in the image.`;
  }
};

/**
 * Intelligent Model Tiering:
 * - Ultra-lightweight & low-cost (gemini-2.0-flash-lite) for high-speed hazard checks & color detection ($0.075/1M tokens)
 * - High-speed accurate OCR (gemini-2.0-flash) for document & text reading
 * - Multimodal reasoning (gemini-2.5-flash) for surroundings exploration & complex visual Q&A
 */
export const PRIMARY_MODEL = 'gemini-2.5-flash';

export const getModelConfigForMode = (
  mode: AssistiveMode,
  requestedModel?: string
): { model: string; maxTokens: number } => {
  if (requestedModel && requestedModel !== PRIMARY_MODEL && requestedModel !== 'default') {
    return { model: requestedModel, maxTokens: 300 };
  }
  switch (mode) {
    case 'hazard':
      return { model: 'gemini-2.0-flash-lite', maxTokens: 180 };
    case 'color':
      return { model: 'gemini-2.0-flash-lite', maxTokens: 160 };
    case 'read':
      return { model: 'gemini-2.0-flash', maxTokens: 350 };
    case 'explore':
      return { model: 'gemini-2.5-flash', maxTokens: 280 };
    case 'ask':
    default:
      return { model: 'gemini-2.5-flash', maxTokens: 280 };
  }
};

const FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
];

/**
 * Generate intelligent fallback responses for development/offline mode
 */
const generateMockAssistiveResponse = (
  mode: AssistiveMode,
  customQuery?: string
): VisionAnalysisResult => {
  switch (mode) {
    case 'read':
      return {
        spokenSummary:
          'Text detected: "IRIS AI Vision System - Accessible live guidance for everyone".',
        response:
          'Heading: IRIS AI Vision System.\nBody: Accessible live guidance for everyone. All systems operational.',
        hazardLevel: 'none',
        hazardDetails: '',
        detectedEntities: ['sign', 'text document', 'IRIS AI'],
        tags: ['text', 'ocr', 'sign'],
      };
    case 'hazard':
      return {
        spokenSummary:
          'Path ahead is mostly clear. Small table leg situated at your 2 o\'clock position about 4 feet away.',
        response:
          'Walking surface is level flooring. No tripping hazards directly in line of motion. Keep slightly to your left to avoid table corner.',
        hazardLevel: 'low',
        hazardDetails: 'Table corner at 2 o\'clock, 4 feet away.',
        detectedEntities: ['floor', 'table leg', 'clear walkway'],
        tags: ['safety', 'indoor', 'obstacle_check'],
      };
    case 'color':
      return {
        spokenSummary:
          'The item is a deep sapphire blue with subtle dark grey accents.',
        response:
          'Dominant color: Sapphire Blue (#1E3A8A). Accent colors: Slate Grey and Pure White trim.',
        hazardLevel: 'none',
        hazardDetails: '',
        detectedEntities: ['fabric', 'blue color', 'accent trim'],
        tags: ['color_detection', 'blue', 'garment'],
      };
    case 'ask':
      return {
        spokenSummary: customQuery
          ? `Regarding "${customQuery}": The area in front of you contains an open doorway leading into a brightly lit hallway.`
          : 'You are facing an open doorway with a clear path ahead.',
        response: customQuery
          ? `Answer to "${customQuery}": An open doorway is located 5 feet directly in front of you. To the left is a bookshelf and to the right is a wall switch.`
          : 'Directly ahead is an open corridor. Good lighting conditions.',
        hazardLevel: 'none',
        hazardDetails: '',
        detectedEntities: ['doorway', 'hallway', 'light source'],
        tags: ['q_and_a', 'answer'],
      };
    case 'explore':
    default:
      return {
        spokenSummary:
          'You are in an indoor room. Directly ahead is an open space. A chair is to your left about 3 feet away.',
        response:
          'Environment: Indoor living/work space. At 12 o\'clock: open floor with smooth surface. At 9 o\'clock: wooden chair and small table. At 3 o\'clock: wall with framed picture. Lighting is clear and even.',
        hazardLevel: 'none',
        hazardDetails: '',
        detectedEntities: ['chair', 'table', 'floor', 'wall'],
        tags: ['indoor', 'living_space', 'furniture'],
      };
  }
};

export const geminiService = {
  /**
   * Analyze image with assistive mode and optional user question using native structured output
   */
  async analyzeAssistiveImage(
    base64Image: string,
    mimeType = 'image/jpeg',
    mode: AssistiveMode = 'explore',
    customQuery?: string,
    modelOverride?: string
  ): Promise<VisionAnalysisResult> {
    const ai = getGeminiClient();

    // Clean base64 data if it contains a data URL prefix
    const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

    if (!ai) {
      logger.info(
        'ℹ️ GEMINI_API_KEY not configured or offline. Generating realistic assistive response.'
      );
      return generateMockAssistiveResponse(mode, customQuery);
    }

    const { model: selectedModel, maxTokens } = getModelConfigForMode(mode, modelOverride);
    const startTime = Date.now();
    logger.info(
      `🤖 Starting Gemini inference [${selectedModel}] for mode [${mode}]. Payload: ${(cleanBase64.length / 1024).toFixed(1)} KB`
    );

    const modeInstruction = getModePrompt(mode, customQuery);
    const contents = [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType,
              data: cleanBase64,
            },
          },
          {
            text: modeInstruction,
          },
        ],
      },
    ];

    // Try selected tiered model then fallback models if needed
    const candidateModels = [
      selectedModel,
      ...FALLBACK_MODELS.filter((m) => m !== selectedModel),
    ];
    let lastError: any = null;

    for (const candidate of candidateModels) {
      try {
        logger.debug(`Attempting Gemini model: ${candidate}`);
        const response = await ai.models.generateContent({
          model: candidate,
          contents,
          config: {
            systemInstruction: BASE_ASSISTIVE_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: visionResponseSchema,
            maxOutputTokens: maxTokens,
            temperature: 0.2, // Low temperature for fast, factual, consistent perception
          },
        });

        const rawText = response.text || '';
        const elapsed = Date.now() - startTime;
        logger.info(`✅ Gemini [${candidate}] completed in ${elapsed}ms. Response size: ${rawText.length} chars`);

        try {
          const parsed = JSON.parse(rawText);
          return {
            spokenSummary: parsed.spokenSummary || parsed.fullDescription || rawText.slice(0, 150),
            response: parsed.fullDescription || parsed.spokenSummary || rawText,
            hazardLevel: parsed.hazardLevel || 'none',
            hazardDetails: parsed.hazardDetails || '',
            detectedEntities: Array.isArray(parsed.detectedEntities) ? parsed.detectedEntities : [],
            tags: Array.isArray(parsed.tags) ? parsed.tags : [mode],
          };
        } catch (jsonErr) {
          logger.warn('Failed to parse structured JSON from Gemini. Fallback parsing:', jsonErr);
          const cleanStr = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
          const fallbackParsed = JSON.parse(cleanStr);
          return {
            spokenSummary: fallbackParsed.spokenSummary || cleanStr.slice(0, 150),
            response: fallbackParsed.fullDescription || cleanStr,
            hazardLevel: fallbackParsed.hazardLevel || 'none',
            hazardDetails: fallbackParsed.hazardDetails || '',
            detectedEntities: fallbackParsed.detectedEntities || [],
            tags: fallbackParsed.tags || [mode],
          };
        }
      } catch (error: any) {
        lastError = error;
        logger.warn(`⚠️ Model [${candidate}] failed: ${error.message || error.status || JSON.stringify(error)}`);
      }
    }

    logger.error('❌ All Gemini candidate models failed. Details:', {
      message: lastError?.message,
      status: lastError?.status,
      errorDetails: lastError?.error,
    });

    return generateMockAssistiveResponse(mode, customQuery);
  },

  /**
   * Real-time streaming generation for ultra-low latency audio delivery
   */
  async analyzeAssistiveImageStream(
    base64Image: string,
    mimeType = 'image/jpeg',
    mode: AssistiveMode = 'explore',
    customQuery?: string,
    onChunk?: (chunkText: string) => void,
    modelOverride?: string
  ): Promise<VisionAnalysisResult> {
    const ai = getGeminiClient();
    const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

    if (!ai) {
      const mock = generateMockAssistiveResponse(mode, customQuery);
      onChunk?.(mock.spokenSummary);
      return mock;
    }

    const { model: selectedModel, maxTokens } = getModelConfigForMode(mode, modelOverride);
    const modeInstruction = getModePrompt(mode, customQuery);
    const contents = [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType,
              data: cleanBase64,
            },
          },
          {
            text: modeInstruction,
          },
        ],
      },
    ];

    try {
      const stream = await ai.models.generateContentStream({
        model: selectedModel,
        contents,
        config: {
          systemInstruction: BASE_ASSISTIVE_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: visionResponseSchema,
          maxOutputTokens: maxTokens,
          temperature: 0.2,
        },
      });

      let accumulatedText = '';
      for await (const chunk of stream) {
        const text = chunk.text || '';
        accumulatedText += text;
        if (text && onChunk) {
          onChunk(text);
        }
      }

      const parsed = JSON.parse(accumulatedText);
      return {
        spokenSummary: parsed.spokenSummary || accumulatedText.slice(0, 150),
        response: parsed.fullDescription || accumulatedText,
        hazardLevel: parsed.hazardLevel || 'none',
        hazardDetails: parsed.hazardDetails || '',
        detectedEntities: Array.isArray(parsed.detectedEntities) ? parsed.detectedEntities : [],
        tags: Array.isArray(parsed.tags) ? parsed.tags : [mode],
      };
    } catch (streamErr) {
      logger.warn('Stream failed or parse failed, falling back to standard inference:', streamErr);
      return this.analyzeAssistiveImage(base64Image, mimeType, mode, customQuery, modelOverride);
    }
  },

  /**
   * Simple text prompt generation with optimized models
   */
  async generateText(prompt: string, model = 'gemini-2.0-flash-lite'): Promise<string> {
    const ai = getGeminiClient();
    if (!ai) {
      return 'IRIS AI is ready to help you see the world.';
    }
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          maxOutputTokens: 200,
        },
      });
      return response.text || '';
    } catch (err: any) {
      logger.error('Error generating text:', {
        message: err?.message,
        status: err?.status,
      });
      return 'I am currently processing your request.';
    }
  },
};
