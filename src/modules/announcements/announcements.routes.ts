// src/modules/announcements/announcements.routes.ts
import { Router } from 'express';
import { announcementsController } from './announcements.controller';
import { requireAuth, requireActiveStatus } from '../../middleware/auth';
import { requireSecretariat } from '../../middleware/requireSecretariat';
import { validate } from '../../middleware/validate';
import { createAnnouncementSchema, resubmitAnnouncementSchema, rejectAnnouncementSchema } from './announcements.schema';

const router = Router();

// Public (authenticated) routes
router.get('/', requireAuth, requireActiveStatus, announcementsController.getAnnouncements);
router.post('/:id/reactions', requireAuth, requireActiveStatus, announcementsController.reactToAnnouncement);
router.post('/:id/comments', requireAuth, requireActiveStatus, announcementsController.commentOnAnnouncement);

// Comment edit and delete (creator only)
router.patch('/:id/comments/:commentId', requireAuth, requireActiveStatus, announcementsController.editComment);
router.delete('/:id/comments/:commentId', requireAuth, requireActiveStatus, announcementsController.deleteComment);

// My announcements (for current user)
router.get('/my', requireAuth, requireActiveStatus, announcementsController.getUserAnnouncements);

// Resubmit a rejected announcement (creator only)
router.patch(
    '/:id/resubmit',
    requireAuth,
    requireActiveStatus,
    validate(resubmitAnnouncementSchema),
    announcementsController.resubmitAnnouncement
);

// Secretariat-only routes
router.get('/pending', requireAuth, requireActiveStatus, requireSecretariat, announcementsController.getPendingAnnouncements);
router.patch('/:id/approve', requireAuth, requireActiveStatus, requireSecretariat, announcementsController.approveAnnouncement);
router.patch(
    '/:id/reject',
    requireAuth,
    requireActiveStatus,
    requireSecretariat,
    validate(rejectAnnouncementSchema),
    announcementsController.rejectAnnouncement
);

// Create announcement – allowed for secretariat AND service managers
router.post(
    '/',
    requireAuth,
    requireActiveStatus,
    validate(createAnnouncementSchema),
    announcementsController.createAnnouncement
);

// Update and delete – only chairman
router.patch('/:id', requireAuth, requireActiveStatus, announcementsController.updateAnnouncement);
router.delete('/:id', requireAuth, requireActiveStatus, announcementsController.deleteAnnouncement);

export default router;