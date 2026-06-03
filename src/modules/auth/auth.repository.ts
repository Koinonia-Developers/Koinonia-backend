import { db } from '../../config/db';
import { User } from '@prisma/client';
import { RegisterInput } from './auth.schema';

interface CreateUserData extends Omit<RegisterInput, 'password'> {
    passwordHash: string;
}

export class AuthRepository {
    async createUser(data: { full_name_three_parts: string; email: string; passwordHash: string }): Promise<User> {
        return db.user.create({
            data: {
                full_name_three_parts: data.full_name_three_parts,
                email: data.email,
                password_hash: data.passwordHash,
                system_role: 'USER',
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
}

export const authRepository = new AuthRepository();
