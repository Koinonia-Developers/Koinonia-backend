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

        const requesterRole = requester.system_role || requester.role;
        const targetRole = body.role;

        // Permission checks based on role hierarchy
        const canAssignSecretariatRoles = ['SECRETARIAT_CHAIRMAN', 'SUPER_ADMIN'].includes(requesterRole);
        const canAssignServiceManager = ['SECRETARIAT_CHAIRMAN', 'SECRETARIAT_VICE', 'SUPER_ADMIN'].includes(requesterRole);
        const canAssignTeacher = ['SECRETARIAT_CHAIRMAN', 'SECRETARIAT_VICE', 'SERVICE_MANAGER', 'SUPER_ADMIN'].includes(requesterRole);

        // Secretariat roles can only be assigned by Chairman or Super Admin
        if (['SECRETARIAT_VICE', 'SECRETARIAT_SECRETARY'].includes(targetRole) && !canAssignSecretariatRoles) {
            throw new ForbiddenError('Only the Secretariat Chairman can assign Secretariat roles');
        }

        // Service Manager can only be assigned by Chairman, Vice Chairman, or Super Admin
        if (targetRole === 'SERVICE_MANAGER' && !canAssignServiceManager) {
            throw new ForbiddenError('Only the Secretariat Chairman or Vice Chairman can assign Service Manager roles');
        }

        // Teacher role assignment with Education Manager domain lock
        if (targetRole === 'TEACHER') {
            if (!canAssignTeacher) {
                throw new ForbiddenError('You do not have permission to assign TEACHER roles');
            }
            if (requesterRole === 'SERVICE_MANAGER') {
                const requesterClass = await db.serviceClass.findUnique({ where: { id: requester.serviceClassID } });
                if (requesterClass?.class_name_amharic !== 'ትምርት ክፍል') {
                    throw new ForbiddenError('Only the Education Manager can grant TEACHER roles');
                }
            }
        }

        // Service Managers cannot arbitrarily change system roles (except for CLASS_LEADER within their class)
        if (requesterRole === 'SERVICE_MANAGER' && 
            !['CLASS_LEADER', 'TEACHER'].includes(targetRole) &&
            !canAssignSecretariatRoles) {
            throw new ForbiddenError('Service Managers can only assign CLASS_LEADER or TEACHER roles');
        }

        // Business rule: SERVICE_MANAGER must be assigned to a specific class
        if (targetRole === 'SERVICE_MANAGER' && !body.serviceClassId) {
            throw new BadRequestError('Service Manager role requires a service class assignment');
        }

        // Business rule: User must be a MEMBER to be promoted to CLASS_LEADER
        if (targetRole === 'CLASS_LEADER' && user.role !== 'MEMBER') {
            throw new BadRequestError('User must be a MEMBER before being assigned CLASS_LEADER role');
        }

        try {
            const updateData: any = { system_role: targetRole };
            if (targetRole === 'SERVICE_MANAGER' && body.serviceClassId) {
                updateData.service_class_id = body.serviceClassId;
            }

            const updated = await adminRepository.updateUser(targetId, updateData);
            await adminRepository.logActivity({
                actorID: adminId, actionType: 'PROMOTE_ROLE',
                targetUserID: targetId,
                description: `Changed ${user.username} role to ${targetRole}`, ipAddress: ip
            });

            // Notify user about role assignment
            await db.notification.create({
                data: {
                    user_id: targetId,
                    title: `Role Updated: ${targetRole}`,
                    message: `Your role has been updated to ${targetRole}.`,
                    target_route: '/dashboard/agent/roles',
                    type: 'ROLE',
                    related_entity_id: targetId
                }
            });

            return updated;
        } catch (error: any) {
            console.error('Error promoting role:', error);
            if (error.code === 'P2005') {
                throw new BadRequestError(`Invalid role value: ${targetRole}. Please ensure the role is valid.`);
            }
            throw error;
        }
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

        const subClass = await adminRepository.createSubClass(requester.serviceClassID, body.name, 'PENDING_APPROVAL');

        await adminRepository.logActivity({
            actorID: adminId, actionType: 'CREATE_SUBCLASS',
            description: `Created sub-class ${body.name} pending approval`, ipAddress: ip
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
            description: `Updated roles for sub-class ${subClass.sub_class_name} pending approval`, ipAddress: ip
        });
        return updated;
    }

    async getPendingSubClassApprovals() {
        return adminRepository.getPendingSubClassApprovals();
    }

    async approveSubClass(adminId: string, subClassId: string, ip?: string) {
        const subClass = await db.sub_classes.findUnique({ where: { id: subClassId } });
        if (!subClass) throw new NotFoundError('Sub-class not found');

        await adminRepository.approveSubClass(subClassId);

        await adminRepository.logActivity({
            actorID: adminId, actionType: 'APPROVE_SUBCLASS',
            description: `Approved sub-class ${subClass.sub_class_name}`, ipAddress: ip
        });
        return { success: true };
    }

    async rejectSubClass(adminId: string, subClassId: string, ip?: string) {
        const subClass = await db.sub_classes.findUnique({ where: { id: subClassId } });
        if (!subClass) throw new NotFoundError('Sub-class not found');

        await adminRepository.rejectSubClass(subClassId);

        await adminRepository.logActivity({
            actorID: adminId, actionType: 'REJECT_SUBCLASS',
            description: `Rejected sub-class ${subClass.sub_class_name}`, ipAddress: ip
        });
        return { success: true };
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

        // Transfer chairmanship: 
        // - Current chairman reverts to their previous role (if stored) or becomes USER
        // - New chairman becomes SECRETARIAT_CHAIRMAN, preserving their service_class_id if they had one
        await db.$transaction([
            db.user.update({
                where: { id: currentChairmanId },
                data: { 
                    system_role: 'USER',
                    service_class_id: null
                }
            }),
            db.user.update({
                where: { id: targetUserId },
                data: { 
                    system_role: 'SECRETARIAT_CHAIRMAN',
                    // Preserve service_class_id if target was a SERVICE_MANAGER
                    service_class_id: targetUser.serviceClassID
                }
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
            AND $2::uuid IS NULL OR user_id = $2::uuid
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
                dorm_block: true,
                dorm_room: true,
                sex: true,
                clerical_rank: true,
                profile_image_url: true,
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
            dormBlock: u.dorm_block,
            dormRoom: u.dorm_room,
            sex: u.sex,
            clericalRank: u.clerical_rank,
            profileImage: u.profile_image_url,
            repentanceFatherId: u.repentance_father_id,
            spiritualFatherId: u.spiritual_father_id,
            spiritualMotherId: u.spiritual_mother_id,
            createdAt: u.created_at
        }));
    }
}

export const adminService = new AdminService();
