import { libraryRepository } from './library.repository';
import { NotFoundError } from '../../utils/errors';

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
}

export const libraryService = new LibraryService();
