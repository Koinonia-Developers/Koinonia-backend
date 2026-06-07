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
            author_id: adminId,
            image_url: data.imageUrl || null,
            video_url: data.videoUrl || null,
            pdf_url: data.pdfUrl || null
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

    async reactToAnnouncement(userId: string, announcementId: string, reactionType: string) {
        // Check if user already reacted
        const existingReaction = await db.reactions.findUnique({
            where: {
                announcement_id_user_id: {
                    announcement_id: announcementId,
                    user_id: userId
                }
            }
        });

        if (existingReaction) {
            // If same reaction type, remove it (toggle off)
            if (existingReaction.reaction_type === reactionType) {
                await db.reactions.delete({
                    where: { id: existingReaction.id }
                });
                return { message: 'Reaction removed' };
            } else {
                // If different reaction type, update it
                await db.reactions.update({
                    where: { id: existingReaction.id },
                    data: { reaction_type: reactionType as any }
                });
                return { message: 'Reaction updated' };
            }
        } else {
            // Create new reaction
            await db.reactions.create({
                data: {
                    announcement_id: announcementId,
                    user_id: userId,
                    reaction_type: reactionType as any
                }
            });
            return { message: 'Reaction added' };
        }
    }

    async commentOnAnnouncement(userId: string, announcementId: string, content: string) {
        if (!content || content.trim().length === 0) {
            throw new BadRequestError('Comment content is required');
        }

        const comment = await db.comment.create({
            data: {
                announcement_id: announcementId,
                author_id: userId,
                content: content.trim()
            },
            include: {
                users: { select: { full_name_three_parts: true, system_role: true } }
            }
        });

        return {
            ...comment,
            author: comment.users ? {
                fullName: comment.users.full_name_three_parts,
                role: comment.users.system_role
            } : null
        };
    }
}

export const announcementsService = new AnnouncementsService();
