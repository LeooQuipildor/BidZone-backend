import { Router } from 'express';
import {
  listNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../controllers/notification.controller.js';
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js';
import { validateParamId } from '../middlewares/validate.middleware.js';

const router = Router();

router.use(verifyToken);

router.get('/', listNotifications);
router.post('/', requireRole('admin'), createNotification);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', validateParamId('id'), markAsRead);
router.put('/:id', validateParamId('id'), markAsRead);
router.delete('/:id', validateParamId('id'), deleteNotification);

export default router;

