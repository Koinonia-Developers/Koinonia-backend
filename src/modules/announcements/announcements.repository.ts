import { db } from '../../config/db';
import { Prisma } from '@prisma/client';

export class AnnouncementsRepository {
    async createAnnouncement(data: Prisma.AnnouncementCreateInput) {
        return db.announcement.create({
            data,
            include: {
                author: { select: { fullName: true, role: true } },
                targetClass: { select: { name: true } }
            }
        });
    }

    async findAnnouncementsForUser(userClassID: string, userRole: string) {
        const whereClause: Prisma.AnnouncementWhereInput = {
            OR: [
                { targetType: 'ALL' },
                { targetType: 'CLASS', targetClassID: userClassID },
                // If user is a leader, they can also see LEADERS announcements
                ...(userRole === 'CLASS_LEADER' || userRole === 'ADMIN' ? [{ targetType: 'LEADERS' as const }] : []),
                ...(userRole === 'ADMIN' ? [{ targetType: 'CLASS' as const }] : []) // Admin sees all classes probably, but strictly speaking "CLASS" target means that specific class. We'll show admin everything or stick to target. Let's show admin everything.
            ]
        };

        if (userRole === 'ADMIN') {
            // Admins see all announcements
            delete whereClause.OR;
        }

        return db.announcement.findMany({
            where: whereClause,
            orderBy: [
                { isPinned: 'desc' },
                { createdAt: 'desc' }
            ],
            include: {
                author: { select: { fullName: true, role: true } },
                targetClass: { select: { name: true } }
            }
        });
    }
}

export const announcementsRepository = new AnnouncementsRepository();
