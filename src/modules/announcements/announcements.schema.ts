import { z } from 'zod';

export const createAnnouncementSchema = z.object({
    body: z.object({
        title: z.string().min(3, "Title must be at least 3 characters").max(255),
        content: z.string().refine((val) => {
            // Strip HTML tags before checking length
            const textContent = val.replace(/<[^>]*>/g, '').trim();
            return textContent.length >= 10;
        }, "Content must be at least 10 characters"),
        targetType: z.string().refine((val) => ['ALL', 'CLASS', 'LEADERS'].includes(val), {
            message: "targetType must be one of: ALL, CLASS, LEADERS"
        }),
        targetClassID: z.string().uuid("Invalid target Class ID").optional().nullable(),
        isPinned: z.boolean().optional().default(false),
        scheduledAt: z.string().datetime().optional().nullable(),
    })
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>['body'];
