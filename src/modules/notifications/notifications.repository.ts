import { db } from '../../config/db';

export class NotificationsRepository {
    async getNotificationsForUser(userID: string) {
        return db.notification.findMany({
            where: { userID },
            orderBy: { createdAt: 'desc' },
            include: {
                actor: { select: { id: true, fullName: true, profileImage: true } }
            },
            take: 50
        });
    }

    async getUnreadCount(userID: string) {
        return db.notification.count({ where: { userID, isRead: false } });
    }

    async markAsRead(id: string, userID: string) {
        return db.notification.updateMany({
            where: { id, userID },
            data: { isRead: true }
        });
    }

    async markAllAsRead(userID: string) {
        return db.notification.updateMany({
            where: { userID, isRead: false },
            data: { isRead: true }
        });
    }

    async spawnNotification(data: { userID: string; actorID: string; type: 'POST' | 'ANNOUNCEMENT' | 'REPLY' | 'MESSAGE'; content: string; linkTarget?: string }) {
        if (data.userID === data.actorID) return null; // don't notify self
        return db.notification.create({ data });
    }

    async spawnBulkNotifications(userIDs: string[], payload: { actorID: string; type: 'POST' | 'ANNOUNCEMENT' | 'REPLY' | 'MESSAGE'; content: string; linkTarget?: string }) {
        const filtered = userIDs.filter(id => id !== payload.actorID);
        if (filtered.length === 0) return null;
        return db.notification.createMany({
            data: filtered.map(userID => ({ userID, ...payload }))
        });
    }
}

export const notificationsRepository = new NotificationsRepository();
