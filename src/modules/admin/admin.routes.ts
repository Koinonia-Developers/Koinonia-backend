import { Router } from 'express';
import { adminController } from './admin.controller';
import { requireAuth, requireActiveStatus, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { userIdParamSchema, suspendSchema, promoteRoleSchema, promoteLeaderSchema, changeClassSchema, assignRoleSchema, transferChairmanSchema } from './admin.schema';

const router = Router();
const superAdmin = [requireAuth, requireActiveStatus, requireRole(['SUPER_ADMIN'])];
const adminAccess = [requireAuth, requireActiveStatus, requireRole(['SUPER_ADMIN', 'SECRETARIAT_CHAIRMAN', 'SECRETARIAT_VICE', 'SECRETARIAT_SECRETARY', 'SERVICE_MANAGER'])];

// Dashboard & Users
router.get('/dashboard-stats', ...adminAccess, adminController.getDashboardStats);
router.get('/users', ...adminAccess, adminController.getAllUsers);

// User Status Management
router.patch('/users/:id/approve', ...superAdmin, validate(userIdParamSchema), adminController.approveUser);
router.patch('/users/:id/reject', ...superAdmin, validate(userIdParamSchema), adminController.rejectUser);
router.patch('/users/:id/suspend', ...adminAccess, validate(suspendSchema), adminController.suspendUser);
router.patch('/users/:id/promote-role', ...adminAccess, validate(promoteRoleSchema), adminController.promoteRole);
router.patch('/users/:id/change-class', ...superAdmin, validate(changeClassSchema), adminController.changeUserClass);

// Leader Management
router.patch('/users/:id/promote-leader', ...superAdmin, validate(promoteLeaderSchema), adminController.promoteLeader);
router.patch('/users/:id/demote-leader', ...superAdmin, validate(userIdParamSchema), adminController.demoteLeader);

// Office (ፅሕፈት ቤት)
router.get('/office', ...superAdmin, adminController.getOffice);
router.get('/office/pending', ...superAdmin, adminController.getPendingOffice);
router.patch('/office/:id/approve', ...superAdmin, validate(userIdParamSchema), adminController.approveOffice);
router.patch('/office/:id/disapprove', ...superAdmin, validate(userIdParamSchema), adminController.disapproveOffice);

// Sub-Class Management
import { createSubClassSchema, updateSubClassRolesSchema } from './admin.schema';
router.get('/subclasses', ...adminAccess, adminController.getSubClasses);
router.post('/subclasses', ...adminAccess, validate(createSubClassSchema), adminController.createSubClass);
router.patch('/subclasses/:id/roles', ...adminAccess, validate(updateSubClassRolesSchema), adminController.updateSubClassRoles);

// Chairman Role Management (SECRETARIAT_CHAIRMAN only)
const chairmanOnly = [requireAuth, requireActiveStatus, requireRole(['SECRETARIAT_CHAIRMAN', 'SUPER_ADMIN'])];

// Sub-Class Approvals (Chairman only)
router.get('/subclasses/pending-approvals', ...chairmanOnly, adminController.getPendingSubClassApprovals);
router.patch('/subclasses/:id/approve', ...chairmanOnly, adminController.approveSubClass);
router.patch('/subclasses/:id/reject', ...chairmanOnly, adminController.rejectSubClass);

router.post('/assign-role', ...chairmanOnly, validate(assignRoleSchema), adminController.assignRole);
router.delete('/revoke-role/:id', ...chairmanOnly, adminController.revokeRole);
router.post('/transfer-chairman', ...chairmanOnly, validate(transferChairmanSchema), adminController.transferChairman);

// Audit Logs and Member Census (Chairman only)
router.get('/audit-logs', ...chairmanOnly, adminController.getAuditLogs);
router.get('/member-census', ...chairmanOnly, adminController.getMemberCensus);

export default router;
