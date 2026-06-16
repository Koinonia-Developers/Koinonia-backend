import { db } from '../../config/db';
import { Prisma, AnnouncementStatus } from '@prisma/client';

export class AnnouncementsRepository {
    async createAnnouncement(data: {
        title: string;
        content: string;
        is_public: boolean;
        target_class_id?: string | null;
        author_id: string;
        status?: AnnouncementStatus;
        submitted_at?: Date | null;
        image_url?: string | null;
        video_url?: string | null;
        pdf_url?: string | null;
    }) {
        // Ensure target_class_id is null if empty string or invalid
        const targetClassId = data.target_class_id && data.target_class_id.trim() !== '' ? data.target_class_id : null;
        const result = await db.announcement.create({
            data: {
                title: data.title,
                content: data.content,
                is_public: data.is_public,
                target_class_id: targetClassId,
                author_id: data.author_id,
                status: data.status ?? AnnouncementStatus.APPROVED,
                submitted_at: data.submitted_at,
                image_url: data.image_url,
                video_url: data.video_url,
                pdf_url: data.pdf_url,
            },
            include: {
                users: { select: { full_name_three_parts: true, system_role: true, profile_image_url: true } },
                service_classes: { select: { class_name_amharic: true } },
                comments: {
                    include: {
                        users: { select: { full_name_three_parts: true, system_role: true, profile_image_url: true } },
                        comments: { select: { content: true, users: { select: { full_name_three_parts: true } } } }
                    },
                    orderBy: { created_at: 'asc' }
                },
                reactions: {
                    include: {
                        users: { select: { full_name_three_parts: true, system_role: true, profile_image_url: true } }
                    }
                }
            }
        });
        return this.formatAnnouncement(result);
    }

    async findAnnouncementsForUser(userId: string, userClassID: string | null, userRole: string) {
        const isAdmin = ['SECRETARIAT_CHAIRMAN', 'SECRETARIAT_VICE', 'SECRETARIAT_SECRETARY', 'SUPER_ADMIN'].includes(userRole);
        const isServiceManager = userRole === 'SERVICE_MANAGER';

        let whereClause: Prisma.AnnouncementWhereInput = {};

        if (isAdmin) {
            // ✅ Admins see ONLY PUBLIC announcements (approved and pending). They should NOT see class‑only announcements.
            whereClause = {
                is_public: true,
                status: { in: [AnnouncementStatus.APPROVED, AnnouncementStatus.PENDING] }
            };
        } else if (isServiceManager) {
            // Service manager sees:
            // - Public approved announcements
            // - Class‑only approved announcements for their class (if they have a class)
            // - Their own pending announcements (both public and class‑only)
            const approvedConditions: Prisma.AnnouncementWhereInput[] = [{ is_public: true }];
            if (userClassID) {
                approvedConditions.push({ target_class_id: userClassID });
            }
            
            whereClause = {
                OR: [
                    { status: AnnouncementStatus.APPROVED, OR: approvedConditions },
                    { status: AnnouncementStatus.PENDING, author_id: userId }
                ]
            };
        } else {
            // Regular members: only approved, public or their class
            const orConditions: Prisma.AnnouncementWhereInput[] = [{ is_public: true }];
            if (userClassID) {
                orConditions.push({ target_class_id: userClassID });
            }
            
            whereClause = {
                status: AnnouncementStatus.APPROVED,
                OR: orConditions
            };
        }

        const results = await db.announcement.findMany({
            where: whereClause,
            orderBy: { published_at: 'desc' },
            include: {
                users: { select: { full_name_three_parts: true, system_role: true, profile_image_url: true } },
                service_classes: { select: { class_name_amharic: true } },
                comments: {
                    include: {
                        users: { select: { full_name_three_parts: true, system_role: true, profile_image_url: true } },
                        comments: { select: { content: true, users: { select: { full_name_three_parts: true } } } }
                    },
                    orderBy: { created_at: 'asc' }
                },
                reactions: {
                    include: {
                        users: { select: { full_name_three_parts: true, system_role: true, profile_image_url: true } }
                    }
                }
            }
        });
        return results.map(r => this.formatAnnouncement(r));
    }

