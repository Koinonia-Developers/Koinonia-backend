import { AnnouncementsRepository, announcementsRepository } from './announcements.repository';
import { CreateAnnouncementInput, ResubmitAnnouncementInput } from './announcements.schema';
import { BadRequestError, ForbiddenError } from '../../utils/errors';
import { AnnouncementStatus } from '@prisma/client';
import { db } from '../../config/db';
import { notificationsRepository } from '../notifications/notifications.repository';

export class AnnouncementsService {
    private repo: AnnouncementsRepository;

    constructor() {
        this.repo = announcementsRepository;
    }

    async createAnnouncement(adminId: string, data: CreateAnnouncementInput, userRole: string, userClassId?: string | null) {
        if (data.targetType === 'CLASS' && !data.targetClassID) {
            throw new BadRequestError('targetClassID is required when targetType is CLASS');
        }

        const isPublic = data.targetType === 'ALL';
        const targetClassId = data.targetType === 'CLASS' ? data.targetClassID : null;

        let status: AnnouncementStatus = AnnouncementStatus.APPROVED;
        if (userRole === 'SERVICE_MANAGER' && isPublic) {
            status = AnnouncementStatus.PENDING;
        }

        const payload = {
            title: data.title,
            content: data.content,
            is_public: isPublic,
            target_class_id: targetClassId,
            author_id: adminId,
            status,
            submitted_at: status === AnnouncementStatus.PENDING ? new Date() : null,
            image_url: Array.isArray(data.imageUrl) ? JSON.stringify(data.imageUrl) : (data.imageUrl || null),
            video_url: Array.isArray(data.videoUrl) ? JSON.stringify(data.videoUrl) : (data.videoUrl || null),
            pdf_url: Array.isArray(data.pdfUrl) ? JSON.stringify(data.pdfUrl) : (data.pdfUrl || null)
        };

        const announcement = await this.repo.createAnnouncement(payload);

        // ─── NOTIFICATIONS ───
        try {
            if (status === AnnouncementStatus.PENDING) {
                // Notify all secretariat members
                const secretariatUsers = await db.user.findMany({
                    where: {
                        system_role: { in: ['SECRETARIAT_CHAIRMAN', 'SECRETARIAT_VICE', 'SECRETARIAT_SECRETARY'] }
                    },
                    select: { id: true }
                });
                if (secretariatUsers.length > 0) {
                    await notificationsRepository.spawnBulkNotifications(secretariatUsers.map(u => u.id), {
                        actorID: adminId,
                        type: 'ANNOUNCEMENT',
                        content: `New announcement pending: ${announcement.title}`,
                        linkTarget: `/dashboard/announcements?filter=pending&announcementId=${announcement.id}`,
                        notificationType: 'ANNOUNCEMENT',
                        relatedEntityId: announcement.id
                    });
                    console.log(`📢 Pending notification sent to ${secretariatUsers.length} secretariat users`);
                } else {
                    console.warn('⚠️ No secretariat users found to notify for pending announcement');
                }
            } else {
                // Notify target audience (approved announcements)
                let targetUserIds: string[] = [];

                if (isPublic) {
                    // Notify ALL users
                    const allUsers = await db.user.findMany({ select: { id: true } });
                    targetUserIds = allUsers.map(u => u.id);
                    console.log(`📢 Public announcement: will notify ${targetUserIds.length} users`);
                } else if (targetClassId) {
                    // Notify only members of that class
                    const classMembers = await db.user.findMany({
                        where: { service_class_id: targetClassId },
                        select: { id: true }
                    });
                    targetUserIds = classMembers.map(u => u.id);
                    console.log(`📢 Class-only announcement: will notify ${targetUserIds.length} class members`);
                }

                if (targetUserIds.length > 0) {
                    await notificationsRepository.spawnBulkNotifications(targetUserIds, {
                        actorID: adminId,
                        type: 'ANNOUNCEMENT',
                        content: `New announcement: ${announcement.title}`,
                        linkTarget: `/dashboard/announcements?announcementId=${announcement.id}`,
                        notificationType: 'ANNOUNCEMENT',
                        relatedEntityId: announcement.id
                    });
                    console.log(`✅ Notification sent to ${targetUserIds.length} users`);
                } else {
                    console.warn(`⚠️ No target users found for announcement #${announcement.id}`);
                }
            }
        } catch (notifError) {
            console.error('❌ Failed to send notifications for announcement:', notifError);
            // Do NOT re-throw – announcement creation should succeed even if notifications fail
        }

        return announcement;
    }

    async getAnnouncements(userId: string, userClassID: string, userRole: string) {
        return this.repo.findAnnouncementsForUser(userId, userClassID, userRole);
    }

    async getPendingAnnouncements() {
        return this.repo.findPendingForSecretariat();
    }

    async getUserAnnouncements(userId: string) {
        return this.repo.findUserAnnouncements(userId);
    }

