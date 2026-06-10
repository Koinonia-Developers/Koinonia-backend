import { libraryRepository } from './library.repository';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../utils/errors';

// Google Drive URL validation regex
const GOOGLE_DRIVE_URL_PATTERN = /^https:\/\/drive\.google\.com\/file\/d\/[a-zA-Z0-9_-]+\/view/;

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
            course_id: item.course_id,
            document_type: item.document_type,
            likes_count: item.likes,
            downloads_count: item.downloads,
            is_link_broken: item.is_link_broken,
            last_checked_at: item.last_checked_at,
            created_at: item.created_at
        }));
    }

    // FR-LIB-05: Recursive filtering by Department → Academic Year → Course ID → Document Type
    async filterRecursive(filters: {
        category?: string;
        academic_department?: string;
        academic_year?: number;
        course_id?: string;
        document_type?: string;
    }) {
        const items = await libraryRepository.filterRecursive(filters);
        return items.map(item => ({
            id: item.id,
            title: item.title,
            description: item.description,
            drive_url: item.drive_url,
            category: item.category,
            academic_department: item.academic_department,
            academic_year: item.academic_year,
            course_id: item.course_id,
            document_type: item.document_type,
            likes_count: item.likes,
            downloads_count: item.downloads,
            is_link_broken: item.is_link_broken,
            last_checked_at: item.last_checked_at,
            created_at: item.created_at
        }));
    }

    async searchByTitle(query: string) {
        const items = await libraryRepository.searchByTitle(query);
        return items.map(item => ({
            id: item.id,
            title: item.title,
            description: item.description,
            drive_url: item.drive_url,
            category: item.category,
            academic_department: item.academic_department,
            academic_year: item.academic_year,
            course_id: item.course_id,
            document_type: item.document_type,
            likes_count: item.likes,
            downloads_count: item.downloads,
            is_link_broken: item.is_link_broken,
            created_at: item.created_at
        }));
    }

    // FR-LIB-02: Validate Google Drive URLs only
    private validateGoogleDriveUrl(url: string): boolean {
        return GOOGLE_DRIVE_URL_PATTERN.test(url);
    }

    // FR-LIB-01: Reject direct binary file uploads
    private validateNoDirectFileUpload(data: any): void {
        if (data.file || data.binary || data.upload) {
            throw new BadRequestError(
                'Direct file uploads are not allowed. Please provide a public Google Drive URL instead.'
            );
        }
    }

    // FR-LIB-06: Track user interactions
    async likeItem(id: string) {
        const item = await libraryRepository.findById(id);
        if (!item) throw new NotFoundError('Library item not found');
        return libraryRepository.incrementLikes(id);
    }

    // FR-LIB-06: Track downloads
    async downloadItem(id: string) {
        const item = await libraryRepository.findById(id);
        if (!item) throw new NotFoundError('Library item not found');
        return libraryRepository.incrementDownloads(id);
    }

    async createItem(userRole: string, data: any) {
        // Only SECRETARIAT_CHAIRMAN, SUPER_ADMIN, and SERVICE_MANAGER can create library items
        if (userRole !== 'SECRETARIAT_CHAIRMAN' && userRole !== 'SUPER_ADMIN' && userRole !== 'SERVICE_MANAGER') {
            throw new ForbiddenError('Only administrators can create library items');
        }

        // FR-LIB-01: Validate no direct file uploads
        this.validateNoDirectFileUpload(data);

        // FR-LIB-02: Validate Google Drive URL
        if (!this.validateGoogleDriveUrl(data.drive_url)) {
            throw new BadRequestError(
                'Only public Google Drive URLs are accepted. Format: https://drive.google.com/file/d/{FILE_ID}/view'
            );
        }

        const itemData = {
            title: data.title,
            description: data.description || null,
            drive_url: data.drive_url,
            category: data.category,
            academic_department: data.academic_department || null,
            academic_year: data.academic_year || null,
            course_id: data.course_id || null,
            document_type: data.document_type || null
        };

        return libraryRepository.createItem(itemData);
    }

    async updateItem(userRole: string, id: string, data: any) {
        const item = await libraryRepository.findById(id);
        if (!item) throw new NotFoundError('Library item not found');

        // Only SECRETARIAT_CHAIRMAN, SUPER_ADMIN, and SERVICE_MANAGER can edit
        if (userRole !== 'SECRETARIAT_CHAIRMAN' && userRole !== 'SUPER_ADMIN' && userRole !== 'SERVICE_MANAGER') {
            throw new ForbiddenError('Only administrators can edit library items');
        }

        // FR-LIB-01: Validate no direct file uploads
        this.validateNoDirectFileUpload(data);

        // FR-LIB-02: Validate Google Drive URL if provided
        if (data.drive_url && !this.validateGoogleDriveUrl(data.drive_url)) {
            throw new BadRequestError(
                'Only public Google Drive URLs are accepted. Format: https://drive.google.com/file/d/{FILE_ID}/view'
            );
        }

        const updateData: any = {};
        if (data.title) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.drive_url) updateData.drive_url = data.drive_url;
        if (data.category) updateData.category = data.category;
        if (data.academic_department !== undefined) updateData.academic_department = data.academic_department;
        if (data.academic_year !== undefined) updateData.academic_year = data.academic_year;
        if (data.course_id !== undefined) updateData.course_id = data.course_id;
        if (data.document_type !== undefined) updateData.document_type = data.document_type;

        return libraryRepository.updateItem(id, updateData);
    }

    async deleteItem(userRole: string, id: string) {
        const item = await libraryRepository.findById(id);
        if (!item) throw new NotFoundError('Library item not found');

        // Only SECRETARIAT_CHAIRMAN, SUPER_ADMIN, and SERVICE_MANAGER can delete
        if (userRole !== 'SECRETARIAT_CHAIRMAN' && userRole !== 'SUPER_ADMIN' && userRole !== 'SERVICE_MANAGER') {
            throw new ForbiddenError('Only administrators can delete library items');
        }

        return libraryRepository.deleteItem(id);
    }

    // FR-LIB-03: Helper method to check if link is broken
    async checkLinkHealth(url: string): Promise<boolean> {
        try {
            const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    // FR-LIB-03: Mark link as broken (called by background job)
    async markLinkBroken(id: string) {
        return libraryRepository.markLinkBroken(id);
    }

    // FR-LIB-03: Mark link as working (called by background job)
    async markLinkWorking(id: string) {
        return libraryRepository.markLinkWorking(id);
    }

    // FR-LIB-03: Get all items for link validation
    async getAllItemsForLinkCheck() {
        return libraryRepository.getAllItemsForLinkCheck();
    }
}

export const libraryService = new LibraryService();
