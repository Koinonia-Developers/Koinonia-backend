import { Router } from 'express';
import { notificationsController } from './notifications.controller';
import { requireAuth, requireActiveStatus } from '../../middleware/auth';

const router = Router();
router.use(requireAuth, requireActiveStatus);

router.get('/', notificationsController.getNotifications);
router.patch('/read-all', notificationsController.markAllAsRead);
router.patch('/:id/read', notificationsController.markAsRead);

export default router;