    async findPendingForSecretariat() {
        const results = await db.announcement.findMany({
            where: { status: AnnouncementStatus.PENDING, is_public: true },
            include: {
                users: { select: { full_name_three_parts: true, system_role: true, profile_image_url: true } },
                service_classes: { select: { class_name_amharic: true } },
                comments: {
                    include: {
                        users: { select: { full_name_three_parts: true, system_role: true, profile_image_url: true } },
                        comments: { select: { content: true, users: { select: { full_name_three_parts: true } } } }
                    },
                    orderBy: { created_at: 'asc' }
                },
                reactions: true
            },
            orderBy: { submitted_at: 'desc' }
        });
        return results.map(r => this.formatAnnouncement(r));
    }

    async findUserAnnouncements(userId: string) {
        const results = await db.announcement.findMany({
            where: { author_id: userId },
            include: {
                users: { select: { full_name_three_parts: true, system_role: true, profile_image_url: true } },
                service_classes: { select: { class_name_amharic: true } }
            },
            orderBy: { published_at: 'desc' }
        });
        return results.map(r => this.formatAnnouncement(r));
    }

    async findById(id: string) {
        const result = await db.announcement.findUnique({
            where: { id },
            include: {
                users: { select: { full_name_three_parts: true, system_role: true, profile_image_url: true } },
                service_classes: { select: { class_name_amharic: true } },
                comments: {
                    include: {
                        users: { select: { full_name_three_parts: true, system_role: true, profile_image_url: true } },
                        comments: { select: { content: true, users: { select: { full_name_three_parts: true } } } }
                    },
                    orderBy: { created_at: 'asc' }
                },
                reactions: {
                    include: {
                        users: { select: { full_name_three_parts: true, system_role: true, profile_image_url: true } }
                    }
                }
            }
        });
        if (!result) return null;
        return this.formatAnnouncement(result);
    }

    async updateAnnouncement(id: string, data: Prisma.AnnouncementUpdateInput) {
        const result = await db.announcement.update({
            where: { id },
            data,
            include: {
                users: { select: { full_name_three_parts: true, system_role: true, profile_image_url: true } },
                service_classes: { select: { class_name_amharic: true } },
                comments: {
                    include: {
                        users: { select: { full_name_three_parts: true, system_role: true, profile_image_url: true } }
                    },
                    orderBy: { created_at: 'asc' }
                },
                reactions: {
                    include: {
                        users: { select: { full_name_three_parts: true, system_role: true, profile_image_url: true } }
                    }
                }
            }
        });
        return this.formatAnnouncement(result);
    }

    async deleteAnnouncement(id: string) {
        await db.announcement.delete({ where: { id } });
    }

    private formatAnnouncement(announcement: any) {
        // Safely parse JSON strings
        const parseJsonArray = (field: any) => {
            if (!field) return [];
            if (Array.isArray(field)) return field;
            try { return JSON.parse(field); } catch { return []; }
        };

        return {
            ...announcement,
            author: announcement.users ? {
                fullName: announcement.users.full_name_three_parts,
                role: announcement.users.system_role,
                profileImageUrl: announcement.users.profile_image_url
            } : null,
            targetClass: announcement.service_classes ? { name: announcement.service_classes.class_name_amharic } : null,
            reaction_counts: {
                likes: announcement.reactions?.filter((r: any) => r.reaction_type === 'LIKE').length || 0,
                stars: announcement.reactions?.filter((r: any) => r.reaction_type === 'STAR').length || 0
            },
            comments: (announcement.comments || []).map((c: any) => {
                const comment: any = {
                    id: c.id,
                    content: c.content,
                    created_at: c.created_at,
                    author: c.users ? {
                        fullName: c.users.full_name_three_parts,
                        role: c.users.system_role,
                        profileImageUrl: c.users.profile_image_url
                    } : null
                };
                
                // If this is a reply to another comment, include the parent comment info
                if (c.parent_comment_id && c.comments) {
                    comment.replyTo = {
                        content: c.comments.content,
                        authorName: c.comments.users?.full_name_three_parts || 'Unknown'
                    };
                }
                
                return comment;
            }),
            // Media fields
            image_url: parseJsonArray(announcement.image_url),
            video_url: parseJsonArray(announcement.video_url),
            pdf_url: parseJsonArray(announcement.pdf_url),
        };
    }
}

export const announcementsRepository = new AnnouncementsRepository();