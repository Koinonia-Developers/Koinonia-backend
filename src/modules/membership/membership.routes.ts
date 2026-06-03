import { Router } from 'express';
import { membershipController } from './membership.controller';
import { requireAuth, requireActiveStatus, requireRole } from '../../middleware/auth';

const router = Router();

// ─── Member routes ────────────────────────────────────────────────────────────
// Any authenticated user (even pending) can apply for membership
router.post('/apply', requireAuth, membershipController.apply);

// ─── Secretariat / Admin review routes ───────────────────────────────────────
const secretariat = [
    requireAuth,
    requireActiveStatus,
    requireRole(['SUPER_ADMIN', 'SECRETARIAT_SECRETARY', 'SECRETARIAT_VICE', 'SECRETARIAT_CHAIRMAN', 'SERVICE_MANAGER'])
];

router.get('/pending', ...secretariat, membershipController.getPendingApplications);
router.get('/pending-class', ...secretariat, membershipController.getPendingClassAssignments);

router.patch('/:id/approve', ...secretariat, membershipController.approveMembership);
router.patch('/:id/reject', ...secretariat, membershipController.rejectMembership);
router.patch('/:id/confirm-class', ...secretariat, membershipController.confirmClassAssignment);
router.patch('/:id/reject-class', ...secretariat, membershipController.rejectClassAssignment);

export default router;
