import { z } from 'zod';

export const createPostSchema = z.object({
    body: z.object({
        title: z.string().min(1).max(255),
        content: z.string().min(1),
        imageURL: z.string().optional(),
        targetType: z.enum(['GLOBAL', 'CLASS']),
        serviceClassID: z.string().uuid().optional(),
    }),
});

export const reactToPostSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
        reactionType: z.enum(['LIKE', 'DISLIKE']),
    }),
});

export const createCommentSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
        content: z.string().min(1).max(2000).transform(s => s.replace(/</g, '&lt;').replace(/>/g, '&gt;')),
        parentCommentID: z.string().uuid().optional(),
    }),
});

export const postIdParamSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
});

export const commentIdParamSchema = z.object({
    params: z.object({ id: z.string().uuid(), commentId: z.string().uuid() }),
});

export type CreatePostInput = z.infer<typeof createPostSchema>['body'];
export type ReactInput = z.infer<typeof reactToPostSchema>['body'];
export type CreateCommentInput = z.infer<typeof createCommentSchema>['body'];
