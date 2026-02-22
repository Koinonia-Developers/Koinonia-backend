import { Request, Response, NextFunction } from 'express';
import { notificationsService } from './notifications.service';

export class NotificationsController {
    async getNotifications(req: Request, res: Response, next: NextFunction) {
        try {
            const data = await notificationsService.getUserNotifications(req.user!);
            res.status(200).json({ status: 'success', data });
        } catch (e) { next(e); }
    }

    async markAsRead(req: Request, res: Response, next: NextFunction) {
        try {
            const data = await notificationsService.markAsRead(req.user!, req.params.id as string);
            res.status(200).json({ status: 'success', data });
        } catch (e) { next(e); }
    }

    async markAllAsRead(req: Request, res: Response, next: NextFunction) {
        try {
            const data = await notificationsService.markAllAsRead(req.user!);
            res.status(200).json({ status: 'success', data });
        } catch (e) { next(e); }
    }
}
export const notificationsController = new NotificationsController();
