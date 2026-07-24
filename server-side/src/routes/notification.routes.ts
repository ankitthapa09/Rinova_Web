import { Router } from 'express';
import { notificationController } from '@/controllers/notification.controller';
import { requireAuth } from '@/middlewares/auth.middleware';

const router = Router();

// Notifications are always personal — a live session is required for all of them.
router.use(requireAuth);

router.get('/', notificationController.list);
router.get('/unread-count', notificationController.unreadCount);
// Defined before '/:id/read' so the literal path can't be read as an id.
router.patch('/read-all', notificationController.markAllRead);
router.patch('/:id/read', notificationController.markRead);

export default router;
