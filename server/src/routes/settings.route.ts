import { Router, Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { UserPreferenceModel } from '../models/preference.model';
import { ApiResponse } from '../utils/apiResponse';
import { logger } from '../utils/logger';

const settingsRouter = Router();

const inMemorySettings: Record<string, any> = {
  default_device: {
    deviceId: 'default_device',
    speechRate: 1.0,
    speechPitch: 1.0,
    verbosity: 'concise',
    hazardAlertSound: true,
    hazardVibration: true,
    autoTorch: true,
    preferredMode: 'explore',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

const updateSettingsSchema = z.object({
  deviceId: z.string().default('default_device'),
  speechRate: z.number().min(0.5).max(2.0).optional(),
  speechPitch: z.number().min(0.5).max(1.5).optional(),
  verbosity: z.enum(['concise', 'detailed']).optional(),
  hazardAlertSound: z.boolean().optional(),
  hazardVibration: z.boolean().optional(),
  autoTorch: z.boolean().optional(),
  preferredMode: z.enum(['explore', 'read', 'hazard', 'color']).optional(),
});

/**
 * @route   GET /api/v1/settings
 * @desc    Get user accessibility preferences
 * @access  Public
 */
settingsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const deviceId = (req.query.deviceId as string) || 'default_device';
    const isConnected = mongoose.connection.readyState === 1;

    let preference = null;
    if (isConnected) {
      preference = await UserPreferenceModel.findOne({ deviceId }).lean();
    }

    if (!preference) {
      preference = inMemorySettings[deviceId] || {
        deviceId,
        speechRate: 1.0,
        speechPitch: 1.0,
        verbosity: 'concise',
        hazardAlertSound: true,
        hazardVibration: true,
        autoTorch: true,
        preferredMode: 'explore',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return ApiResponse.success(res, preference, 'Settings retrieved successfully');
  } catch (error) {
    logger.error('Error fetching settings:', error);
    return ApiResponse.serverError(res, 'Failed to fetch settings');
  }
});

/**
 * @route   PUT /api/v1/settings
 * @desc    Update or create user accessibility preferences
 * @access  Public
 */
settingsRouter.put('/', async (req: Request, res: Response) => {
  try {
    const parseResult = updateSettingsSchema.safeParse(req.body);
    if (!parseResult.success) {
      return ApiResponse.badRequest(res, 'Validation error', parseResult.error.format());
    }

    const data = parseResult.data;
    const isConnected = mongoose.connection.readyState === 1;

    let preference = null;
    if (isConnected) {
      preference = await UserPreferenceModel.findOneAndUpdate(
        { deviceId: data.deviceId },
        { $set: data },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
    }

    // Update in-memory settings
    inMemorySettings[data.deviceId] = {
      ...(inMemorySettings[data.deviceId] || {}),
      ...data,
      updatedAt: new Date(),
    };

    return ApiResponse.success(
      res,
      preference || inMemorySettings[data.deviceId],
      'Settings updated successfully'
    );
  } catch (error) {
    logger.error('Error updating settings:', error);
    return ApiResponse.serverError(res, 'Failed to update settings');
  }
});

export { settingsRouter };
