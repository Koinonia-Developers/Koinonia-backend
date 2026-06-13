//src/modules/notifications/notifications.controller.ts
import { Request, Response, NextFunction } from 'express';
import { notificationsService } from './notifications.service';

export class NotificationsController {
    async getNotifications(req: Request, res: Response, next: NextFunction) {
        try {
            const limit = parseInt(req.query.limit as string) || 20;
            const offset = parseInt(req.query.offset as string) || 0;
            const data = await notificationsService.getUserNotifications(req.user!, limit, offset);
            res.status(200).json({ items: data.list, total: data.total, unreadCount: data.unreadCount });
        } catch (e) { next(e); }
    }

    async getUnreadCount(req: Request, res: Response, next: NextFunction) {
        try {
            const count = await notificationsService.getUnreadCount(req.user!);
            res.status(200).json({ unreadCount: count });
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

    async deleteNotification(req: Request, res: Response, next: NextFunction) {
        try {
            const data = await notificationsService.deleteNotification(req.user!, req.params.id as string);
            res.status(200).json({ status: 'success', data });
        } catch (e) { next(e); }
    }
}
export const notificationsController = new NotificationsController();
