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
}

export const libraryController = new LibraryController();
