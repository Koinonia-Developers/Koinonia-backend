import { adminRepository } from './admin.repository';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../utils/errors';
import { PromoteLeaderInput, ChangeClassInput, SuspendInput, PromoteRoleInput } from './admin.schema';
import { db } from '../../config/db';

export class AdminService {
    async getDashboardStats(_requester?: any) {
        return adminRepository.getDashboardStats();
    }

    async getAllUsers(requester: any) {
        if (requester.role === 'SERVICE_MANAGER') {
            return adminRepository.getAllUsers(requester.serviceClassID);
        }
        return adminRepository.getAllUsers();
    }

    // ─── User Approval ──────────────────────────────────────────────
    async approveUser(adminId: string, targetId: string, ip?: string) {
        const user = await adminRepository.findUserById(targetId);
        if (!user) throw new NotFoundError('User not found');
        if (user.status === 'ACTIVE') throw new BadRequestError('User is already active');

        const updated = await adminRepository.updateUser(targetId, { status: 'ACTIVE' });
        await adminRepository.logActivity({
            actorID: adminId, actionType: 'APPROVE_USER',
            targetUserID: targetId, description: `Approved user ${user.username}`, ipAddress: ip
        });
        return updated;
    }

    async rejectUser(adminId: string, targetId: string, ip?: string) {
        const user = await adminRepository.findUserById(targetId);
        if (!user) throw new NotFoundError('User not found');

        const updated = await adminRepository.updateUser(targetId, { status: 'SUSPENDED' });
        await adminRepository.logActivity({
            actorID: adminId, actionType: 'REJECT_USER',
            targetUserID: targetId, description: `Rejected user ${user.username}`, ipAddress: ip
        });
        return updated;
    }

    async suspendUser(adminId: string, requester: any, targetId: string, body: SuspendInput, ip?: string) {
        const user = await adminRepository.findUserById(targetId);
        if (!user) throw new NotFoundError('User not found');
        if (user.id === adminId) throw new BadRequestError('Cannot suspend yourself');

        if (requester.role === 'SERVICE_MANAGER' && user.serviceClassID !== requester.serviceClassID) {
            throw new ForbiddenError('You can only suspend members of your own class');
        }

        const updated = await adminRepository.updateUser(targetId, { status: 'SUSPENDED' });
        await adminRepository.logActivity({
            actorID: adminId, actionType: 'SUSPEND_USER',
            targetUserID: targetId, description: `Suspended ${user.username}: ${body.reason}`, ipAddress: ip
        });
        return updated;
    }

    async promoteRole(adminId: string, requester: any, targetId: string, body: PromoteRoleInput, ip?: string) {
        const user = await adminRepository.findUserById(targetId);
        if (!user) throw new NotFoundError('User not found');
        if (user.id === adminId) throw new BadRequestError('Cannot change your own role');

        // Education Manager Domain Lock
        if (body.role === 'TEACHER') {
            if (requester.role === 'SERVICE_MANAGER') {
                const requesterClass = await db.serviceClass.findUnique({ where: { id: requester.serviceClassID } });
                if (requesterClass?.class_name_amharic !== 'ትምህርት ክፍል') {
                    throw new ForbiddenError('Only the Education Manager can grant TEACHER roles');
                }
            }
        } else if (requester.role === 'SERVICE_MANAGER') {
            throw new ForbiddenError('Service Managers cannot arbitrarily change system roles');
        }

        const updated = await adminRepository.updateUser(targetId, { role: body.role });
        await adminRepository.logActivity({
            actorID: adminId, actionType: 'PROMOTE_ROLE',
            targetUserID: targetId,
            description: `Changed ${user.username} role to ${body.role}`, ipAddress: ip
        });
        return updated;
    }

    async changeUserClass(adminId: string, targetId: string, body: ChangeClassInput, ip?: string) {
        const user = await adminRepository.findUserById(targetId);
        if (!user) throw new NotFoundError('User not found');

        const cls = await db.serviceClass.findUnique({ where: { id: body.serviceClassID } });
        if (!cls) throw new NotFoundError('Service class not found');

        const updated = await adminRepository.updateUser(targetId, { serviceClassID: body.serviceClassID });
        await adminRepository.logActivity({
            actorID: adminId, actionType: 'CHANGE_CLASS',
            targetUserID: targetId,
            description: `Moved ${user.username} to class ${cls.class_name_amharic}`, ipAddress: ip
        });
        return updated;
    }