  async approveAnnouncement(id: string, approverId: string) {
        const announcement = await this.repo.findById(id);
        if (!announcement) throw new BadRequestError('Announcement not found');
        if (announcement.status !== AnnouncementStatus.PENDING) throw new BadRequestError('Announcement is not pending');

        const updated = await this.repo.updateAnnouncement(id, {
            status: AnnouncementStatus.APPROVED,
            approved_by: { connect: { id: approverId } },
            published_at: new Date()
        });

        // Notify creator
        await notificationsRepository.spawnBulkNotifications([announcement.author_id], {
            actorID: approverId,
            type: 'ANNOUNCEMENT',
            content: `Your announcement "${announcement.title}" has been approved.`,
            linkTarget: `/dashboard/announcements?announcementId=${id}`,
            notificationType: 'ANNOUNCEMENT',
            relatedEntityId: id
        });

        // Notify target audience
        try {
            let targetUserIds: string[] = [];
            if (announcement.is_public) {
                const allUsers = await db.user.findMany({ select: { id: true } });
                targetUserIds = allUsers.map(u => u.id);
            } else if (announcement.target_class_id) {
                const classMembers = await db.user.findMany({
                    where: { service_class_id: announcement.target_class_id },
                    select: { id: true }
                });
                targetUserIds = classMembers.map(u => u.id);
            }
            targetUserIds = targetUserIds.filter(id => id !== announcement.author_id);
            if (targetUserIds.length > 0) {
                await notificationsRepository.spawnBulkNotifications(targetUserIds, {
                    actorID: approverId,
                    type: 'ANNOUNCEMENT',
                    content: `New announcement: ${announcement.title}`,
                    linkTarget: `/dashboard/announcements?announcementId=${id}`,
                    notificationType: 'ANNOUNCEMENT',
                    relatedEntityId: id
                });
            }
        } catch (e) {
            console.error('Failed to send approval notifications:', e);
        }

        return updated;
    }

    async rejectAnnouncement(id: string, reason: string, rejectorId: string) {
        const announcement = await this.repo.findById(id);
        if (!announcement) throw new BadRequestError('Announcement not found');
        if (announcement.status !== AnnouncementStatus.PENDING) throw new BadRequestError('Announcement is not pending');

        const updated = await this.repo.updateAnnouncement(id, {
            status: AnnouncementStatus.REJECTED,
            rejection_reason: reason
        });

        try {
            await notificationsRepository.spawnBulkNotifications([announcement.author_id], {
                actorID: rejectorId,
                type: 'ANNOUNCEMENT',
                content: `Your announcement "${announcement.title}" was rejected. Reason: ${reason}`,
                linkTarget: `/dashboard/my-announcements`,
                notificationType: 'ANNOUNCEMENT',
                relatedEntityId: id
            });
            console.log(`✅ Rejection notification sent to creator ${announcement.author_id}`);
        } catch (e) {
            console.error('❌ Failed to send rejection notification:', e);
        }

        return updated;
    }

    async resubmitAnnouncement(id: string, userId: string, data: ResubmitAnnouncementInput) {
        const announcement = await this.repo.findById(id);
        if (!announcement) throw new BadRequestError('Announcement not found');
        if (announcement.author_id !== userId) throw new ForbiddenError('You can only resubmit your own announcements');
        if (announcement.status !== AnnouncementStatus.REJECTED) throw new BadRequestError('Only rejected announcements can be resubmitted');

        const updated = await this.repo.updateAnnouncement(id, {
            title: data.title,
            content: data.content,
            status: AnnouncementStatus.PENDING,
            submitted_at: new Date(),
            rejection_reason: null,
            image_url: Array.isArray(data.imageUrl) ? JSON.stringify(data.imageUrl) : (data.imageUrl || null),
            video_url: Array.isArray(data.videoUrl) ? JSON.stringify(data.videoUrl) : (data.videoUrl || null),
            pdf_url: Array.isArray(data.pdfUrl) ? JSON.stringify(data.pdfUrl) : (data.pdfUrl || null)
        });

        try {
            const secretariatUsers = await db.user.findMany({
                where: { system_role: { in: ['SECRETARIAT_CHAIRMAN', 'SECRETARIAT_VICE', 'SECRETARIAT_SECRETARY'] } }
            });
            if (secretariatUsers.length > 0) {
                await notificationsRepository.spawnBulkNotifications(secretariatUsers.map(u => u.id), {
                    actorID: userId,
                    type: 'ANNOUNCEMENT',
                    content: `Re‑submitted announcement: ${updated.title}`,
                    linkTarget: `/dashboard/announcements?filter=pending&announcementId=${id}`,
                    notificationType: 'ANNOUNCEMENT',
                    relatedEntityId: id
                });
                console.log(`📢 Resubmit notification sent to ${secretariatUsers.length} secretariat users`);
            }
        } catch (e) {
            console.error('❌ Failed to send resubmit notification:', e);
        }

        return updated;
    }

