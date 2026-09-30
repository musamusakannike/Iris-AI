import { env } from '../config/env';
import { logger } from '../utils/logger';
import { AssistiveMode, HazardLevel } from '../models/scan.model';
import { VisionAnalysisResult } from './gemini.service';

const BASE_ASSISTIVE_PROMPT = `You are IRIS AI, an advanced, empathetic, and ultra-precise visual assistant for a blind or visually impaired person.
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
      return `Mode: EXPLORE / SURROUNDINGS
Analyze the scene in front of the user.
1. Give a direct spatial summary: What room or environment is this, what is directly ahead, and what is on the left and right?
2. Note any clear walking path or obstructions.
3. Mention lighting condition if it is very dark or overexposed.
Format your output strictly as a JSON object matching this schema:
{
  "spokenSummary": "Concise 1-2 sentence direct spatial description suitable for TTS audio",
  "fullDescription": "Detailed spatial breakdown of surroundings with distances and positions",
  "hazardLevel": "none" | "low" | "medium" | "high",
  "hazardDetails": "description of any hazard or obstacle if detected, else empty string",
  "detectedEntities": ["list", "of", "main", "objects"],
  "tags": ["indoor/outdoor", "location_type", "key_item"]
}`;

    case 'read':
      return `Mode: READ / TEXT & OCR
Read and transcribe all printed or handwritten text visible in the frame (labels, signs, papers, computer screens, currency, packaging, menus).
1. Read the most prominent title or heading first.
2. Provide the full transcription clearly.
3. If this is a document, food item, or medicine bottle, highlight expiration dates, warnings, or dosage if visible.
Format your output strictly as a JSON object matching this schema:
{
  "spokenSummary": "Key headline or main text read out loud clearly in 1-2 sentences",
  "fullDescription": "Complete transcription of all visible text organized logically",
  "hazardLevel": "none" | "low" | "medium" | "high",
  "hazardDetails": "warnings or urgent text alerts if any",
  "detectedEntities": ["title", "product_name", "date"],
  "tags": ["document/sign/package", "readable_text"]
}`;

    case 'hazard':
      return `Mode: HAZARD & SAFETY PATH CHECK
Scan the scene strictly for walking safety, immediate obstacles, and environmental hazards.
1. Check for: steps/stairs going up or down, curbs, uneven pavement, cables/wires, low-hanging tree branches/beams, doors slightly open, glass doors, puddles/ice, approaching vehicles or bicycles.
2. Give clear immediate safety guidance (e.g. "Clear path ahead for 6 feet", "Caution: 3 steps going down directly in front of you").
Format your output strictly as a JSON object matching this schema:
{
  "spokenSummary": "Immediate safety assessment. State 'Path clear' or highlight the hazard urgently.",
  "fullDescription": "Detailed breakdown of the walking surface, obstacles, and navigation advice",
  "hazardLevel": "none" | "low" | "medium" | "high",
  "hazardDetails": "Precise hazard explanation and how to avoid it",
  "detectedEntities": ["obstacle_name", "hazard_type"],
  "tags": ["safety", "hazard_level"]
}`;

    case 'color':
      return `Mode: COLOR & OBJECT IDENTIFICATION
Identify specific colors, clothing items, denominations of currency, or objects centered in the user's view.
1. Name the exact primary and secondary colors (e.g. "navy blue with white stripes", "olive green").
2. State the object type and its condition.
Format your output strictly as a JSON object matching this schema:
{
  "spokenSummary": "Direct identification of the item and its exact color",
  "fullDescription": "Detailed color, pattern, texture, and object properties",
  "hazardLevel": "none",
  "hazardDetails": "",
  "detectedEntities": ["item_name", "color_name"],
  "tags": ["color", "object_id"]
}`;

    case 'ask':
    default:
      return `Mode: VISUAL QUESTION & ANSWER
The user has asked the following specific question about their surroundings:
"${customQuery || 'What is in front of me?'}"