    // ─── Leader Promotion ───────────────────────────────────────────
    async promoteLeader(adminId: string, targetId: string, body: PromoteLeaderInput, ip?: string) {
        const user = await adminRepository.findUserById(targetId);
        if (!user) throw new NotFoundError('User not found');

        const cls = await db.serviceClass.findUnique({ where: { id: body.classID } });
        if (!cls) throw new NotFoundError('Service class not found');

        const updatedUser = await adminRepository.updateUser(targetId, {
            role: 'SERVICE_MANAGER',
            serviceClassID: body.classID,
        });

        await adminRepository.logActivity({
            actorID: adminId, actionType: 'PROMOTE_LEADER',
            targetUserID: targetId,
            description: `${user.username} promoted to SERVICE_MANAGER of ${cls.class_name_amharic}`, ipAddress: ip
        });
        return updatedUser;
    }

    async demoteLeader(adminId: string, targetId: string, ip?: string) {
        const user = await adminRepository.findUserById(targetId);
        if (!user) throw new NotFoundError('User not found');
        if (user.role !== 'SERVICE_MANAGER') throw new BadRequestError('User is not a SERVICE_MANAGER');

        const updatedUser = await adminRepository.updateUser(targetId, {
            role: 'MEMBER',
        });

        await adminRepository.logActivity({
            actorID: adminId, actionType: 'DEMOTE_LEADER',
            targetUserID: targetId,
            description: `${user.username} demoted to MEMBER`, ipAddress: ip
        });
        return updatedUser;
    }

    // ─── Sub-Class Management ───────────────────────────────────────
    async getSubClasses(requester: any) {
        if (requester.role === 'SERVICE_MANAGER') {
            return adminRepository.getSubClasses(requester.serviceClassID);
        }
        return adminRepository.getSubClasses();
    }

    async createSubClass(adminId: string, requester: any, body: { name: string }, ip?: string) {
        if (!requester.serviceClassID) throw new BadRequestError('You do not belong to a service class');
        
        const subClass = await adminRepository.createSubClass(requester.serviceClassID, body.name);
        
        await adminRepository.logActivity({
            actorID: adminId, actionType: 'CREATE_SUBCLASS',
            description: `Created sub-class ${body.name}`, ipAddress: ip
        });
        return subClass;
    }

    async updateSubClassRoles(adminId: string, requester: any, subClassId: string, body: any, ip?: string) {
        // Enforce same-class scope
        const subClass = await db.sub_classes.findUnique({ where: { id: subClassId } });
        if (!subClass) throw new NotFoundError('Sub-class not found');

        if (requester.role === 'SERVICE_MANAGER' && subClass.parent_class_id !== requester.serviceClassID) {
            throw new ForbiddenError('You can only modify sub-classes in your own department');
        }

        const updated = await adminRepository.updateSubClassRoles(subClassId, body);
        
        await adminRepository.logActivity({
            actorID: adminId, actionType: 'UPDATE_SUBCLASS_ROLES',
            description: `Updated roles for sub-class ${subClass.sub_class_name}`, ipAddress: ip
        });
        return updated;
    }

    // ─── Office (ፅሕፈት ቤት) ──────────────────────────────────────────
    async getOfficeData() {
        return adminRepository.getOfficeData();
    }

    async getPendingOfficeRequests() {
        return adminRepository.getPendingOfficeRequests();
    }

    async approveOfficeRequest(adminId: string, targetId: string, ip?: string) {
        const user = await adminRepository.findUserById(targetId);
        if (!user) throw new NotFoundError('User not found');

        const officeClassId = await adminRepository.getOfficeClassId();
        if (!officeClassId) throw new Error('ፅሕፈት ቤት class not found in DB');

        const updated = await adminRepository.updateUser(targetId, {
            serviceClassID: officeClassId,
            status: 'ACTIVE',
        });

        await adminRepository.logActivity({
            actorID: adminId, actionType: 'APPROVE_OFFICE',
            targetUserID: targetId,
            description: `Approved ${user.username} for ፅሕፈት ቤት`, ipAddress: ip
        });
        return updated;
    }

    async disapproveOfficeRequest(adminId: string, targetId: string, ip?: string) {
        const user = await adminRepository.findUserById(targetId);
        if (!user) throw new NotFoundError('User not found');

        const unassignedClassId = await adminRepository.getUnassignedClassId();
        if (!unassignedClassId) throw new Error('Unassigned class not found in DB');

        const updated = await adminRepository.updateUser(targetId, {
            serviceClassID: unassignedClassId,
            status: 'ACTIVE',
        });

        await adminRepository.logActivity({
            actorID: adminId, actionType: 'DISAPPROVE_OFFICE',
            targetUserID: targetId,
            description: `Disapproved ${user.username} for ፅሕፈት ቤት, moved to Unassigned`, ipAddress: ip
        });
        return updated;
    }

