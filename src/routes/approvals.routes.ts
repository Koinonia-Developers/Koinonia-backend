// src/routes/approvals.routes.ts
import { Router } from 'express';
import { approvalController } from '../modules/approvals/approval.controller';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/auth';

const router = Router();

// All approval routes require authentication
router.use(requireAuth);

// Only SECRETARIAT_CHAIRMAN can access approval endpoints
const secretariatGuard = requireRole(['SECRETARIAT_CHAIRMAN']);

// Get all pending approvals
router.get('/pending', secretariatGuard, (req, res) => approvalController.getPendingApprovals(req, res));

// Approve a request
router.post('/:id/approve', secretariatGuard, (req, res) => approvalController.approveRequest(req, res));

// Reject a request
router.post('/:id/reject', secretariatGuard, (req, res) => approvalController.rejectRequest(req, res));

// Get approval history for a sub-class
router.get('/history/:subClassId', (req, res) => approvalController.getApprovalHistory(req, res));

export default router;
