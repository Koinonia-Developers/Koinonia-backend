import { Router } from 'express';
import { libraryController } from './library.controller';
import { requireAuth, requireActiveStatus } from '../../middleware/auth';

const router = Router();
const auth = [requireAuth, requireActiveStatus];

router.get('/', ...auth, libraryController.listLibrary);
router.post('/:id/like', ...auth, libraryController.likeItem);

export default router;
