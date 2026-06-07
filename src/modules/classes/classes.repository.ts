import { db } from '../../config/db';

export class ClassesRepository {
    async getAllActiveClasses() {
        const classes = await db.serviceClass.findMany({
            where: { is_public_registration: true },
            select: {
                id: true,
                class_name_amharic: true
            },
            orderBy: { class_name_amharic: 'asc' }
        });
        return classes.map(c => ({
            id: c.id,
            class_name_amharic: c.class_name_amharic
        }));
    }
}

export const classesRepository = new ClassesRepository();
