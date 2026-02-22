import { db } from '../../config/db';

export class ClassesRepository {
    async getAllActiveClasses() {
        return db.serviceClass.findMany({
            where: { isActive: true },
            select: {
                id: true,
                name: true,
                description: true
            },
            orderBy: { name: 'asc' }
        });
    }
}

export const classesRepository = new ClassesRepository();
