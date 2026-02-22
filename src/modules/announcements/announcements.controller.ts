import { Request, Response, NextFunction } from 'express';
import { announcementsService } from './announcements.service';

export class AnnouncementsController {
    async createAnnouncement(req: Request, res: Response, next: NextFunction) {
        try {
            const adminId = req.user!.userID;
            const announcement = await announcementsService.createAnnouncement(adminId, req.body);
            res.status(201).json({ status: 'success', data: announcement });
        } catch (error) {
            next(error);
        }
    }

    async getAnnouncements(req: Request, res: Response, next: NextFunction) {
        try {
            const { userID, serviceClassID, role } = req.user!;
            const announcements = await announcementsService.getAnnouncements(userID, serviceClassID, role);
            res.status(200).json({ status: 'success', data: announcements });
        } catch (error) {
            next(error);
        }
    }
}

export const announcementsController = new AnnouncementsController();
