import { Router } from 'express';
import {
  getVapidPublicKey,
  archiveNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToPush,
} from '../controllers/notificationController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/vapid-public-key', getVapidPublicKey);
router.post('/subscriptions', authMiddleware, subscribeToPush);
router.get('/', authMiddleware, listNotifications);
router.put('/read-all', authMiddleware, markAllNotificationsRead);
router.put('/read', authMiddleware, markAllNotificationsRead);
router.put('/:id/read', authMiddleware, markNotificationRead);
router.delete('/:id', authMiddleware, archiveNotification);

export default router;
