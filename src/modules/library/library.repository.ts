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
}

export const libraryRepository = new LibraryRepository();
