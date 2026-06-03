import { db } from '../../config/db';

export class NotificationsRepository {
    async getNotificationsForUser(userID: string) {
        return db.notification.findMany({
            where: { user_id: userID },
            orderBy: { created_at: 'desc' },
            take: 50
        });
    }

    async getUnreadCount(userID: string) {
        return db.notification.count({ where: { user_id: userID, is_read: false } });
    }

    async markAsRead(id: string, userID: string) {
        return db.notification.updateMany({
            where: { id, user_id: userID },
            data: { is_read: true }
        });
    }

    async markAllAsRead(userID: string) {
        return db.notification.updateMany({
            where: { user_id: userID, is_read: false },
            data: { is_read: true }
        });
    }

    async spawnNotification(data: { userID: string; actorID: string; type: 'POST' | 'ANNOUNCEMENT' | 'REPLY' | 'MESSAGE'; content: string; linkTarget?: string }) {
        if (data.userID === data.actorID) return null; // don't notify self
        const titleMap = {
            POST: 'New Post',
            ANNOUNCEMENT: 'New Announcement',
            REPLY: 'New Comment',
            MESSAGE: 'New Message'
        };
        return db.notification.create({
            data: {
                user_id: data.userID,
                title: titleMap[data.type] || 'Notification',
                message: data.content,
                target_route: data.linkTarget || null
            }
        });
    }

    async spawnBulkNotifications(userIDs: string[], payload: { actorID: string; type: 'POST' | 'ANNOUNCEMENT' | 'REPLY' | 'MESSAGE'; content: string; linkTarget?: string }) {
        const filtered = userIDs.filter(id => id !== payload.actorID);
        if (filtered.length === 0) return null;
        const titleMap = {
            POST: 'New Post',
            ANNOUNCEMENT: 'New Announcement',
            REPLY: 'New Comment',
            MESSAGE: 'New Message'
        };
        return db.notification.createMany({
            data: filtered.map(userID => ({
                user_id: userID,
                title: titleMap[payload.type] || 'Notification',
                message: payload.content,
                target_route: payload.linkTarget || null
            }))
        });
    }
}

export const notificationsRepository = new NotificationsRepository();