    // ─── Chairman Role Management ───────────────────────────────────────
    async assignRole(adminId: string, requester: any, body: { targetUserId: string; role: string; serviceClassId?: string }, ip?: string) {
        if (requester.role !== 'SECRETARIAT_CHAIRMAN' && requester.role !== 'SUPER_ADMIN') {
            throw new ForbiddenError('Only Chairman can assign executive roles');
        }

        const targetUser = await adminRepository.findUserById(body.targetUserId);
        if (!targetUser) throw new NotFoundError('Target user not found');

        const validRoles = ['SECRETARIAT_VICE', 'SECRETARIAT_SECRETARY', 'SERVICE_MANAGER'];
        if (!validRoles.includes(body.role)) {
            throw new BadRequestError('Invalid role for assignment');
        }

        const updateData: any = { role: body.role };
        if (body.role === 'SERVICE_MANAGER' && body.serviceClassId) {
            updateData.serviceClassID = body.serviceClassId;
        }

        const updated = await adminRepository.updateUser(body.targetUserId, updateData);

        await adminRepository.logActivity({
            actorID: adminId, actionType: 'ASSIGN_ROLE',
            targetUserID: body.targetUserId,
            description: `Assigned ${body.role} role to ${targetUser.username}`, ipAddress: ip
        });

        return updated;
    }

    async revokeRole(adminId: string, requester: any, targetUserId: string, ip?: string) {
        if (requester.role !== 'SECRETARIAT_CHAIRMAN' && requester.role !== 'SUPER_ADMIN') {
            throw new ForbiddenError('Only Chairman can revoke executive roles');
        }

        const targetUser = await adminRepository.findUserById(targetUserId);
        if (!targetUser) throw new NotFoundError('Target user not found');

        const updated = await adminRepository.updateUser(targetUserId, { role: 'MEMBER' });

        await adminRepository.logActivity({
            actorID: adminId, actionType: 'REVOKE_ROLE',
            targetUserID: targetUserId,
            description: `Revoked executive role from ${targetUser.username}`, ipAddress: ip
        });

        return updated;
    }

    async transferChairman(currentChairmanId: string, targetUserId: string, ip?: string) {
        const currentChairman = await adminRepository.findUserById(currentChairmanId);
        if (!currentChairman) throw new NotFoundError('Current chairman not found');
        if (currentChairman.role !== 'SECRETARIAT_CHAIRMAN') {
            throw new ForbiddenError('Only current Chairman can transfer chairmanship');
        }

        const targetUser = await adminRepository.findUserById(targetUserId);
        if (!targetUser) throw new NotFoundError('Target user not found');

        // Swap roles using a transaction
        const targetPreviousRole = targetUser.role;

        await db.$transaction([
            db.user.update({
                where: { id: currentChairmanId },
                data: { system_role: targetPreviousRole === 'USER' ? 'MEMBER' : targetPreviousRole }
            }),
            db.user.update({
                where: { id: targetUserId },
                data: { system_role: 'SECRETARIAT_CHAIRMAN' }
            })
        ]);

        await adminRepository.logActivity({
            actorID: currentChairmanId, actionType: 'TRANSFER_CHAIRMAN',
            targetUserID: targetUserId,
            description: `Transferred chairmanship from ${currentChairman.username} to ${targetUser.username}`, ipAddress: ip
        });

        return { success: true, message: 'Chairmanship transferred successfully' };
    }

    // ─── Audit Logs ─────────────────────────────────────────────────────
    async getAuditLogs(query: any) {
        const { entityType, userId, limit = 50, offset = 0 } = query;

        const whereClause: any = {};
        if (entityType) whereClause.entity_type = entityType;
        if (userId) whereClause.user_id = userId;

        const logs = await db.$queryRawUnsafe(
            `SELECT * FROM audit_logs
            WHERE $1::text IS NULL OR entity_type = $1
            AND $2::text IS NULL OR user_id = $2
            ORDER BY created_at DESC
            LIMIT $3 OFFSET $4`,
            entityType || null,
            userId || null,
            parseInt(limit),
            parseInt(offset)
        );

        return logs;
    }

    // ─── Member Census ───────────────────────────────────────────────────
    async getMemberCensus() {
        const users = await db.user.findMany({
            select: {
                id: true,
                email: true,
                full_name_three_parts: true,
                system_role: true,
                service_class_id: true,
                phone_number: true,
                academic_dept: true,
                academic_year: true,
                repentance_father_id: true,
                spiritual_father_id: true,
                spiritual_mother_id: true,
                created_at: true,
                service_classes: { select: { class_name_amharic: true } }
            },
            orderBy: { created_at: 'desc' }
        });

        return users.map(u => ({
            id: u.id,
            email: u.email,
            fullName: u.full_name_three_parts,
            role: u.system_role,
            serviceClassId: u.service_class_id,
            serviceClassName: u.service_classes?.class_name_amharic,
            phoneNumber: u.phone_number,
            academicDepartment: u.academic_dept,
            academicYear: u.academic_year,
            repentanceFatherId: u.repentance_father_id,
            spiritualFatherId: u.spiritual_father_id,
            spiritualMotherId: u.spiritual_mother_id,
            createdAt: u.created_at
        }));
    }
}

export const adminService = new AdminService();
