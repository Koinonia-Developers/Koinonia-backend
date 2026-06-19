// src/routes/memberAffairs.routes.ts
import { Router } from 'express';
import { MemberAffairsController } from '../modules/member-affairs/member-affairs.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { requireServiceClassAccess, requireSubClassApproval } from '../middleware/serviceClassGuard';
import { requireMemberAffairsAccess } from '../middleware/memberAffairsGuard';
import { requireSecretariat } from '../middleware/requireSecretariat';
import { 
  requireMemberAccess, 
  validateMemberAccess, 
  validateMemberWrite,
  validateLeaderAssignment 
} from '../middleware/memberAccessGuard';

const router = Router();
const controller = new MemberAffairsController();

router.use(requireAuth);

// ============ SECRETARIAT DOCUMENT ENDPOINTS (no service class) ============
router.post('/documents/secretariat', requireAuth, requireSecretariat, controller.uploadSecretariatDocument);
router.get('/documents/secretariat/:type', requireAuth, requireSecretariat, controller.listSecretariatDocuments);

// ============ MEMBER MANAGEMENT ============
router.get('/members', requireMemberAccess, controller.listMembers);
router.get('/members/:id', requireMemberAccess, validateMemberAccess, controller.getMember);
router.patch('/members/:id', requireMemberAccess, validateMemberAccess, validateMemberWrite, controller.updateMember);

// ============ MEMBER AFFAIRS OPERATIONS ============
router.get('/pending', requireMemberAffairsAccess, controller.getPending);
router.post('/approve/:userId', requireMemberAffairsAccess, controller.approve);
router.post('/reject/:userId', requireMemberAffairsAccess, controller.reject);
router.get('/unassigned-spiritual', requireMemberAffairsAccess, controller.getUnassignedSpiritual);
router.get('/spiritual-candidates', requireMemberAffairsAccess, controller.getSpiritualCandidates);
router.post('/assign-spiritual/:memberId', requireMemberAffairsAccess, controller.assignSpiritual);
router.post('/batch-assign', requireMemberAffairsAccess, controller.batchAssign);

// ============ SUB-CLASS OPERATIONS ============
router.get('/sub-classes/:serviceClassId', requireServiceClassAccess, controller.listSubClasses);
router.post('/sub-classes/:serviceClassId', requireServiceClassAccess, requireSubClassApproval, controller.createSubClass);
router.post('/sub-classes/:subClassId/members', requireServiceClassAccess, validateLeaderAssignment, controller.addMemberToSubClass);
router.delete('/sub-classes/:subClassId/members/:userId', requireServiceClassAccess, controller.removeMemberFromSubClass);
router.delete('/sub-classes/:subClassId', requireAuth, controller.deleteSubClass);

// ============ DOCUMENTS ============
// ✅ GET: Any authenticated user can list documents (service handles class filtering)
// ✅ POST: Only a manager of the class can upload (enforced by requireServiceClassAccess)
router.get('/documents/:serviceClassId/:type', requireAuth, controller.listDocuments);
router.post('/documents/:serviceClassId', requireServiceClassAccess, controller.uploadDocument);
router.patch('/documents/:id', requireAuth, controller.updateDocument);
router.delete('/documents/:id', requireAuth, controller.deleteDocument);

// ============ DOCUMENT APPROVAL, COMMENTS, REACTIONS ============
router.get('/documents/:id', requireAuth, controller.getDocument);
router.post('/documents/:id/approve', requireAuth, requireRole(['SECRETARIAT_CHAIRMAN']), controller.approveDocument);
router.post('/documents/:id/reject', requireAuth, requireRole(['SECRETARIAT_CHAIRMAN']), controller.rejectDocument);
router.post('/documents/:id/comments', requireAuth, controller.addComment);
router.delete('/documents/comments/:commentId', requireAuth, controller.deleteComment);
router.post('/documents/:id/reactions', requireAuth, controller.addReaction);
router.delete('/documents/:id/reactions', requireAuth, controller.removeReaction);

// ============ NOTIFICATIONS ============
router.post('/notifications/document-pending', requireAuth, controller.notifyChairmanOfPendingDocument);
router.post('/notifications/document-approved', requireAuth, controller.notifyDocumentApproved);
router.post('/notifications/document-rejected', requireAuth, controller.notifyDocumentRejected);
router.post('/notifications/comment-added', requireAuth, controller.notifyCommentAdded);
router.post('/notifications/reaction-added', requireAuth, controller.notifyReactionAdded);

export default router;