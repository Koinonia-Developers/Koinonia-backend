// src/modules/auth/auth.service.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { authRepository } from './auth.repository';
import { RegisterInput, LoginInput } from './auth.schema';
import { ConflictError, UnauthorizedError, ForbiddenError } from '../../utils/errors';

const SALT_ROUNDS = 12;

// ✅ generateToken includes serviceClassName
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
        });

        // Fetch again to get service class relation (since createUser doesn't include it)
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
        console.log('Login attempt with email:', data.email);
        // ✅ findByEmail already includes service_classes
        const user = await authRepository.findByEmail(data.email);
        console.log('User found:', !!user, user?.email);
        if (!user) throw new UnauthorizedError('Invalid email or password');

        const isPasswordValid = await bcrypt.compare(data.password, user.password_hash);
        console.log('Password valid:', isPasswordValid);
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
        // ✅ findById already includes service_classes
        const user = await authRepository.findById(id);
        if (!user) return null;
        const serviceClassName = user.service_classes?.class_name_amharic;
        const { password_hash: _, ...userWithoutPassword } = user as any;
        return { ...userWithoutPassword, serviceClassName };
    }

    async updateProfile(id: string, data: any) {
        const user = await authRepository.updateProfile(id, data);
        if (!user) return null;
        // updateProfile already includes service_classes in the returned user
        const serviceClassName = user.service_classes?.class_name_amharic;
        const { password_hash: _, ...userWithoutPassword } = user as any;
        return { ...userWithoutPassword, serviceClassName };
    }
}

export const authService = new AuthService();