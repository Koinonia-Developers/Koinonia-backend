import { AnnouncementsRepository, announcementsRepository } from './announcements.repository';
import { CreateAnnouncementInput } from './announcements.schema';
import { BadRequestError, ForbiddenError } from '../../utils/errors';
import { Prisma } from '@prisma/client';
import { db } from '../../config/db';
import { notificationsRepository } from '../notifications/notifications.repository';

export class AnnouncementsService {
    private repo: AnnouncementsRepository;

    constructor() {
        this.repo = announcementsRepository;
    }

    async createAnnouncement(adminId: string, data: CreateAnnouncementInput) {
        if (data.targetType === 'CLASS' && !data.targetClassID) {
            throw new BadRequestError('targetClassID is required when targetType is CLASS');
        }

        const payload = {
            title: data.title,
            content: data.content,
            is_public: data.targetType === 'ALL',
            target_class_id: data.targetType === 'CLASS' ? data.targetClassID : null,
            author_id: adminId
        };

        const announcement = await this.repo.createAnnouncement(payload);

        let targetUserIds: string[] = [];
        if (data.targetType === 'ALL') {
            const users = await db.user.findMany({ select: { id: true } });
            targetUserIds = users.map(u => u.id);
        } else if (data.targetType === 'CLASS' && data.targetClassID) {
            const users = await db.user.findMany({ where: { service_class_id: data.targetClassID }, select: { id: true } });
            targetUserIds = users.map(u => u.id);
        } else if (data.targetType === 'LEADERS') {
            const users = await db.user.findMany({
                where: {
                    system_role: {
                        in: ['SECRETARIAT_CHAIRMAN', 'SECRETARIAT_VICE', 'SECRETARIAT_SECRETARY', 'SERVICE_MANAGER', 'TEACHER']
                    }
                },
                select: { id: true }
            });
            targetUserIds = users.map(u => u.id);
        }

        await notificationsRepository.spawnBulkNotifications(targetUserIds, {
            actorID: adminId,
            type: 'ANNOUNCEMENT',
            content: `New announcement: ${announcement.title}`,
            linkTarget: `/dashboard/announcements`
        });

        return announcement;
    }

    async getAnnouncements(userId: string, userClassID: string, userRole: string) {
        return this.repo.findAnnouncementsForUser(userClassID, userRole);
    }

    async updateAnnouncement(userRole: string, id: string, data: any) {
        const announcement = await this.repo.findById(id);
        if (!announcement) throw new BadRequestError('Announcement not found');

        // SECRETARIAT_CHAIRMAN can edit any announcement
        if (userRole !== 'SECRETARIAT_CHAIRMAN' && userRole !== 'SUPER_ADMIN') {
            throw new ForbiddenError('Only Chairman can edit announcements');
        }

        return this.repo.updateAnnouncement(id, data);
    }

    async deleteAnnouncement(userRole: string, id: string) {
        const announcement = await this.repo.findById(id);
        if (!announcement) throw new BadRequestError('Announcement not found');

        // SECRETARIAT_CHAIRMAN can delete any announcement
        if (userRole !== 'SECRETARIAT_CHAIRMAN' && userRole !== 'SUPER_ADMIN') {
            throw new ForbiddenError('Only Chairman can delete announcements');
        }

        return this.repo.deleteAnnouncement(id);
    }
}

export const announcementsService = new AnnouncementsService();
