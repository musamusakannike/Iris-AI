import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { ScanModel, IScan } from '../models/scan.model';
import { ApiResponse } from '../utils/apiResponse';
import { logger } from '../utils/logger';

const historyRouter = Router();

// In-memory fallback cache for when MongoDB is in degraded/offline mode
const inMemoryHistory: Array<Record<string, any>> = [];

export const saveToHistoryFallback = (item: Record<string, any>) => {
  inMemoryHistory.unshift({
    id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    ...item,
    createdAt: item.createdAt || new Date(),
  });
  if (inMemoryHistory.length > 50) {
    inMemoryHistory.pop();
  }
};

/**
 * @route   GET /api/v1/history
 * @desc    Get paginated scan & query history with offline DB fallback
 * @access  Public
 */
historyRouter.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const mode = req.query.mode as string;

    const isConnected = mongoose.connection.readyState === 1;

    if (!isConnected) {
      const filtered = mode
        ? inMemoryHistory.filter((i) => i.mode === mode)
        : inMemoryHistory;
      const startIndex = (page - 1) * limit;
      const paginated = filtered.slice(startIndex, startIndex + limit);

      return ApiResponse.paginated(
        res,
        paginated,
        {
          page,
          limit,
          total: filtered.length,
          totalPages: Math.ceil(filtered.length / limit) || 1,
        },
        'History retrieved from memory (database offline)'
      );
    }

    const query: Record<string, unknown> = {};
    if (mode && ['explore', 'read', 'hazard', 'color', 'ask'].includes(mode)) {
      query.mode = mode;
    }

    const [items, total] = await Promise.all([
      ScanModel.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ScanModel.countDocuments(query),
    ]);

    return ApiResponse.paginated(
      res,
      items,
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      'History retrieved successfully'
    );
  } catch (error) {
    logger.error('Error fetching history:', error);
    // Graceful empty response rather than 500
    return ApiResponse.paginated(
      res,
      inMemoryHistory,
      { page: 1, limit: 20, total: inMemoryHistory.length, totalPages: 1 },
      'History fallback'
    );
  }
});

/**
 * @route   DELETE /api/v1/history/:id
 * @desc    Delete a specific history entry
 * @access  Public
 */
historyRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const isConnected = mongoose.connection.readyState === 1;

    if (isConnected) {
      await ScanModel.findByIdAndDelete(id);
    }

    const memIndex = inMemoryHistory.findIndex((i) => i.id === id);
    if (memIndex !== -1) {
      inMemoryHistory.splice(memIndex, 1);
    }

    return ApiResponse.success(res, { id }, 'History entry deleted successfully');
  } catch (error) {
    logger.error('Error deleting history entry:', error);
    return ApiResponse.serverError(res, 'Failed to delete history entry');
  }
});

/**
 * @route   DELETE /api/v1/history
 * @desc    Clear all scan history
 * @access  Public
 */
historyRouter.delete('/', async (_req: Request, res: Response) => {
  try {
    const isConnected = mongoose.connection.readyState === 1;
    let deletedCount = 0;

    if (isConnected) {
      const result = await ScanModel.deleteMany({});
      deletedCount = result.deletedCount || 0;
    }

    const memCount = inMemoryHistory.length;
    inMemoryHistory.length = 0;

    return ApiResponse.success(
      res,
      { deletedCount: deletedCount || memCount },
      'All history cleared successfully'
    );
  } catch (error) {
    logger.error('Error clearing history:', error);
    return ApiResponse.serverError(res, 'Failed to clear history');
  }
});

export { historyRouter };
