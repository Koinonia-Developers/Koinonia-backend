import { notificationsRepository } from './notifications.repository';
import { JwtPayload } from '../../middleware/auth';

export class NotificationsService {
    async getUserNotifications(user: JwtPayload) {
        const list = await notificationsRepository.getNotificationsForUser(user.userID);
        const unreadCount = await notificationsRepository.getUnreadCount(user.userID);
        return { list, unreadCount };
    }

    async markAsRead(user: JwtPayload, id: string) {
        await notificationsRepository.markAsRead(id, user.userID);
        return { success: true };
    }

    async markAllAsRead(user: JwtPayload) {
        await notificationsRepository.markAllAsRead(user.userID);
        return { success: true };
    }
}
export const notificationsService = new NotificationsService();
