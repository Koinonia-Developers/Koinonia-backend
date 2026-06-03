import { z } from 'zod';

export const registerSchema = z.object({
    body: z.object({
        full_name_three_parts: z.string().min(2, "Full Name is required"),
        email: z.string().email("Invalid email address"),
        password: z.string().min(6, "Password must be at least 6 characters"),
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
