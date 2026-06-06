import { libraryRepository } from './library.repository';
import { NotFoundError, ForbiddenError } from '../../utils/errors';

export class LibraryService {
    async listAll() {
        const items = await libraryRepository.listAll();
        return items.map(item => ({
            id: item.id,
            title: item.title,
            description: item.description,
            drive_url: item.drive_url,
            category: item.category,
            academic_department: item.academic_department,
            academic_year: item.academic_year,
            document_type: item.document_type,
            likes_count: item.likes,
            downloads: item.downloads
        }));
    }

    async likeItem(id: string) {
        const item = await libraryRepository.findById(id);
        if (!item) throw new NotFoundError('Library item not found');
        return libraryRepository.incrementLikes(id);
    }

    async createItem(userRole: string, data: any) {
        // SECRETARIAT_CHAIRMAN can create any library item
        if (userRole !== 'SECRETARIAT_CHAIRMAN' && userRole !== 'SUPER_ADMIN') {
            throw new ForbiddenError('Only Chairman can create library items');
        }
        return libraryRepository.createItem(data);
    }

    async updateItem(userRole: string, id: string, data: any) {
        const item = await libraryRepository.findById(id);
        if (!item) throw new NotFoundError('Library item not found');

        // SECRETARIAT_CHAIRMAN can edit any library item
        if (userRole !== 'SECRETARIAT_CHAIRMAN' && userRole !== 'SUPER_ADMIN') {
            throw new ForbiddenError('Only Chairman can edit library items');
        }

        return libraryRepository.updateItem(id, data);
    }

    async deleteItem(userRole: string, id: string) {
        const item = await libraryRepository.findById(id);
        if (!item) throw new NotFoundError('Library item not found');

        // SECRETARIAT_CHAIRMAN can delete any library item
        if (userRole !== 'SECRETARIAT_CHAIRMAN' && userRole !== 'SUPER_ADMIN') {
            throw new ForbiddenError('Only Chairman can delete library items');
        }

        return libraryRepository.deleteItem(id);
    }
}

export const libraryService = new LibraryService();
