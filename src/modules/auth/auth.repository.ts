// src/modules/auth/auth.repository.ts
import { db } from '../../config/db';
import { User } from '@prisma/client';
import { RegisterInput } from './auth.schema';

interface CreateUserData {
    full_name_three_parts: string;
    email: string;
    passwordHash: string;
    sex?: "MALE" | "FEMALE";
    clerical_rank?: "NONE" | "DEACON" | "PRIEST" | "LECTOR" | "OTHER";
    phone_number?: string;
    profile_image_url?: string;
    service_class_id?: string;
    academic_dept?: string;
    academic_year?: number;
    dorm_block?: string;
    dorm_room?: string;
}

export class AuthRepository {
    async createUser(data: CreateUserData): Promise<User> {
        return db.user.create({
            data: {
                full_name_three_parts: data.full_name_three_parts,
                email: data.email,
                password_hash: data.passwordHash,
                system_role: 'USER',
                sex: data.sex,
                clerical_rank: data.clerical_rank || 'NONE',
                phone_number: data.phone_number,
                profile_image_url: data.profile_image_url,
                service_class_id: data.service_class_id,
                academic_dept: data.academic_dept,
                academic_year: data.academic_year,
                dorm_block: data.dorm_block,
                dorm_room: data.dorm_room,
            },
        });
    }

    async findByEmail(email: string): Promise<any | null> {
        return db.user.findUnique({ 
            where: { email },
            include: { service_classes: true }
        });
    }

    async findById(id: string): Promise<any | null> {
        return db.user.findUnique({ 
            where: { id },
            include: { service_classes: true }
        });
    }

    async updateProfile(id: string, data: any) {
        return db.user.update({
            where: { id },
            data: {
                phone_number: data.phone_number,
                academic_dept: data.academic_dept,
                academic_year: data.academic_year,
                dorm_block: data.dorm_block,
                dorm_room: data.dorm_room,
                sex: data.sex,
                clerical_rank: data.clerical_rank,
                bio: data.bio,
                profile_image_url: data.profile_image_url,
            },
            include: { service_classes: true }
        });
    }
}

export const authRepository = new AuthRepository();