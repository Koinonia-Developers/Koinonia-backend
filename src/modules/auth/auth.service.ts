// src/modules/auth/auth.service.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { env } from '../../config/env';
import { authRepository } from './auth.repository';
import { RegisterInput, LoginInput } from './auth.schema';
import { ConflictError, UnauthorizedError } from '../../utils/errors';
import { notificationsRepository } from '../notifications/notifications.repository';

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

const generateToken = (user: {
    id: string;
    system_role: string;
    service_class_id?: string | null;
    service_class_name?: string | null;
}) => {
    return jwt.sign(
        {
            userID: user.id,
            role: user.system_role,
            serviceClassID: user.service_class_id ?? null,
            serviceClassName: user.service_class_name ?? null,
        },
        env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

export class AuthService {
    async register(data: RegisterInput) {
        const existingEmail = await authRepository.findByEmail(data.email);
        if (existingEmail) throw new ConflictError('Email already registered');

        const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

        const user = await authRepository.createUser({
            full_name_three_parts: data.full_name_three_parts,
            email: data.email,
            passwordHash,
            sex: data.sex,
            clerical_rank: data.clerical_rank || 'NONE',
            phone_number: data.phone_number,
            profile_image_url: data.profile_image_url,
            service_class_id: data.service_class_id,
            academic_dept: data.academic_dept,
            academic_year: data.academic_year,
            dorm_block: data.dorm_block,
            dorm_room: data.dorm_room,
        });

        // ─── NOTIFY MEMBER AFFAIRS MANAGERS ABOUT NEW PENDING USER ───
        try {
            // Find the Member Affairs service class
            const memberAffairsClass = await prisma.serviceClass.findFirst({
                where: { class_name_amharic: 'የአባልነት ጉዳይ ክፍል' }
            });
            if (memberAffairsClass) {
                const managers = await prisma.user.findMany({
                    where: {
                        system_role: 'SERVICE_MANAGER',
                        service_class_id: memberAffairsClass.id,
                    },
                    select: { id: true }
                });
                if (managers.length > 0) {
                    await notificationsRepository.spawnBulkNotifications(managers.map((m: any) => m.id), {
                        actorID: user.id,
                        type: 'MEMBERSHIP',
                        content: `New member registration: ${user.full_name_three_parts} needs approval.`,
                        linkTarget: '/dashboard/member-affairs?tab=pending',
                        notificationType: 'MEMBERSHIP',
                        relatedEntityId: user.id
                    });
                }
            }
        } catch (notifError) {
            console.error('Failed to notify Member Affairs managers:', notifError);
        }

        const userWithClass = await authRepository.findById(user.id);
        const serviceClassName = userWithClass?.service_classes?.class_name_amharic;

        const tokenPayload = {
            id: user.id,
            system_role: user.system_role,
            service_class_id: user.service_class_id,
            service_class_name: serviceClassName,
        };
        const token = generateToken(tokenPayload);
        const { password_hash: _, ...userWithoutPassword } = user as any;
        return { user: { ...userWithoutPassword, serviceClassName }, token };
    }

    async login(data: LoginInput) {
        const user = await authRepository.findByEmail(data.email);
        if (!user) throw new UnauthorizedError('Invalid email or password');

        const isPasswordValid = await bcrypt.compare(data.password, user.password_hash);
        if (!isPasswordValid) throw new UnauthorizedError('Invalid email or password');

        const serviceClassName = user.service_classes?.class_name_amharic;
        const tokenPayload = {
            id: user.id,
            system_role: user.system_role,
            service_class_id: user.service_class_id,
            service_class_name: serviceClassName,
        };
        const token = generateToken(tokenPayload);
        const { password_hash: _, ...userWithoutPassword } = user as any;
        return { user: { ...userWithoutPassword, serviceClassName }, token };
    }

    async getUserById(id: string) {
        const user = await authRepository.findById(id);
        if (!user) return null;
        const serviceClassName = user.service_classes?.class_name_amharic;
        const { password_hash: _, ...userWithoutPassword } = user as any;
        return { ...userWithoutPassword, serviceClassName };
    }

    async updateProfile(id: string, data: any) {
        const user = await authRepository.updateProfile(id, data);
        if (!user) return null;
        const serviceClassName = user.service_classes?.class_name_amharic;
        const { password_hash: _, ...userWithoutPassword } = user as any;
        return { ...userWithoutPassword, serviceClassName };
    }
}

export const authService = new AuthService();