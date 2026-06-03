import { db } from '../../config/db';
import { Prisma } from '@prisma/client';

export class AnnouncementsRepository {
    async createAnnouncement(data: {
        title: string;
        content: string;
        is_public: boolean;
        target_class_id?: string | null;
        author_id: string;
    }) {
        const result = await db.announcement.create({
            data,
            include: {
                users: { select: { full_name_three_parts: true, system_role: true } },
                service_classes: { select: { class_name_amharic: true } }
            }
        });
        return {
            ...result,
            author: result.users ? { fullName: result.users.full_name_three_parts, role: result.users.system_role } : null,
            targetClass: result.service_classes ? { name: result.service_classes.class_name_amharic } : null
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
                users: { select: { full_name_three_parts: true, system_role: true } },
                service_classes: { select: { class_name_amharic: true } }
            }
        });

        return results.map(r => ({
            ...r,
            author: r.users ? { fullName: r.users.full_name_three_parts, role: r.users.system_role } : null,
            targetClass: r.service_classes ? { name: r.service_classes.class_name_amharic } : null
        }));
    }
}

export const announcementsRepository = new AnnouncementsRepository();
