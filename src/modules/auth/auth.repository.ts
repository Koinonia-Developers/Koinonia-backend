import { db } from '../../config/db';
import { User } from '@prisma/client';
import { RegisterInput } from './auth.schema';

interface CreateUserData extends Omit<RegisterInput, 'password'> {
    passwordHash: string;
}

export class AuthRepository {
    async createUser(data: CreateUserData): Promise<User> {
        const { serviceClassID, password: _unused, ...rest } = data as any;

        // Lookup the class to check its name for special status rules
        const serviceClass = await db.serviceClass.findUnique({ where: { id: serviceClassID } });

        let status = 'PENDING';
        if (serviceClass) {
            if (serviceClass.name === 'ፅሕፈት ቤት') {
                status = 'PENDING_OFFICE_APPROVAL';
            } else if (serviceClass.name === 'የለኝም') {
                status = 'ACTIVE';
            }
        }

        return db.user.create({
            data: {
                ...rest,
                status,
                serviceClass: { connect: { id: serviceClassID } },
            },
        });
    }

    async findByUsername(username: string): Promise<User | null> {
        return db.user.findUnique({ where: { username } });
    }

    async findByEmail(email: string): Promise<User | null> {
        return db.user.findUnique({ where: { email } });
    }

    async findById(id: string): Promise<User | null> {
        return db.user.findUnique({ where: { id } });
    }
}

export const authRepository = new AuthRepository();