Answer the user's question directly, accurately, and politely based strictly on visual evidence in the image.
Format your output strictly as a JSON object matching this schema:
{
  "spokenSummary": "Direct, conversational answer to the user's question in 1-2 spoken sentences",
  "fullDescription": "Comprehensive answer with supporting details from the scene",
  "hazardLevel": "none" | "low" | "medium" | "high",
  "hazardDetails": "any hazard related to what they asked or in their path",
  "detectedEntities": ["relevant_items"],
  "tags": ["q_and_a"]
}`;
  }
};

/**
 * Clean and parse model response into structured JSON
 */
const parseVLMJsonResponse = (
  rawText: string,
  mode: AssistiveMode
): VisionAnalysisResult => {
  // Strip Markdown code fences if any
  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // Try extracting the first valid JSON block
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        spokenSummary: parsed.spokenSummary || parsed.fullDescription || rawText.slice(0, 160),
        response: parsed.fullDescription || parsed.spokenSummary || rawText,
        hazardLevel: (['none', 'low', 'medium', 'high'].includes(parsed.hazardLevel)
          ? parsed.hazardLevel
          : 'none') as HazardLevel,
        hazardDetails: parsed.hazardDetails || '',
        detectedEntities: Array.isArray(parsed.detectedEntities) ? parsed.detectedEntities : [],
        tags: Array.isArray(parsed.tags) ? parsed.tags : [mode],
      };
    } catch {
      // Fall through to heuristic parsing
    }
  }

  // Fallback heuristic extraction if model returned plain conversational text
  const isHazard =
    rawText.toLowerCase().includes('danger') ||
    rawText.toLowerCase().includes('caution') ||
    rawText.toLowerCase().includes('hazard') ||
    rawText.toLowerCase().includes('obstacle');

  return {
    spokenSummary: rawText.slice(0, 200).trim(),
    response: rawText.trim(),
    hazardLevel: isHazard ? 'medium' : 'none',
    hazardDetails: isHazard ? 'Potential hazard mentioned in description.' : '',
    detectedEntities: [],
    tags: [mode],
  };
};

export const vlmService = {
  /**
   * Run inference using self-hosted Ollama server (Moondream / Qwen2.5-VL)
   */
  async analyzeWithOllama(
    base64Image: string,
    mode: AssistiveMode = 'explore',
    customQuery?: string,
    model = env.OLLAMA_MODEL
  ): Promise<VisionAnalysisResult> {
    const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
    const baseUrl = env.OLLAMA_BASE_URL.replace(/\/$/, '');
    const startTime = Date.now();

    logger.info(
      `🦙 Starting Ollama VLM inference at [${baseUrl}] with model [${model}]. Image payload: ${(cleanBase64.length / 1024).toFixed(1)} KB`
    );

    const modePrompt = getModePrompt(mode, customQuery);
    const systemPrompt = `${BASE_ASSISTIVE_PROMPT}\n\n${modePrompt}\n\nOutput only valid JSON.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000); // 25s timeout for VLM

    try {
      const response = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt: systemPrompt,
          images: [cleanBase64],
          stream: false,
          format: 'json',
          options: {
            temperature: 0.2,
            top_p: 0.9,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Ollama server returned HTTP ${response.status}: ${errorBody || response.statusText}`
        );
      }

      const data = (await response.json()) as { response?: string };
      const rawText = data.response || '';
      const elapsed = Date.now() - startTime;

      logger.info(
        `✅ Ollama [${model}] inference completed in ${elapsed}ms. Response length: ${rawText.length} chars`
      );

      return parseVLMJsonResponse(rawText, mode);
    } catch (err: any) {
      clearTimeout(timeout);
      logger.error(`❌ Ollama VLM inference failed [${model}]:`, err.message || err);
      throw err;
    }
  },

  /**
   * Run inference using an OpenAI-compatible self-hosted server (vLLM / SGLang / LocalAI)
   */
  async analyzeWithOpenAICompatible(
    base64Image: string,
    mimeType = 'image/jpeg',
    mode: AssistiveMode = 'explore',
    customQuery?: string,
    model = env.OPENAI_COMPATIBLE_MODEL
  ): Promise<VisionAnalysisResult> {
    const baseUrl = (env.OPENAI_COMPATIBLE_BASE_URL || 'http://localhost:8000/v1').replace(/\/$/, '');
    const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
    const startTime = Date.now();

    logger.info(
      `🌐 Starting OpenAI-Compatible VLM inference at [${baseUrl}] with model [${model}]`
    );

    const modePrompt = getModePrompt(mode, customQuery);
    const systemPrompt = `${BASE_ASSISTIVE_PROMPT}\n\n${modePrompt}\n\nOutput only valid JSON.`;
    const imageUrl = `data:${mimeType};base64,${cleanBase64}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (env.OPENAI_COMPATIBLE_API_KEY) {
      headers['Authorization'] = `Bearer ${env.OPENAI_COMPATIBLE_API_KEY}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: systemPrompt },
                {
                  type: 'image_url',
                  image_url: { url: imageUrl },
                },
              ],
            },
          ],
          temperature: 0.2,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `OpenAI-compatible VLM server returned HTTP ${response.status}: ${errorBody}`
        );
      }

      const data = (await response.json()) as any;
      const rawText = data.choices?.[0]?.message?.content || '';
      const elapsed = Date.now() - startTime;

      logger.info(
        `✅ OpenAI-Compatible [${model}] inference completed in ${elapsed}ms.`
      );

      return parseVLMJsonResponse(rawText, mode);
    } catch (err: any) {
      clearTimeout(timeout);
      logger.error('❌ OpenAI-compatible VLM inference failed:', err.message || err);
      throw err;
    }
  },

  /**
   * Check health and connectivity of the self-hosted Ollama server
   */
  async checkOllamaHealth(): Promise<{ available: boolean; models: string[]; error?: string }> {
    const baseUrl = env.OLLAMA_BASE_URL.replace(/\/$/, '');
    try {
      const response = await fetch(`${baseUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        return { available: false, models: [], error: `HTTP ${response.status}` };
      }
      const data = (await response.json()) as { models?: Array<{ name: string }> };
      const models = (data.models || []).map((m) => m.name);
      return { available: true, models };
    } catch (err: any) {
      return { available: false, models: [], error: err.message };
    }
  },
};
