import { z } from 'zod';

export const userIdParamSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid user ID'),
    }),
});

export const promoteRoleSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
        role: z.enum(['MEMBER', 'CLASS_LEADER', 'TEACHER', 'SERVICE_MANAGER', 'SUPER_ADMIN']),
        serviceClassId: z.string().uuid('Invalid service class ID').optional()
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
        reason: z.string().min(5, 'Reason must be at least 5 characters long').max(200),
    }),
});

export const createSubClassSchema = z.object({
    body: z.object({
        name: z.string().min(2).max(100)
    })
});

export const updateSubClassRolesSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
        sub_chair_id: z.string().uuid().nullable().optional(),
        sub_vice_id: z.string().uuid().nullable().optional(),
        sub_secretary_id: z.string().uuid().nullable().optional(),
    })
});

export type PromoteRoleInput = z.infer<typeof promoteRoleSchema>['body'];
export type PromoteLeaderInput = z.infer<typeof promoteLeaderSchema>['body'];
export type ChangeClassInput = z.infer<typeof changeClassSchema>['body'];
export type SuspendInput = z.infer<typeof suspendSchema>['body'];
export type CreateSubClassInput = z.infer<typeof createSubClassSchema>['body'];
export type UpdateSubClassRolesInput = z.infer<typeof updateSubClassRolesSchema>['body'];

// Chairman role management schemas
export const assignRoleSchema = z.object({
    body: z.object({
        targetUserId: z.string().uuid('Invalid user ID'),
        role: z.enum(['SECRETARIAT_VICE', 'SECRETARIAT_SECRETARY', 'SERVICE_MANAGER']),
        serviceClassId: z.string().uuid('Invalid service class ID').optional()
    })
});

export const transferChairmanSchema = z.object({
    body: z.object({
        targetUserId: z.string().uuid('Invalid user ID')
    })
});

export type AssignRoleInput = z.infer<typeof assignRoleSchema>['body'];
export type TransferChairmanInput = z.infer<typeof transferChairmanSchema>['body'];
