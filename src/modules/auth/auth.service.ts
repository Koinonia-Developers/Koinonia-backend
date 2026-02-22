import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { authRepository } from './auth.repository';
import { RegisterInput, LoginInput } from './auth.schema';
import { ConflictError, UnauthorizedError, ForbiddenError } from '../../utils/errors';

const SALT_ROUNDS = 12;

const generateToken = (user: {
    id: string;
    role: string;
    serviceClassID: string;
    classLeaderOf?: string | null;
    status: string;
}) => {
    return jwt.sign(
        {
            userID: user.id,
            role: user.role,
            serviceClassID: user.serviceClassID,
            classLeaderOf: user.classLeaderOf ?? null,
            status: user.status,
        },
        env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

export class AuthService {
    async register(data: RegisterInput) {
        const [existingUsername, existingEmail] = await Promise.all([
            authRepository.findByUsername(data.username),
            authRepository.findByEmail(data.email),
        ]);

        if (existingUsername) throw new ConflictError('Username already taken');
        if (existingEmail) throw new ConflictError('Email already registered');

        const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

        const user = await authRepository.createUser({
            ...data,
            passwordHash,
        });

        const token = generateToken(user);
        const { passwordHash: _, ...userWithoutPassword } = user as any;

        return { user: userWithoutPassword, token };
    }

    async login(data: LoginInput) {
        const user = await authRepository.findByUsername(data.username);
        if (!user) throw new UnauthorizedError('Invalid username or password');

        const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
        if (!isPasswordValid) throw new UnauthorizedError('Invalid username or password');

        if (user.status === 'SUSPENDED') {
            throw new ForbiddenError('Your account has been suspended. Contact admin.');
        }

        const token = generateToken(user);
        const { passwordHash: _, ...userWithoutPassword } = user as any;

        return { user: userWithoutPassword, token };
    }
}

export const authService = new AuthService();
