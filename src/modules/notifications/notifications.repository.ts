//src/modules/notifications/notifications.repository.ts
import { db } from '../../config/db';

export class NotificationsRepository {
    async getNotificationsForUser(userID: string, limit: number = 20, offset: number = 0) {
        return db.notification.findMany({
            where: { 
                user_id: userID,
                deleted_at: null
            },
            orderBy: { created_at: 'desc' },
            take: limit,
            skip: offset
        });
    }

    async getUnreadCount(userID: string) {
        return db.notification.count({ 
            where: { 
                user_id: userID, 
                is_read: false,
                deleted_at: null
            } 
        });
    }

    async getTotalCount(userID: string) {
        return db.notification.count({ 
            where: { 
                user_id: userID,
                deleted_at: null
            } 
        });
    }

    async markAsRead(id: string, userID: string) {
        return db.notification.updateMany({
            where: { id, user_id: userID, deleted_at: null },
            data: { is_read: true }
        });
    }

    async markAllAsRead(userID: string) {
        return db.notification.updateMany({
            where: { user_id: userID, is_read: false, deleted_at: null },
            data: { is_read: true }
        });
    }

    async softDelete(id: string, userID: string) {
        return db.notification.updateMany({
            where: { id, user_id: userID, deleted_at: null },
            data: { deleted_at: new Date() }
        });
    }

    async spawnNotification(data: { 
        userID: string; 
        actorID: string; 
        type: 'POST' | 'ANNOUNCEMENT' | 'REPLY' | 'MESSAGE' | 'MEMBERSHIP' | 'ROLE' | 'COURSE' | 'BATCH'; 
        content: string; 
        linkTarget?: string;
        notificationType?: string;
        relatedEntityId?: string;
    }) {
        if (data.userID === data.actorID) return null; // don't notify self
        const titleMap = {
            POST: 'New Post',
            ANNOUNCEMENT: 'New Announcement',
            REPLY: 'New Comment',
            MESSAGE: 'New Message',
            MEMBERSHIP: 'Membership Update',
            ROLE: 'Role Update',
            COURSE: 'Course Update',
            BATCH: 'Batch Update'
        };
        return db.notification.create({
            data: {
                user_id: data.userID,
                title: titleMap[data.type] || 'Notification',
                message: data.content,
                target_route: data.linkTarget || null,
                type: data.notificationType || data.type,
                related_entity_id: data.relatedEntityId
            }
        });
    }

    async spawnBulkNotifications(userIDs: string[], payload: { 
        actorID: string; 
        type: 'POST' | 'ANNOUNCEMENT' | 'REPLY' | 'MESSAGE' | 'MEMBERSHIP' | 'ROLE' | 'COURSE' | 'BATCH'; 
        content: string; 
        linkTarget?: string;
        notificationType?: string;
        relatedEntityId?: string;
    }) {
        const filtered = userIDs.filter(id => id !== payload.actorID);
        if (filtered.length === 0) return null;
        const titleMap = {
            POST: 'New Post',
            ANNOUNCEMENT: 'New Announcement',
            REPLY: 'New Comment',
            MESSAGE: 'New Message',
            MEMBERSHIP: 'Membership Update',
            ROLE: 'Role Update',
            COURSE: 'Course Update',
            BATCH: 'Batch Update'
        };
        return db.notification.createMany({
            data: filtered.map(userID => ({
                user_id: userID,
                title: titleMap[payload.type] || 'Notification',
                message: payload.content,
                target_route: payload.linkTarget || null,
                type: payload.notificationType || payload.type,
                related_entity_id: payload.relatedEntityId
            }))
        });
    }
}

export const notificationsRepository = new NotificationsRepository();
