import { Router } from 'express';
import { adminController } from './admin.controller';
import { requireAuth, requireActiveStatus, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { userIdParamSchema, suspendSchema, promoteRoleSchema, promoteLeaderSchema, changeClassSchema } from './admin.schema';

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

export default router;
