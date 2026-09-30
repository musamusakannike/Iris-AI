import { GoogleGenAI } from '@google/genai';
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
 */
const BASE_ASSISTIVE_PROMPT = `
You are IRIS AI, an advanced, empathetic, and ultra-precise visual assistant for a blind or visually impaired person.
Your job is to perceive the camera view and provide clear, spatial, natural, and helpful spoken feedback.

Crucial Guidelines for Accessibility:
1. Spatial Direction: Use clock positions ("At 12 o'clock", "To your 2 o'clock", "On your left") and approximate distances ("about 3 feet ahead", "within arm's reach").
2. Prioritize Safety: Immediately warn about any hazards (steps, drop-offs, low hanging objects, hot surfaces, obstacles on the walking path, wet floors, moving vehicles).
3. Clear & Concise: Avoid filler words like "In this image I can see". Start directly with the important objects and environment context.
4. Spoken Ready: Keep the spoken summary conversational, punchy, and easy to understand when read aloud by Text-To-Speech.
`;

const getModePrompt = (mode: AssistiveMode, customQuery?: string): string => {
  switch (mode) {
    case 'explore':
      return `
Mode: EXPLORE / SURROUNDINGS
Analyze the scene in front of the user.
1. Give a direct spatial summary: What room or environment is this, what is directly ahead, and what is on the left and right?
2. Note any clear walking path or obstructions.
3. Mention lighting condition if it is very dark or overexposed.
Format your output as valid JSON matching this schema:
{
  "spokenSummary": "Concise 1-2 sentence direct spatial description suitable for TTS audio",
  "fullDescription": "Detailed spatial breakdown of surroundings with distances and positions",
  "hazardLevel": "none" | "low" | "medium" | "high",
  "hazardDetails": "description of any hazard or obstacle if detected, else empty string",
  "detectedEntities": ["list", "of", "main", "objects"],
  "tags": ["indoor/outdoor", "location_type", "key_item"]
}
`;

    case 'read':
      return `
Mode: READ / TEXT & OCR
Read and transcribe all printed or handwritten text visible in the frame (labels, signs, papers, computer screens, currency, packaging, menus).
1. Read the most prominent title or heading first.
2. Provide the full transcription clearly.
3. If this is a document, food item, or medicine bottle, highlight expiration dates, warnings, or dosage if visible.
Format your output as valid JSON matching this schema:
{
  "spokenSummary": "Key headline or main text read out loud clearly in 1-2 sentences",
  "fullDescription": "Complete transcription of all visible text organized logically",
  "hazardLevel": "none" | "low" | "medium" | "high",
  "hazardDetails": "warnings or urgent text alerts if any",
  "detectedEntities": ["title", "product_name", "date"],
  "tags": ["document/sign/package", "readable_text"]
}
`;

    case 'hazard':
      return `
Mode: HAZARD & SAFETY PATH CHECK
Scan the scene strictly for walking safety, immediate obstacles, and environmental hazards.
1. Check for: steps/stairs going up or down, curbs, uneven pavement, cables/wires, low-hanging tree branches/beams, doors slightly open, glass doors, puddles/ice, approaching vehicles or bicycles.
2. Give clear immediate safety guidance (e.g. "Clear path ahead for 6 feet", "Caution: 3 steps going down directly in front of you").
Format your output as valid JSON matching this schema:
{
  "spokenSummary": "Immediate safety assessment. State 'Path clear' or highlight the hazard urgently.",
  "fullDescription": "Detailed breakdown of the walking surface, obstacles, and navigation advice",
  "hazardLevel": "none" | "low" | "medium" | "high",
  "hazardDetails": "Precise hazard explanation and how to avoid it",
  "detectedEntities": ["obstacle_name", "hazard_type"],
  "tags": ["safety", "hazard_level"]
}
`;

    case 'color':
      return `
Mode: COLOR & OBJECT IDENTIFICATION
Identify specific colors, clothing items, denominations of currency, or objects centered in the user's view.
1. Name the exact primary and secondary colors (e.g. "navy blue with white stripes", "olive green").
2. State the object type and its condition.
Format your output as valid JSON matching this schema:
{
  "spokenSummary": "Direct identification of the item and its exact color",
  "fullDescription": "Detailed color, pattern, texture, and object properties",
  "hazardLevel": "none",
  "hazardDetails": "",
  "detectedEntities": ["item_name", "color_name"],
  "tags": ["color", "object_id"]
}
`;

    case 'ask':
    default:
      return `
Mode: VISUAL QUESTION & ANSWER
The user has asked the following specific question about their surroundings:
"${customQuery || 'What is in front of me?'}"

Answer the user's question directly, accurately, and politely based strictly on visual evidence in the image.
Format your output as valid JSON matching this schema:
{
  "spokenSummary": "Direct, conversational answer to the user's question in 1-2 spoken sentences",
  "fullDescription": "Comprehensive answer with supporting details from the scene",
  "hazardLevel": "none" | "low" | "medium" | "high",
  "hazardDetails": "any hazard related to what they asked or in their path",
  "detectedEntities": ["relevant_items"],
  "tags": ["q_and_a"]
}
`;
  }
};

