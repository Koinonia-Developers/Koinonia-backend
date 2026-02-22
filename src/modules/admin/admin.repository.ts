import { db } from '../../config/db';

export class AdminRepository {
    async getDashboardStats() {
        const [totalUsers, byStatus, byClass, bySex, byAcademicYear] = await Promise.all([
            db.user.count(),
            db.user.groupBy({ by: ['status'], _count: { id: true } }),
            db.user.groupBy({ by: ['serviceClassID'], _count: { id: true } }),
            db.user.groupBy({ by: ['sex'], _count: { id: true } }),
            db.user.groupBy({ by: ['academicYear'], _count: { id: true } }),
        ]);

        return { totalUsers, byStatus, byClass, bySex, byAcademicYear };
    }

    async getAllUsers() {
        return db.user.findMany({
            select: {
                id: true, username: true, fullName: true, email: true,
                role: true, status: true, serviceClassID: true,
                classLeaderOf: true, sex: true, department: true,
                academicYear: true, phoneNumber: true, createdAt: true,
                serviceClass: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findUserById(id: string) {
        return db.user.findUnique({ where: { id } });
    }

    async updateUser(id: string, data: any) {
        return db.user.update({ where: { id }, data });
    }

    async logActivity(data: {
        actorID: string;
        actionType: string;
        targetUserID?: string;
        description: string;
        ipAddress?: string;
    }) {
        return db.activityLog.create({ data });
    }

    // ─── Office (ፅሕፈት ቤት) ─────────────────────────────────────────
    async getOfficeClassId(): Promise<string | null> {
        const cls = await db.serviceClass.findFirst({ where: { name: 'ፅሕፈት ቤት' } });
        return cls?.id ?? null;
    }

    async getUnassignedClassId(): Promise<string | null> {
        const cls = await db.serviceClass.findFirst({ where: { name: 'የለኝም' } });
        return cls?.id ?? null;
    }

    async getOfficeData() {
        const [officeClass, unassignedClass] = await Promise.all([
            db.serviceClass.findFirst({ where: { name: 'ፅሕፈት ቤት' } }),
            db.serviceClass.findFirst({ where: { name: 'የለኝም' } }),
        ]);

        const [officeMembers, unassignedMembers] = await Promise.all([
            officeClass ? db.user.findMany({
                where: { serviceClassID: officeClass.id },
                select: { id: true, fullName: true, username: true, status: true, role: true },
            }) : [],
            unassignedClass ? db.user.findMany({
                where: { serviceClassID: unassignedClass.id },
                select: { id: true, fullName: true, username: true, status: true, role: true },
            }) : [],
        ]);

        return { officeMembers, unassignedMembers };
    }

    async getPendingOfficeRequests() {
        return db.user.findMany({
            where: { status: 'PENDING_OFFICE_APPROVAL' },
            select: { id: true, fullName: true, username: true, email: true, createdAt: true },
        });
    }
}

export const adminRepository = new AdminRepository();
