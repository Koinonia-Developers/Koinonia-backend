import { Router } from 'express';
import { courseSubmissionsController } from './course-submissions.controller';
import { 
    createSubmissionSchema,
    updateSubmissionSchema,
    listSubmissionsQuerySchema,
    submissionIdParamSchema,
    submitSubmissionSchema,
    reviewSubmissionSchema,
    publishSubmissionSchema,
    deleteSubmissionSchema
} from './course-submissions.schema';
import { requireAuth, requireActiveStatus, requireRole } from '../../middleware/auth';
import { requireEducationManager } from '../../middleware/educationGuard';
import { validate } from '../../middleware/validate';

const router = Router();
const auth = [requireAuth, requireActiveStatus];

// ─── Routes ─────────────────────────────────────────────────────────

// POST /submissions – Create a new submission
router.post(
    '/',
    ...auth,
    requireRole(['TEACHER']),
    validate(createSubmissionSchema),
    courseSubmissionsController.create
);

// GET /submissions – List all submissions (with filters)
router.get(
    '/',
    ...auth,
    validate(listSubmissionsQuerySchema),
    courseSubmissionsController.list
);

// GET /submissions/:id – Get single submission details
router.get(
    '/:id',
    ...auth,
    validate(submissionIdParamSchema),
    courseSubmissionsController.getById
);

// PUT /submissions/:id – Update submission
router.put(
    '/:id',
    ...auth,
    requireRole(['TEACHER']),
    validate(updateSubmissionSchema),
    courseSubmissionsController.update
);

// PATCH /submissions/:id/submit – Submit for review
router.patch(
    '/:id/submit',
    ...auth,
    requireRole(['TEACHER']),
    validate(submitSubmissionSchema),
    courseSubmissionsController.submit
);

// PATCH /submissions/:id/review – Review submission (Manager only)
router.patch(
    '/:id/review',
    ...auth,
    requireEducationManager,
    validate(reviewSubmissionSchema),
    courseSubmissionsController.review
);

// PATCH /submissions/:id/publish – Publish content (Manager only)
router.patch(
    '/:id/publish',
    ...auth,
    requireEducationManager,
    validate(publishSubmissionSchema),
    courseSubmissionsController.publish
);

// DELETE /submissions/:id – Delete submission
router.delete(
    '/:id',
    ...auth,
    requireRole(['TEACHER']),
    validate(deleteSubmissionSchema),
    courseSubmissionsController.delete
);

export default router;