// src/modules/announcements/announcements.schema.ts
import { z } from 'zod';

export const createAnnouncementSchema = z.object({
    body: z.object({
        title: z.string().min(3, "Title must be at least 3 characters").max(255),
        content: z.string().refine((val) => {
            const textContent = val.replace(/<[^>]*>/g, '').trim();
            return textContent.length >= 10;
        }, "Content must be at least 10 characters"),
        targetType: z.string().refine((val) => ['ALL', 'CLASS', 'LEADERS'].includes(val), {
            message: "targetType must be one of: ALL, CLASS, LEADERS"
        }),
        targetClassID: z.string().uuid("Invalid target Class ID").optional().nullable(),
        isPinned: z.boolean().optional().default(false),
        scheduledAt: z.string().datetime().optional().nullable(),
        imageUrl: z.array(z.string()).optional().nullable(),
        videoUrl: z.array(z.string()).optional().nullable(),
        pdfUrl: z.array(z.string()).optional().nullable(),
    })
});

export const resubmitAnnouncementSchema = z.object({
    body: z.object({
        title: z.string().min(3).max(255),
        content: z.string().min(10),
        imageUrl: z.array(z.string()).optional().nullable(),
        videoUrl: z.array(z.string()).optional().nullable(),
        pdfUrl: z.array(z.string()).optional().nullable(),
    })
});

export const rejectAnnouncementSchema = z.object({
    body: z.object({
        reason: z.string().min(1, "Rejection reason is required")
    })
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>['body'];
export type ResubmitAnnouncementInput = z.infer<typeof resubmitAnnouncementSchema>['body'];
export type RejectAnnouncementInput = z.infer<typeof rejectAnnouncementSchema>['body'];