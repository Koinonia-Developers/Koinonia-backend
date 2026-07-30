import { z } from 'zod';

// ─── Enums ──────────────────────────────────────────────────────────
export const SubmissionStatusEnum = z.enum([
    'DRAFT',
    'SUBMITTED',
    'UNDER_REVIEW',
    'APPROVED',
    'REJECTED',
    'IMPLEMENTATION_IN_PROGRESS',
    'PUBLISHED'
]);

export const ReviewStatusEnum = z.enum([
    'UNDER_REVIEW',
    'APPROVED',
    'REJECTED'
]);

export const PublishStatusEnum = z.enum([
    'IMPLEMENTATION_IN_PROGRESS',
    'PUBLISHED'
]);

// ─── Request Schemas ──────────────────────────────────────────────

// POST /submissions
export const createSubmissionSchema = z.object({
    body: z.object({
        batch_id: z.string().uuid({ message: 'Invalid batch ID format' }),
        title: z.string().min(1).max(200, { message: 'Title must be between 1 and 200 characters' }),
        content_package: z.string().min(1, { message: 'Content package is required' }),
        submit_immediately: z.boolean().default(false),
    }),
});

// PUT /submissions/:id
export const updateSubmissionSchema = z.object({
    params: z.object({
        id: z.string().uuid({ message: 'Invalid submission ID format' }),
    }),
    body: z.object({
        title: z.string().min(1).max(200).optional(),
        content_package: z.string().min(1).optional(),
    }).refine(data => data.title !== undefined || data.content_package !== undefined, {
        message: 'At least one field (title or content_package) must be provided',
    }),
});

// GET /submissions (Query params)
export const listSubmissionsQuerySchema = z.object({
    query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        batch_id: z.string().uuid().optional(),
        status: SubmissionStatusEnum.optional(),
        teacher_id: z.string().uuid().optional(),
    }),
});

// GET /submissions/:id
export const submissionIdParamSchema = z.object({
    params: z.object({
        id: z.string().uuid({ message: 'Invalid submission ID format' }),
    }),
});

// PATCH /submissions/:id/submit
export const submitSubmissionSchema = z.object({
    params: z.object({
        id: z.string().uuid({ message: 'Invalid submission ID format' }),
    }),
});

// PATCH /submissions/:id/review
export const reviewSubmissionSchema = z.object({
    params: z.object({
        id: z.string().uuid({ message: 'Invalid submission ID format' }),
    }),
    body: z.object({
        status: ReviewStatusEnum,
        review_feedback: z.string().max(500).optional(),
    }),
});

// PATCH /submissions/:id/publish
export const publishSubmissionSchema = z.object({
    params: z.object({
        id: z.string().uuid({ message: 'Invalid submission ID format' }),
    }),
    body: z.object({
        status: PublishStatusEnum,
        implemented_page_url: z.string().url().optional(),
    }),
});

// DELETE /submissions/:id
export const deleteSubmissionSchema = z.object({
    params: z.object({
        id: z.string().uuid({ message: 'Invalid submission ID format' }),
    }),
});

// ─── Type Exports ──────────────────────────────────────────────────
export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>['body'];
export type UpdateSubmissionInput = z.infer<typeof updateSubmissionSchema>['body'];
export type ListSubmissionsQuery = z.infer<typeof listSubmissionsQuerySchema>['query'];
export type ReviewSubmissionInput = z.infer<typeof reviewSubmissionSchema>['body'];
export type PublishSubmissionInput = z.infer<typeof publishSubmissionSchema>['body'];
export type SubmissionIdParam = z.infer<typeof submissionIdParamSchema>['params'];