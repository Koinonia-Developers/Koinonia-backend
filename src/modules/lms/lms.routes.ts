import { Router } from 'express';
import { lmsController } from './lms.controller';
import { requireAuth, requireActiveStatus } from '../../middleware/auth';

const router = Router();
const auth = [requireAuth, requireActiveStatus];

// GET /lms/batches - Get all batches with optional filters
router.get('/batches', ...auth, lmsController.getBatches);

// GET /lms/batches/:id - Get a specific batch
router.get('/batches/:id', ...auth, lmsController.getBatchById);

// GET /lms/batches/:id/enrollments - Get enrollments for a specific batch
router.get('/batches/:id/enrollments', ...auth, lmsController.getBatchEnrollments);

// GET /lms/enrollments/me - Get current user's enrollments
router.get('/enrollments/me', ...auth, lmsController.getUserEnrollments);

export default router;
