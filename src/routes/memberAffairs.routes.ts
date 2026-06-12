// src/routes/memberAffairs.routes.ts
import { Router } from 'express';
import { MemberAffairsController } from '../modules/member-affairs/member-affairs.controller';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/auth';
import { requireServiceClassAccess, requireSubClassApproval } from '../middleware/serviceClassGuard';
import { requireMemberAffairsAccess } from '../middleware/memberAffairsGuard';
import { 
  requireMemberAccess, 
  validateMemberAccess, 
  validateMemberWrite,
  validateLeaderAssignment 
} from '../middleware/memberAccessGuard';

const router = Router();
const controller = new MemberAffairsController();

// All routes require authentication
router.use(requireAuth);

// ============ MEMBER MANAGEMENT ENDPOINTS (with access control by service class) ============
// These endpoints now use requireMemberAccess which checks:
// - SECRETARIAT: full access (chairman read-only)
// - MEMBER_AFFAIRS: can view all + modify members (but leadership restricted)
// - SERVICE_MANAGER: can view/modify only their own service class members
// - CHAIRMAN: read-only access to all members

router.get('/members', requireMemberAccess, controller.listMembers);
router.get('/members/:id', requireMemberAccess, validateMemberAccess, controller.getMember);
router.patch('/members/:id', requireMemberAccess, validateMemberAccess, validateMemberWrite, controller.updateMember);

// ============ MEMBER AFFAIRS OPERATIONS (approval workflow - Member Affairs manager only) ============
// These endpoints require MEMBER_AFFAIRS_ACCESS specifically for approval operations
router.get('/pending', requireMemberAffairsAccess, controller.getPending);
router.post('/approve/:userId', requireMemberAffairsAccess, controller.approve);
router.post('/reject/:userId', requireMemberAffairsAccess, controller.reject);
router.get('/unassigned-spiritual', requireMemberAffairsAccess, controller.getUnassignedSpiritual);
router.get('/spiritual-candidates', requireMemberAffairsAccess, controller.getSpiritualCandidates);
router.post('/assign-spiritual/:memberId', requireMemberAffairsAccess, controller.assignSpiritual);
router.post('/batch-assign', requireMemberAffairsAccess, controller.batchAssign);
router.get('/documents/:serviceClassId/:type', requireMemberAffairsAccess, controller.listDocuments);
router.post('/documents/:serviceClassId', requireMemberAffairsAccess, controller.uploadDocument);
router.delete('/documents/:id', requireMemberAffairsAccess, controller.deleteDocument);

// ============ SUB-CLASS OPERATIONS (with service class access control) ============
// Read: allowed for all service managers of their class
router.get('/sub-classes/:serviceClassId', requireServiceClassAccess, controller.listSubClasses);

// Write: requires approval unless SECRETARIAT, plus leader validation
router.post('/sub-classes/:serviceClassId', requireServiceClassAccess, requireSubClassApproval, controller.createSubClass);
router.post('/sub-classes/:subClassId/members', requireServiceClassAccess, validateLeaderAssignment, controller.addMemberToSubClass);
router.delete('/sub-classes/:subClassId/members/:userId', requireServiceClassAccess, controller.removeMemberFromSubClass);

export default router;