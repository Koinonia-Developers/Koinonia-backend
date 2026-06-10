import { Request, Response, NextFunction } from 'express';
import { libraryService } from './library.service';

export class LibraryController {
    // Get all library items (with optional filters)
    async listLibrary(req: Request, res: Response, next: NextFunction) {
        try {
            const { 
                category, 
                department, 
                academic_year, 
                course_id, 
                document_type, 
                search 
            } = req.query;

            // If search query provided
            if (search && typeof search === 'string') {
                const items = await libraryService.searchByTitle(search);
                return res.status(200).json({ status: 'success', items, count: items.length });
            }

            // If filters provided, use recursive filtering
            if (category || department || academic_year || course_id || document_type) {
                const filters = {
                    ...(category && { category: category as string }),
                    ...(department && { academic_department: department as string }),
                    ...(academic_year && { academic_year: parseInt(academic_year as string) }),
                    ...(course_id && { course_id: course_id as string }),
                    ...(document_type && { document_type: document_type as string })
                };
                const items = await libraryService.filterRecursive(filters);
                return res.status(200).json({ status: 'success', items, count: items.length });
            }

            // Return all items
            const items = await libraryService.listAll();
            res.status(200).json({ status: 'success', items, count: items.length });
        } catch (e) { next(e); }
    }

    // Like a library item
    async likeItem(req: Request, res: Response, next: NextFunction) {
        try {
            const item = await libraryService.likeItem(req.params.id as string);
            res.status(200).json({ 
                status: 'success', 
                message: 'Item liked successfully',
                likes_count: item.likes 
            });
        } catch (e) { next(e); }
    }

    // Download a library item (increment download counter)
    async downloadItem(req: Request, res: Response, next: NextFunction) {
        try {
            const item = await libraryService.downloadItem(req.params.id as string);
            res.status(200).json({ 
                status: 'success',
                message: 'Download tracked successfully',
                downloads_count: item.downloads 
            });
        } catch (e) { next(e); }
    }

    // Create a new library item
    async createItem(req: Request, res: Response, next: NextFunction) {
        try {
            const userRole = req.user!.role;
            const item = await libraryService.createItem(userRole, req.body);
            res.status(201).json({ 
                status: 'success', 
                message: 'Library item created successfully',
                data: item 
            });
        } catch (e) { next(e); }
    }

    // Update a library item
    async updateItem(req: Request, res: Response, next: NextFunction) {
        try {
            const userRole = req.user!.role;
            const item = await libraryService.updateItem(userRole, req.params.id as string, req.body);
            res.status(200).json({ 
                status: 'success',
                message: 'Library item updated successfully', 
                data: item 
            });
        } catch (e) { next(e); }
    }

    // Delete a library item
    async deleteItem(req: Request, res: Response, next: NextFunction) {
        try {
            const userRole = req.user!.role;
            await libraryService.deleteItem(userRole, req.params.id as string);
            res.status(200).json({ 
                status: 'success', 
                message: 'Library item deleted successfully' 
            });
        } catch (e) { next(e); }
    }
}

export const libraryController = new LibraryController();
