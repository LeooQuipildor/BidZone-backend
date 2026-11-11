import { Router } from 'express';
import { testDatabaseConnection } from '../config/db.js';
import { asyncHandler } from '../middlewares/error.middleware.js';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import auctionRoutes from './auction.routes.js';
import bidRoutes from './bid.routes.js';
import reportRoutes from './report.routes.js';
import reviewRoutes from './review.routes.js';
import notificationRoutes from './notification.routes.js';

const router = Router();

router.get(
  '/health',
  asyncHandler(async (_req, res) => {
    const dbOk = await testDatabaseConnection();
    res.status(200).json({
      status: 'ok',
      service: 'bidzone-api',
      database: dbOk ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  })
);

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/auctions', auctionRoutes);
router.use('/bids', bidRoutes);
router.use('/reports', reportRoutes);
router.use('/reviews', reviewRoutes);
router.use('/notifications', notificationRoutes);

export default router;

