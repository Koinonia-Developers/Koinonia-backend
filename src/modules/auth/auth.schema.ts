import { z } from 'zod';

export const registerSchema = z.object({
    body: z.object({
        fullName: z.string().min(2, "Full Name is required"),
        username: z.string()
            .min(4, "Username must be at least 4 characters")
            .regex(/^[a-z0-9]+$/, "Username must contain only lowercase letters and numbers"),
        sex: z.enum(["MALE", "FEMALE"]),
        department: z.string().min(2, "Department is required"),
        serviceClassID: z.string().uuid("Invalid Service Class ID format"),
        email: z.string().email("Invalid email address"),
        phoneNumber: z.string().min(9, "Phone number must be at least 9 characters").max(20, "Phone number is too long"),
        academicYear: z.enum([
            "YEAR_1", "YEAR_2", "YEAR_3", "YEAR_4", "YEAR_5",
            "YEAR_6", "YEAR_7", "YEAR_8", "POST_GRADUATE", "GRADUATED"
        ]),
        password: z.string().min(6, "Password must be at least 6 characters"),
        profileImage: z.string().min(1).optional().nullable(),
        bio: z.string().max(200, "Bio max 200 characters").optional().nullable(),
        birthDate: z.string().optional().nullable(),  // YYYY-MM-DD from date input
        birthPlace: z.string().optional().nullable(),
    })
});

export const loginSchema = z.object({
    body: z.object({
        username: z.string().min(3, "Username is required"),
        password: z.string().min(6, "Password is required"),
    })
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
