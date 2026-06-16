import { Request, Response, NextFunction } from 'express';
import { announcementsService } from './announcements.service';

export class AnnouncementsController {
    async createAnnouncement(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userID;
            const userRole = req.user!.role;
            const userClassId = req.user!.serviceClassID;
            const announcement = await announcementsService.createAnnouncement(userId, req.body, userRole, userClassId);
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

    async getPendingAnnouncements(req: Request, res: Response, next: NextFunction) {
        try {
            const pending = await announcementsService.getPendingAnnouncements();
            res.status(200).json({ data: pending });
        } catch (error) {
            next(error);
        }
    }

    async getUserAnnouncements(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userID;
            const announcements = await announcementsService.getUserAnnouncements(userId);
            res.status(200).json({ data: announcements });
        } catch (error) {
            next(error);
        }
    }

    async approveAnnouncement(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const approverId = req.user!.userID;
            // ✅ Ensure id is string
            const announcement = await announcementsService.approveAnnouncement(id as string, approverId);
            res.status(200).json(announcement);
        } catch (error) {
            next(error);
        }
    }

    async rejectAnnouncement(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const rejectorId = req.user!.userID;
            const announcement = await announcementsService.rejectAnnouncement(id as string, reason, rejectorId);
            res.status(200).json(announcement);
        } catch (error) {
            next(error);
        }
    }

    async resubmitAnnouncement(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const userId = req.user!.userID;
            const announcement = await announcementsService.resubmitAnnouncement(id as string, userId, req.body);
            res.status(200).json(announcement);
        } catch (error) {
            next(error);
        }
    }

    async reactToAnnouncement(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userID;
            const announcementId = req.params.id;
            const { type } = req.body;
            const result = await announcementsService.reactToAnnouncement(userId, announcementId as string, type);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    async commentOnAnnouncement(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userID;
            const announcementId = req.params.id;
            const { content, parentCommentId } = req.body;
            const result = await announcementsService.commentOnAnnouncement(userId, announcementId as string, content, parentCommentId);
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    }

    async updateAnnouncement(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userID;
            const userRole = req.user!.role;
            const announcement = await announcementsService.updateAnnouncement(userId, userRole, req.params.id as string, req.body);
            res.status(200).json(announcement);
        } catch (error) {
            next(error);
        }
    }

    async deleteAnnouncement(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userID;
            const userRole = req.user!.role;
            await announcementsService.deleteAnnouncement(userId, userRole, req.params.id as string);
            res.status(200).json({ status: 'success', message: 'Announcement deleted' });
        } catch (error) {
            next(error);
        }
    }

async editComment(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.userID;
        const userRole = req.user!.role;
        const { commentId } = req.params;
        const { content } = req.body;
        const comment = await announcementsService.editComment(userId, commentId as string, content, userRole);
        res.status(200).json(comment);
    } catch (error) {
        next(error);
    }
}

async deleteComment(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.userID;
        const userRole = req.user!.role;
        const userClassID = req.user!.serviceClassID;
        const { commentId } = req.params;
        const result = await announcementsService.deleteComment(userId, commentId as string, userRole, userClassID);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}
}

export const announcementsController = new AnnouncementsController();