    async updateAnnouncement(userId: string, userRole: string, id: string, data: any) {
        const announcement = await this.repo.findById(id);
        if (!announcement) throw new BadRequestError('Announcement not found');

        const isCreator = announcement.author_id === userId;
        const isChairman = ['SECRETARIAT_CHAIRMAN', 'SUPER_ADMIN'].includes(userRole);
        const canEditPublic = isChairman && announcement.is_public;

        if (!isCreator && !canEditPublic) {
            throw new ForbiddenError('You can only edit your own announcements or must be Chairman to edit public announcements');
        }

        const updateData: any = {
            title: data.title,
            content: data.content,
            is_public: data.targetType === 'ALL',
            target_class_id: data.targetType === 'CLASS' ? data.targetClassID : null,
            image_url: Array.isArray(data.imageUrl) || Array.isArray(data.image_url) ? JSON.stringify(data.imageUrl || data.image_url || []) : (data.imageUrl || data.image_url || null),
            video_url: Array.isArray(data.videoUrl) || Array.isArray(data.video_url) ? JSON.stringify(data.videoUrl || data.video_url || []) : (data.videoUrl || data.video_url || null),
            pdf_url: Array.isArray(data.pdfUrl) || Array.isArray(data.pdf_url) ? JSON.stringify(data.pdfUrl || data.pdf_url || []) : (data.pdfUrl || data.pdf_url || null)
        };
        return this.repo.updateAnnouncement(id, updateData);
    }

    async deleteAnnouncement(userId: string, userRole: string, id: string) {
        const announcement = await this.repo.findById(id);
        if (!announcement) throw new BadRequestError('Announcement not found');

        const isCreator = announcement.author_id === userId;
        const isChairman = ['SECRETARIAT_CHAIRMAN', 'SUPER_ADMIN'].includes(userRole);
        const canDeletePublic = isChairman && announcement.is_public;

        if (!isCreator && !canDeletePublic) {
            throw new ForbiddenError('You can only delete your own announcements or must be Chairman to delete public announcements');
        }
        return this.repo.deleteAnnouncement(id);
    }

    // ─── COMMENT EDIT/DELETE ───
    async editComment(userId: string, commentId: string, content: string, userRole: string) {
        if (!content || content.trim().length === 0) {
            throw new BadRequestError('Comment content is required');
        }

        const comment = await db.comment.findUnique({
            where: { id: commentId }
        });
        if (!comment) throw new BadRequestError('Comment not found');

        const isAuthor = comment.author_id === userId;
        const isChairman = ['SECRETARIAT_CHAIRMAN', 'SUPER_ADMIN'].includes(userRole);
        if (!isAuthor && !isChairman) {
            throw new ForbiddenError('You can only edit your own comments, or chairman can edit any comment');
        }

        const updated = await db.comment.update({
            where: { id: commentId },
            data: { content: content.trim() },
            include: {
                users: { select: { full_name_three_parts: true, system_role: true, profile_image_url: true } }
            }
        });

        return {
            id: updated.id,
            content: updated.content,
            created_at: updated.created_at,
            author: updated.users ? {
                fullName: updated.users.full_name_three_parts,
                role: updated.users.system_role,
                profileImageUrl: updated.users.profile_image_url
            } : null
        };
    }

    async deleteComment(userId: string, commentId: string, userRole: string, userClassID?: string | null) {
        const comment = await db.comment.findUnique({
            where: { id: commentId },
            select: {
                author_id: true,
                announcement_id: true,
                parent_comment_id: true
            }
        });
        if (!comment) throw new BadRequestError('Comment not found');

        const announcement = await db.announcement.findUnique({
            where: { id: comment.announcement_id },
            select: { is_public: true, target_class_id: true }
        });
        if (!announcement) throw new BadRequestError('Associated announcement not found');

        const isAuthor = comment.author_id === userId;
        const isChairman = ['SECRETARIAT_CHAIRMAN', 'SUPER_ADMIN'].includes(userRole);
        const isClassManager = userRole === 'SERVICE_MANAGER' &&
                               !announcement.is_public &&
                               announcement.target_class_id === userClassID;

        if (!isAuthor && !isChairman && !isClassManager) {
            throw new ForbiddenError('You do not have permission to delete this comment');
        }

        await db.comment.deleteMany({ where: { parent_comment_id: commentId } });
        await db.comment.delete({ where: { id: commentId } });
        return { message: 'Comment deleted successfully' };
    }

    // ─── REACTIONS & COMMENTS ───
    async reactToAnnouncement(userId: string, announcementId: string, reactionType: string) {
        const existingReaction = await db.reactions.findUnique({
            where: {
                announcement_id_user_id: {
                    announcement_id: announcementId,
                    user_id: userId
                }
            }
        });

        if (existingReaction) {
            if (existingReaction.reaction_type === reactionType) {
                await db.reactions.delete({ where: { id: existingReaction.id } });
                return { message: 'Reaction removed' };
            } else {
                await db.reactions.update({
                    where: { id: existingReaction.id },
                    data: { reaction_type: reactionType as any }
                });
                return { message: 'Reaction updated' };
            }
        } else {
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

    async commentOnAnnouncement(userId: string, announcementId: string, content: string, parentCommentId?: string) {
        if (!content || content.trim().length === 0) {
            throw new BadRequestError('Comment content is required');
        }
        const comment = await db.comment.create({
            data: {
                announcement_id: announcementId,
                author_id: userId,
                content: content.trim(),
                parent_comment_id: parentCommentId || null
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