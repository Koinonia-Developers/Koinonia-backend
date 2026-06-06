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

// POST /announcements/:id/reactions
router.post(
    '/:id/reactions',
    requireAuth,
    requireActiveStatus,
    announcementsController.reactToAnnouncement
);

// POST /announcements/:id/comments
router.post(
    '/:id/comments',
    requireAuth,
    requireActiveStatus,
    announcementsController.commentOnAnnouncement
);

// PATCH /announcements/:id — SECRETARIAT_CHAIRMAN only
router.patch(
    '/:id',
    requireAuth,
    requireActiveStatus,
    requireRole(['SECRETARIAT_CHAIRMAN', 'SUPER_ADMIN']),
    announcementsController.updateAnnouncement
);

// DELETE /announcements/:id — SECRETARIAT_CHAIRMAN only
router.delete(
    '/:id',
    requireAuth,
    requireActiveStatus,
    requireRole(['SECRETARIAT_CHAIRMAN', 'SUPER_ADMIN']),
    announcementsController.deleteAnnouncement
);

export default router;
