import { Router } from 'express';
import { announcementsController } from './announcements.controller';
import { requireAuth, requireRole, requireActiveStatus } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createAnnouncementSchema } from './announcements.schema';

const router = Router();

// GET /announcements — requires auth (any active user can read)
router.get('/', requireAuth, requireActiveStatus, announcementsController.getAnnouncements);

// POST /announcements — SUPER_ADMIN only
router.post(
    '/',
    requireAuth,
    requireActiveStatus,
    requireRole(['SUPER_ADMIN', 'CLASS_LEADER']),
    validate(createAnnouncementSchema),
    announcementsController.createAnnouncement
);

export default router;
