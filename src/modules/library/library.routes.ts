import { Router } from 'express';
import { libraryController } from './library.controller';
import { requireAuth, requireActiveStatus, requireRole } from '../../middleware/auth';

const router = Router();
const auth = [requireAuth, requireActiveStatus];
const chairmanOnly = [requireAuth, requireActiveStatus, requireRole(['SECRETARIAT_CHAIRMAN', 'SUPER_ADMIN'])];

router.get('/', ...auth, libraryController.listLibrary);
router.post('/:id/like', ...auth, libraryController.likeItem);

// CRUD operations (Chairman only)
router.post('/', ...chairmanOnly, libraryController.createItem);
router.patch('/:id', ...chairmanOnly, libraryController.updateItem);
router.delete('/:id', ...chairmanOnly, libraryController.deleteItem);

export default router;
