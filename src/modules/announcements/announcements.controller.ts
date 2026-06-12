import { Request, Response, NextFunction } from 'express';
import { announcementsService } from './announcements.service';

export class AnnouncementsController {
    async createAnnouncement(req: Request, res: Response, next: NextFunction) {
        try {
            const adminId = req.user!.userID;
            const announcement = await announcementsService.createAnnouncement(adminId, req.body);
            res.status(201).json(announcement);
        } catch (error) {
            next(error);
        }
    }

    async getAnnouncements(req: Request, res: Response, next: NextFunction) {
        try {
            const { userID, serviceClassID, role } = req.user!;
            const announcements = await announcementsService.getAnnouncements(userID, serviceClassID || '', role);
            res.status(200).json({ items: announcements, total: announcements.length });
        } catch (error) {
            next(error);
        }
    }

    async reactToAnnouncement(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userID;
            const announcementId = req.params.id as string;
            const { type } = req.body;
            const result = await announcementsService.reactToAnnouncement(userId, announcementId, type);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    async commentOnAnnouncement(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userID;
            const announcementId = req.params.id as string;
            const { content, parentCommentId } = req.body;
            const result = await announcementsService.commentOnAnnouncement(userId, announcementId, content, parentCommentId);
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    }

    async updateAnnouncement(req: Request, res: Response, next: NextFunction) {
        try {
            const userRole = req.user!.role;
            const announcement = await announcementsService.updateAnnouncement(userRole, req.params.id as string, req.body);
            res.status(200).json(announcement);
        } catch (error) {
            next(error);
        }
    }

    async deleteAnnouncement(req: Request, res: Response, next: NextFunction) {
        try {
            const userRole = req.user!.role;
            await announcementsService.deleteAnnouncement(userRole, req.params.id as string);
            res.status(200).json({ status: 'success', message: 'Announcement deleted' });
        } catch (error) {
            next(error);
        }
    }
}

export const announcementsController = new AnnouncementsController();
