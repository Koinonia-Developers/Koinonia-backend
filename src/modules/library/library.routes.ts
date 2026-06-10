import { Router } from 'express';
import { libraryController } from './library.controller';
import { requireAuth, requireActiveStatus, requireRole } from '../../middleware/auth';

const router = Router();
const auth = [requireAuth, requireActiveStatus];
const chairmanOnly = [requireAuth, requireActiveStatus, requireRole(['SECRETARIAT_CHAIRMAN', 'SUPER_ADMIN', 'SERVICE_MANAGER'])];

// Public endpoints (authenticated users only)
router.get('/', ...auth, libraryController.listLibrary);
router.post('/:id/like', ...auth, libraryController.likeItem);
router.post('/:id/download', ...auth, libraryController.downloadItem);

// CRUD operations (Chairman/Admin only)
router.post('/', ...chairmanOnly, libraryController.createItem);
router.patch('/:id', ...chairmanOnly, libraryController.updateItem);
router.delete('/:id', ...chairmanOnly, libraryController.deleteItem);

export default router;
