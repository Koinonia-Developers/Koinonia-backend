//src/modules/notifications/notifications.routes.ts
import { Router } from 'express';
import { notificationsController } from './notifications.controller';
import { requireAuth, requireActiveStatus } from '../../middleware/auth';

const router = Router();
router.use(requireAuth, requireActiveStatus);

router.get('/', notificationsController.getNotifications);
router.get('/unread-count', notificationsController.getUnreadCount);
router.patch('/read-all', notificationsController.markAllAsRead);
router.patch('/:id/read', notificationsController.markAsRead);
router.delete('/:id', notificationsController.deleteNotification);

export default router;
