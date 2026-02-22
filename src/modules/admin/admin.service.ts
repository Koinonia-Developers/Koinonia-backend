import { adminRepository } from './admin.repository';
import { NotFoundError, BadRequestError } from '../../utils/errors';
import { PromoteLeaderInput, ChangeClassInput, SuspendInput, PromoteRoleInput } from './admin.schema';
import { db } from '../../config/db';

export class AdminService {
    async getDashboardStats() {
        return adminRepository.getDashboardStats();
    }

    async getAllUsers() {
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

    async suspendUser(adminId: string, targetId: string, body: SuspendInput, ip?: string) {
        const user = await adminRepository.findUserById(targetId);
        if (!user) throw new NotFoundError('User not found');
        if (user.id === adminId) throw new BadRequestError('Cannot suspend yourself');

        const updated = await adminRepository.updateUser(targetId, { status: 'SUSPENDED' });
        await adminRepository.logActivity({
            actorID: adminId, actionType: 'SUSPEND_USER',
            targetUserID: targetId, description: `Suspended ${user.username}: ${body.reason}`, ipAddress: ip
        });
        await db.warning.create({ data: { userID: targetId, issuedBy: adminId, reason: body.reason } });
        return updated;
    }

    async promoteRole(adminId: string, targetId: string, body: PromoteRoleInput, ip?: string) {
        const user = await adminRepository.findUserById(targetId);
        if (!user) throw new NotFoundError('User not found');
        if (user.id === adminId) throw new BadRequestError('Cannot change your own role');

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
            description: `Moved ${user.username} to class ${cls.name}`, ipAddress: ip
        });
        return updated;
    }

    // ─── Leader Promotion ───────────────────────────────────────────
    async promoteLeader(adminId: string, targetId: string, body: PromoteLeaderInput, ip?: string) {
        const user = await adminRepository.findUserById(targetId);
        if (!user) throw new NotFoundError('User not found');

        const cls = await db.serviceClass.findUnique({ where: { id: body.classID } });
        if (!cls) throw new NotFoundError('Service class not found');

        // Update user: role=CLASS_LEADER, classLeaderOf=classID
        const updatedUser = await adminRepository.updateUser(targetId, {
            role: 'CLASS_LEADER',
            classLeaderOf: body.classID,
        });

        // Update service_class: leaderID=userID
        await db.serviceClass.update({ where: { id: body.classID }, data: { leaderID: targetId } });

        await adminRepository.logActivity({
            actorID: adminId, actionType: 'PROMOTE_LEADER',
            targetUserID: targetId,
            description: `${user.username} promoted to CLASS_LEADER of ${cls.name}`, ipAddress: ip
        });
        return updatedUser;
    }

    async demoteLeader(adminId: string, targetId: string, ip?: string) {
        const user = await adminRepository.findUserById(targetId);
        if (!user) throw new NotFoundError('User not found');
        if (user.role !== 'CLASS_LEADER') throw new BadRequestError('User is not a CLASS_LEADER');

        // Remove from class leader spot
        if (user.classLeaderOf) {
            await db.serviceClass.update({
                where: { id: user.classLeaderOf },
                data: { leaderID: null }
            });
        }

        const updatedUser = await adminRepository.updateUser(targetId, {
            role: 'MEMBER',
            classLeaderOf: null,
        });

        await adminRepository.logActivity({
            actorID: adminId, actionType: 'DEMOTE_LEADER',
            targetUserID: targetId,
            description: `${user.username} demoted to MEMBER`, ipAddress: ip
        });
        return updatedUser;
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
}

export const adminService = new AdminService();