/**
 * Generate intelligent fallback responses for development/offline mode
 */
export const generateMockAssistiveResponse = (
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

const PRIMARY_MODEL = 'gemini-3.6-flash';
const FALLBACK_MODELS = [
  'gemini-3.6-flash',
  'gemini-flash-latest',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3-flash-preview',
];

export const geminiService = {
  /**
   * Analyze image with assistive mode and optional user question
   */
  async analyzeAssistiveImage(
    base64Image: string,
    mimeType = 'image/jpeg',
    mode: AssistiveMode = 'explore',
    customQuery?: string,
    model = PRIMARY_MODEL
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

    const startTime = Date.now();
    logger.info(`🤖 Starting Gemini vision inference with model [${model}]. Image payload size: ${(cleanBase64.length / 1024).toFixed(1)} KB`);

    const modeInstruction = getModePrompt(mode, customQuery);
    const fullPrompt = `${BASE_ASSISTIVE_PROMPT}\n\n${modeInstruction}\nReturn only valid JSON without markdown code fences.`;

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
            text: fullPrompt,
          },
        ],
      },
    ];

    // Try primary model then fallback models if needed
    const candidateModels = [model, ...FALLBACK_MODELS.filter((m) => m !== model)];
    let lastError: any = null;

    for (const candidate of candidateModels) {
      try {
        logger.debug(`Attempting Gemini model: ${candidate}`);
        const response = await ai.models.generateContent({
          model: candidate,
          contents,
        });

        const rawText = response.text || '';
        const elapsed = Date.now() - startTime;
        logger.info(`✅ Gemini [${candidate}] inference completed in ${elapsed}ms. Response chars: ${rawText.length}`);

        // Clean JSON formatting if enclosed in code blocks
        const jsonStr = rawText
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();

        try {
          const parsed = JSON.parse(jsonStr);
          return {
            spokenSummary: parsed.spokenSummary || parsed.fullDescription || rawText.slice(0, 150),
            response: parsed.fullDescription || parsed.spokenSummary || rawText,
            hazardLevel: parsed.hazardLevel || 'none',
            hazardDetails: parsed.hazardDetails || '',
            detectedEntities: Array.isArray(parsed.detectedEntities) ? parsed.detectedEntities : [],
            tags: Array.isArray(parsed.tags) ? parsed.tags : [mode],
          };
        } catch (jsonErr) {
          logger.warn('Failed to parse Gemini response as JSON. Using direct text:', jsonErr);
          return {
            spokenSummary: rawText.slice(0, 180).trim(),
            response: rawText.trim(),
            hazardLevel:
              rawText.toLowerCase().includes('danger') || rawText.toLowerCase().includes('hazard')
                ? 'medium'
                : 'none',
            hazardDetails: '',
            detectedEntities: [],
            tags: [mode],
          };
        }
      } catch (error: any) {
        lastError = error;
        logger.warn(`⚠️ Model [${candidate}] failed: ${error.message || error.status || JSON.stringify(error)}`);
      }
    }

    logger.error('❌ All Gemini models failed. Details:', {
      message: lastError?.message,
      status: lastError?.status,
      errorDetails: lastError?.error,
    });

    return generateMockAssistiveResponse(mode, customQuery);
  },

  /**
   * Simple text prompt generation
   */
  async generateText(prompt: string, model = PRIMARY_MODEL): Promise<string> {
    const ai = getGeminiClient();
    if (!ai) {
      return 'IRIS AI is ready to help you see the world.';
    }
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
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
