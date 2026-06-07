import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { authRepository } from './auth.repository';
import { RegisterInput, LoginInput } from './auth.schema';
import { ConflictError, UnauthorizedError, ForbiddenError } from '../../utils/errors';

const SALT_ROUNDS = 12;

const generateToken = (user: {
    id: string;
    system_role: string;
    service_class_id?: string | null;
}) => {
    return jwt.sign(
        {
            userID: user.id,
            role: user.system_role,
            serviceClassID: user.service_class_id ?? null,
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

        const token = generateToken(user);
        const { password_hash: _, ...userWithoutPassword } = user as any;

        return { user: userWithoutPassword, token };
    }

    async login(data: LoginInput) {
        console.log('Login attempt with email:', data.email);
        const user = await authRepository.findByEmail(data.email);
        console.log('User found:', !!user, user?.email);
        if (!user) throw new UnauthorizedError('Invalid email or password');

        const isPasswordValid = await bcrypt.compare(data.password, user.password_hash);
        console.log('Password valid:', isPasswordValid);
        if (!isPasswordValid) throw new UnauthorizedError('Invalid email or password');

        const token = generateToken(user);
        const { password_hash: _, ...userWithoutPassword } = user as any;

        return { user: userWithoutPassword, token };
    }

    async getUserById(id: string) {
        const user = await authRepository.findById(id);
        if (!user) return null;
        const { password_hash: _, ...userWithoutPassword } = user as any;
        return userWithoutPassword;
    }

    async updateProfile(id: string, data: any) {
        const user = await authRepository.updateProfile(id, data);
        if (!user) return null;
        const { password_hash: _, ...userWithoutPassword } = user as any;
        return userWithoutPassword;
    }
}

export const authService = new AuthService();
