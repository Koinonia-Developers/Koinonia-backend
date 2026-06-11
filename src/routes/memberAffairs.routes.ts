// src/routes/memberAffairs.routes.ts
import { Router } from 'express';
import { MemberAffairsController } from '../modules/member-affairs/member-affairs.controller';
import { requireAuth } from '../middleware/auth';
import { requireMemberAffairsAccess } from '../middleware/memberAffairsGuard';

const router = Router();
const controller = new MemberAffairsController();

// All routes require authentication and Member Affairs permissions
router.use(requireAuth);
router.use(requireMemberAffairsAccess);

// Pending approvals
router.get('/pending', controller.getPending);
router.post('/approve/:userId', controller.approve);
router.post('/reject/:userId', controller.reject);

// Member census
router.get('/members', controller.listMembers);
router.get('/members/:id', controller.getMember);
router.patch('/members/:id', controller.updateMember);

// Spiritual assignments
router.get('/unassigned-spiritual', controller.getUnassignedSpiritual);
router.get('/spiritual-candidates', controller.getSpiritualCandidates);
router.post('/assign-spiritual/:memberId', controller.assignSpiritual);

// Batch assignment
router.post('/batch-assign', controller.batchAssign);

// Sub‑classes
router.get('/sub-classes/:serviceClassId', controller.listSubClasses);
router.post('/sub-classes/:serviceClassId', controller.createSubClass);
router.post('/sub-classes/:subClassId/members', controller.addMemberToSubClass);
router.delete('/sub-classes/:subClassId/members/:userId', controller.removeMemberFromSubClass);

// Documents
router.get('/documents/:serviceClassId/:type', controller.listDocuments);
router.post('/documents/:serviceClassId', controller.uploadDocument);
router.delete('/documents/:id', controller.deleteDocument);

export default router;