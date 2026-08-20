import { Router } from 'express';
import { healthRouter } from './health.route';

const apiRouter = Router();

// Mount sub-routes
apiRouter.use('/health', healthRouter);

export { apiRouter };
