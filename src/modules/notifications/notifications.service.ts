//src/modules/notifications/notifications.service.ts
import { notificationsRepository } from './notifications.repository';
import { JwtPayload } from '../../middleware/auth';

export class NotificationsService {
    async getUserNotifications(user: JwtPayload, limit: number = 20, offset: number = 0) {
        const list = await notificationsRepository.getNotificationsForUser(user.userID, limit, offset);
        const unreadCount = await notificationsRepository.getUnreadCount(user.userID);
        const total = await notificationsRepository.getTotalCount(user.userID);
        return { list, unreadCount, total };
    }

    async getUnreadCount(user: JwtPayload) {
        return await notificationsRepository.getUnreadCount(user.userID);
    }

    async markAsRead(user: JwtPayload, id: string) {
        await notificationsRepository.markAsRead(id, user.userID);
        return { success: true };
    }

    async markAllAsRead(user: JwtPayload) {
        await notificationsRepository.markAllAsRead(user.userID);
        return { success: true };
    }

    async deleteNotification(user: JwtPayload, id: string) {
        await notificationsRepository.softDelete(id, user.userID);
        return { success: true };
    }
}
export const notificationsService = new NotificationsService();
