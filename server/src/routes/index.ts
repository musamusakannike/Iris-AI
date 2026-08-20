import { Router } from 'express';
import { healthRouter } from './health.route';
import { visionRouter } from './vision.route';
import { historyRouter } from './history.route';
import { settingsRouter } from './settings.route';

const apiRouter = Router();

// Mount sub-routes
apiRouter.use('/health', healthRouter);
apiRouter.use('/vision', visionRouter);
apiRouter.use('/history', historyRouter);
apiRouter.use('/settings', settingsRouter);

export { apiRouter };
