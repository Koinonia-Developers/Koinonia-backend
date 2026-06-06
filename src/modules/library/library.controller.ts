import { Request, Response, NextFunction } from 'express';
import { libraryService } from './library.service';

export class LibraryController {
    async listLibrary(req: Request, res: Response, next: NextFunction) {
        try {
            const items = await libraryService.listAll();
            res.status(200).json({ status: 'success', items });
        } catch (e) { next(e); }
    }

    async likeItem(req: Request, res: Response, next: NextFunction) {
        try {
            await libraryService.likeItem(req.params.id as string);
            res.status(200).json({ status: 'success' });
        } catch (e) { next(e); }
    }

    async createItem(req: Request, res: Response, next: NextFunction) {
        try {
            const userRole = req.user!.role;
            const item = await libraryService.createItem(userRole, req.body);
            res.status(201).json({ status: 'success', data: item });
        } catch (e) { next(e); }
    }

    async updateItem(req: Request, res: Response, next: NextFunction) {
        try {
            const userRole = req.user!.role;
            const item = await libraryService.updateItem(userRole, req.params.id as string, req.body);
            res.status(200).json({ status: 'success', data: item });
        } catch (e) { next(e); }
    }

    async deleteItem(req: Request, res: Response, next: NextFunction) {
        try {
            const userRole = req.user!.role;
            await libraryService.deleteItem(userRole, req.params.id as string);
            res.status(200).json({ status: 'success', message: 'Library item deleted' });
        } catch (e) { next(e); }
    }
}

export const libraryController = new LibraryController();
