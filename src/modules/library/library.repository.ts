import { db } from '../../config/db';

export class LibraryRepository {
    async listAll() {
        return db.library_items.findMany({
            where: { is_link_broken: false },
            orderBy: { created_at: 'desc' }
        });
    }

    async findById(id: string) {
        return db.library_items.findUnique({ where: { id } });
    }

    async incrementLikes(id: string) {
        return db.library_items.update({
            where: { id },
            data: { likes: { increment: 1 } }
        });
    }

    async createItem(data: {
        title: string;
        description: string;
        drive_url: string;
        category: 'SPIRITUAL' | 'ACADEMIC' | 'OTHER';
        academic_department?: string | null;
        academic_year?: number | null;
        course?: string | null;
        document_type?: 'TEXTBOOK' | 'PAST_EXAM' | null;
    }) {
        return db.library_items.create({
            data
        });
    }

    async updateItem(id: string, data: {
        title?: string;
        description?: string;
        drive_url?: string;
        category?: 'SPIRITUAL' | 'ACADEMIC' | 'OTHER';
        academic_department?: string | null;
        academic_year?: number | null;
        course?: string | null;
        document_type?: 'TEXTBOOK' | 'PAST_EXAM' | null;
    }) {
        return db.library_items.update({
            where: { id },
            data
        });
    }

    async deleteItem(id: string) {
        await db.library_items.delete({ where: { id } });
    }
}

export const libraryRepository = new LibraryRepository();
