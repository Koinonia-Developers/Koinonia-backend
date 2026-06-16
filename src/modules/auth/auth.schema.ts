// src/modules/auth/auth.schema.ts
import { z } from 'zod';

export const registerSchema = z.object({
    body: z.object({
        full_name_three_parts: z.string().min(2, "Full Name is required"),
        email: z.string().email("Invalid email address"),
        password: z.string().min(6, "Password must be at least 6 characters"),
        sex: z.enum(["MALE", "FEMALE"]).optional(),
        clerical_rank: z.enum(["NONE", "DEACON", "PRIEST", "LECTOR", "OTHER"]).optional(),
        phone_number: z.string().optional(),
        profile_image_url: z.string().optional(),
        // Academic & Residence fields
        service_class_id: z.string().optional(),
        academic_dept: z.string().optional(),
        academic_year: z.number().int().optional(),
        dorm_block: z.string().optional(),
        dorm_room: z.string().optional(),
    })
});

export const loginSchema = z.object({
    body: z.object({
        email: z.string().email("Invalid email address"),
        password: z.string().min(6, "Password is required"),
    })
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];