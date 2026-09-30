import { Router, Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { aiVisionService } from '../services/aiVision.service';
import { geminiLiveService } from '../services/geminiLive.service';
import { ScanModel, AssistiveMode } from '../models/scan.model';
import { saveToHistoryFallback } from './history.route';
import { ApiResponse } from '../utils/apiResponse';
import { logger } from '../utils/logger';

const visionRouter = Router();

/**
 * @route   GET /api/v1/vision/status
 * @desc    Check AI Provider status (Ollama / Gemini / Gemini Live / VLM)
 * @access  Public
 */
visionRouter.get('/status', async (_req: Request, res: Response) => {
  try {
    const status = await aiVisionService.getProviderStatus();
    const enrichedStatus = {
      ...status,
      geminiLive: {
        available: geminiLiveService.isConfigured(),
        activeSessions: geminiLiveService.getActiveSessionsCount(),
        primaryModel: process.env.GEMINI_LIVE_MODEL || 'gemini-3.1-flash-live-preview',
      },
    };
    return ApiResponse.success(res, enrichedStatus, 'AI Provider status retrieved');
  } catch (error) {
    return ApiResponse.serverError(res, 'Failed to retrieve AI provider status');
  }
});

/**
 * @route   POST /api/v1/vision/ephemeral-token
 * @desc    Generate an ephemeral token for direct client-to-server Gemini Live WebSocket connection
 * @access  Public
 */
visionRouter.post('/ephemeral-token', async (_req: Request, res: Response) => {
  try {
    if (!geminiLiveService.isConfigured()) {
      return ApiResponse.badRequest(res, 'Gemini Live is not configured on the server');
    }

    const token = await geminiLiveService.createEphemeralToken();
    if (!token) {
      return ApiResponse.serverError(res, 'Failed to generate ephemeral token for Gemini Live');
    }

    return ApiResponse.success(
      res,
      {
        token: token.name,
        endpoint: 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained',
      },
      'Ephemeral token created for Gemini Live session'
    );
  } catch (error) {
    logger.error('Error creating ephemeral token:', error);
    return ApiResponse.serverError(res, 'Failed to create ephemeral token');
  }
});

const analyzeSchema = z.object({
  image: z.string().min(1, 'Image data in base64 is required'),
  mode: z.enum(['explore', 'read', 'hazard', 'color', 'ask']).default('explore'),
  prompt: z.string().optional(),
  mimeType: z.string().default('image/jpeg'),
  saveHistory: z.boolean().default(true),
});

/**
 * @route   POST /api/v1/vision/analyze
 * @desc    Analyze a camera snapshot with specified assistive mode or prompt
 * @access  Public
 */
visionRouter.post('/analyze', async (req: Request, res: Response) => {
  try {
    const parseResult = analyzeSchema.safeParse(req.body);
    if (!parseResult.success) {
      return ApiResponse.badRequest(res, 'Validation error', parseResult.error.format());
    }

    const { image, mode, prompt, mimeType, saveHistory } = parseResult.data;

    logger.info(`📸 Processing vision analysis. Mode: ${mode}${prompt ? `, Prompt: "${prompt}"` : ''}`);

    const result = await aiVisionService.analyzeAssistiveImage(
      image,
      mimeType,
      mode as AssistiveMode,
      prompt
    );

    let savedId = undefined;
    const createdAt = new Date();

    if (saveHistory) {
      const isConnected = mongoose.connection.readyState === 1;
      if (isConnected) {
        try {
          const savedRecord = await ScanModel.create({
            mode,
            prompt,
            response: result.response,
            spokenSummary: result.spokenSummary,
            hazardLevel: result.hazardLevel,
            hazardDetails: result.hazardDetails,
            detectedEntities: result.detectedEntities,
            tags: result.tags,
          });
          savedId = savedRecord._id;
        } catch (dbErr) {
          logger.warn('Failed to save scan to database:', dbErr);
        }
      }

      // Always populate memory fallback as well
      saveToHistoryFallback({
        mode,
        prompt,
        response: result.response,
        spokenSummary: result.spokenSummary,
        hazardLevel: result.hazardLevel,
        hazardDetails: result.hazardDetails,
        detectedEntities: result.detectedEntities,
        tags: result.tags,
        createdAt,
      });
    }

    return ApiResponse.success(
      res,
      {
        id: savedId,
        mode,
        spokenSummary: result.spokenSummary,
        response: result.response,
        hazardLevel: result.hazardLevel,
        hazardDetails: result.hazardDetails,
        detectedEntities: result.detectedEntities,
        tags: result.tags,
        createdAt,
      },
      'Vision analysis completed successfully'
    );
  } catch (error) {
    logger.error('Error during vision analysis endpoint:', error);
    return ApiResponse.serverError(res, 'Failed to complete vision analysis');
  }
});

/**
 * @route   POST /api/v1/vision/ask
 * @desc    Ask a visual question about the current scene
 * @access  Public
 */
visionRouter.post('/ask', async (req: Request, res: Response) => {
  try {
    const { image, question, mimeType = 'image/jpeg' } = req.body;

    if (!question || typeof question !== 'string') {
      return ApiResponse.badRequest(res, 'Question string is required');
    }

    const result = await aiVisionService.analyzeAssistiveImage(
      image || '',
      mimeType,
      'ask',
      question
    );

    const createdAt = new Date();
    let savedId = undefined;

    const isConnected = mongoose.connection.readyState === 1;
    if (isConnected) {
      try {
        const savedRecord = await ScanModel.create({
          mode: 'ask',
          prompt: question,
          response: result.response,
          spokenSummary: result.spokenSummary,
          hazardLevel: result.hazardLevel,
          hazardDetails: result.hazardDetails,
          detectedEntities: result.detectedEntities,
          tags: ['question', ...result.tags],
        });
        savedId = savedRecord._id;
      } catch (dbErr) {
        logger.warn('Failed to save question to database:', dbErr);
      }
    }

    saveToHistoryFallback({
      mode: 'ask',
      prompt: question,
      response: result.response,
      spokenSummary: result.spokenSummary,
      hazardLevel: result.hazardLevel,
      hazardDetails: result.hazardDetails,
      detectedEntities: result.detectedEntities,
      tags: ['question', ...result.tags],
      createdAt,
    });

    return ApiResponse.success(
      res,
      {
        id: savedId,
        question,
        spokenSummary: result.spokenSummary,
        response: result.response,
        hazardLevel: result.hazardLevel,
        hazardDetails: result.hazardDetails,
        detectedEntities: result.detectedEntities,
        createdAt,
      },
      'Visual question answered successfully'
    );
  } catch (error) {
    logger.error('Error during vision ask endpoint:', error);
    return ApiResponse.serverError(res, 'Failed to answer visual question');
  }
});

export { visionRouter };
