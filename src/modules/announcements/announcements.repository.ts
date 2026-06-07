import { db } from '../../config/db';
import { Prisma } from '@prisma/client';

export class AnnouncementsRepository {
    async createAnnouncement(data: {
        title: string;
        content: string;
        is_public: boolean;
        target_class_id?: string | null;
        author_id: string;
        image_url?: string | null;
        video_url?: string | null;
        pdf_url?: string | null;
    }) {
        const result = await db.announcement.create({
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
        return {
            ...result,
            author: result.users ? { fullName: result.users.full_name_three_parts, role: result.users.system_role, profileImageUrl: result.users.profile_image_url } : null,
            targetClass: result.service_classes ? { name: result.service_classes.class_name_amharic } : null,
            reaction_counts: {
                likes: result.reactions?.filter((reaction: any) => reaction.reaction_type === 'LIKE').length || 0,
                stars: result.reactions?.filter((reaction: any) => reaction.reaction_type === 'STAR').length || 0
            },
            comments: result.comments?.map((comment: any) => ({
                id: comment.id,
                content: comment.content,
                created_at: comment.created_at,
                author: comment.users ? {
                    fullName: comment.users.full_name_three_parts,
                    role: comment.users.system_role,
                    profileImageUrl: comment.users.profile_image_url
                } : null
            })) || []
        };
    }

    async findAnnouncementsForUser(userClassID: string | null, userRole: string) {
        const isLeader = ['SECRETARIAT_CHAIRMAN', 'SECRETARIAT_VICE', 'SECRETARIAT_SECRETARY', 'SUPER_ADMIN', 'SERVICE_MANAGER', 'TEACHER', 'CLASS_LEADER'].includes(userRole);
        const isAdmin = ['SECRETARIAT_CHAIRMAN', 'SECRETARIAT_VICE', 'SECRETARIAT_SECRETARY', 'SUPER_ADMIN'].includes(userRole);

        let whereClause: Prisma.AnnouncementWhereInput;

        if (isAdmin) {
            whereClause = {};
        } else {
            const orConditions: Prisma.AnnouncementWhereInput[] = [
                { is_public: true }
            ];

            if (userClassID) {
                orConditions.push({ target_class_id: userClassID });
            }

            if (isLeader) {
                orConditions.push({ is_public: false, target_class_id: null });
            }

            whereClause = { OR: orConditions };
        }

        const results = await db.announcement.findMany({
            where: whereClause,
            orderBy: { published_at: 'desc' },
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

        return results.map(r => ({
            ...r,
            author: r.users ? { fullName: r.users.full_name_three_parts, role: r.users.system_role } : null,
            targetClass: r.service_classes ? { name: r.service_classes.class_name_amharic } : null,
            reaction_counts: {
                likes: r.reactions?.filter((reaction: any) => reaction.reaction_type === 'LIKE').length || 0,
                stars: r.reactions?.filter((reaction: any) => reaction.reaction_type === 'STAR').length || 0
            },
            comments: r.comments?.map((comment: any) => ({
                id: comment.id,
                content: comment.content,
                created_at: comment.created_at,
                author: comment.users ? {
                    fullName: comment.users.full_name_three_parts,
                    role: comment.users.system_role,
                    profileImageUrl: comment.users.profile_image_url
                } : null
            })) || []
        }));
    }

    async findById(id: string) {
        const result = await db.announcement.findUnique({
            where: { id },
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
        if (!result) return null;
        return {
            ...result,
            author: result.users ? { fullName: result.users.full_name_three_parts, role: result.users.system_role, profileImageUrl: result.users.profile_image_url } : null,
            targetClass: result.service_classes ? { name: result.service_classes.class_name_amharic } : null,
            reaction_counts: {
                likes: result.reactions?.filter((reaction: any) => reaction.reaction_type === 'LIKE').length || 0,
                stars: result.reactions?.filter((reaction: any) => reaction.reaction_type === 'STAR').length || 0
            },
            comments: result.comments?.map((comment: any) => ({
                id: comment.id,
                content: comment.content,
                created_at: comment.created_at,
                author: comment.users ? {
                    fullName: comment.users.full_name_three_parts,
                    role: comment.users.system_role,
                    profileImageUrl: comment.users.profile_image_url
                } : null
            })) || []
        };
    }

    async updateAnnouncement(id: string, data: {
        title?: string;
        content?: string;
        is_public?: boolean;
        target_class_id?: string | null;
    }) {
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
        return {
            ...result,
            author: result.users ? { fullName: result.users.full_name_three_parts, role: result.users.system_role, profileImageUrl: result.users.profile_image_url } : null,
            targetClass: result.service_classes ? { name: result.service_classes.class_name_amharic } : null,
            reaction_counts: {
                likes: result.reactions?.filter((reaction: any) => reaction.reaction_type === 'LIKE').length || 0,
                stars: result.reactions?.filter((reaction: any) => reaction.reaction_type === 'STAR').length || 0
            },
            comments: result.comments?.map((comment: any) => ({
                id: comment.id,
                content: comment.content,
                created_at: comment.created_at,
                author: comment.users ? {
                    fullName: comment.users.full_name_three_parts,
                    role: comment.users.system_role,
                    profileImageUrl: comment.users.profile_image_url
                } : null
            })) || []
        };
    }

    async deleteAnnouncement(id: string) {
        await db.announcement.delete({ where: { id } });
    }
}

export const announcementsRepository = new AnnouncementsRepository();
