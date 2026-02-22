import { z } from 'zod';

export const userIdParamSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid user ID'),
    }),
});

export const promoteRoleSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
        role: z.enum(['MEMBER', 'CLASS_LEADER', 'SUPER_ADMIN']),
    }),
});

export const promoteLeaderSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
        classID: z.string().uuid('Invalid class ID'),
    }),
});

export const changeClassSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
        serviceClassID: z.string().uuid('Invalid class ID'),
    }),
});

export const suspendSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
        reason: z.string().min(5, 'Reason must be at least 5 characters'),
    }),
});

export type PromoteRoleInput = z.infer<typeof promoteRoleSchema>['body'];
export type PromoteLeaderInput = z.infer<typeof promoteLeaderSchema>['body'];
export type ChangeClassInput = z.infer<typeof changeClassSchema>['body'];
export type SuspendInput = z.infer<typeof suspendSchema>['body'];
