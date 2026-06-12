// src/modules/member-affairs/member-affairs.service.ts
import { PrismaClient } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../../utils/errors';
import { approvalService } from '../approvals/approval.service';

const prisma = new PrismaClient();

export class MemberAffairsService {
  // -------------------- PENDING APPROVALS --------------------
  async getPendingMembers() {
    return prisma.user.findMany({
      where: { verification_status: 'PENDING_REVIEW', system_role: 'USER' },
      include: { service_classes: true, preferred_class: true },
      orderBy: { created_at: 'asc' },
    });
  }

  async approveMember(adminId: string, userId: string, preferredClassId?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');

    let finalClassId = preferredClassId || user.preferred_class_id;
    if (!finalClassId) {
      const defaultClass = await prisma.serviceClass.findFirst({ where: { class_name_amharic: 'General Assembly' } });
      if (!defaultClass) throw new BadRequestError('No default service class available');
      finalClassId = defaultClass.id;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        system_role: 'MEMBER',
        service_class_id: finalClassId,
        verification_status: 'APPROVED',
        approved_at: new Date(),
        approved_by: adminId,
      },
    });

    await prisma.membershipAuditLog.create({
      data: {
        member_id: userId,
        action: 'APPROVED',
        old_value: { verification_status: user.verification_status, role: user.system_role },
        new_value: { verification_status: 'APPROVED', role: 'MEMBER', service_class_id: finalClassId },
        performed_by: adminId,
      },
    });
    return updated;
  }

  async rejectMember(userId: string, reason: string) {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { verification_status: 'REJECTED', rejection_reason: reason },
    });
    await prisma.membershipAuditLog.create({
      data: {
        member_id: userId,
        action: 'REJECTED',
        old_value: { status: 'PENDING_REVIEW' },
        new_value: { status: 'REJECTED', reason },
      },
    });
    return updated;
  }

  // -------------------- MEMBER CENSUS --------------------
  async listMembers(filters: any, accessLevel?: string, userServiceClassId?: string) {
    const where: any = { system_role: 'MEMBER' };

    // Apply service class filter based on access level
    if (accessLevel === 'own-class-only' && userServiceClassId) {
      // SERVICE_MANAGER (non-Member Affairs): only own class
      where.service_class_id = userServiceClassId;
    } else if (filters.serviceClassId) {
      // Explicit filter if provided
      where.service_class_id = filters.serviceClassId;
    }
    // If 'full' or 'read-only': no service class filter (can see all)

    // ✅ Fix: parse academicYear string to integer
    if (filters.academicYear) {
      const year = parseInt(filters.academicYear, 10);
      if (!isNaN(year)) where.academic_year = year;
    }
    if (filters.department) where.academic_dept = filters.department;
    if (filters.search) {
      where.OR = [
        { full_name_three_parts: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { university_id: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    return prisma.user.findMany({
      where,
      include: { service_classes: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async getMemberById(memberId: string) {
    return prisma.user.findUnique({
      where: { id: memberId },
      include: { service_classes: true },
    });
  }

  // ✅ Fixed updateMember with proper type conversion
  async updateMember(adminId: string, memberId: string, data: any) {
    const old = await prisma.user.findUnique({ where: { id: memberId } });
    if (!old) throw new NotFoundError('Member not found');

    const updateData: any = {};

    if (data.service_class_id !== undefined) {
      updateData.service_class_id = data.service_class_id || null;
      
      // ✅ If service class is changing, clear leadership positions in sub-classes of old service class
      if (old.service_class_id && old.service_class_id !== data.service_class_id) {
        await prisma.sub_classes.updateMany({
          where: {
            parent_class_id: old.service_class_id,
            OR: [
              { sub_chair_id: memberId },
              { sub_secretary_id: memberId },
              { sub_vice_id: memberId },
            ],
          },
          data: {
            sub_chair_id: null,
            sub_secretary_id: null,
            sub_vice_id: null,
          },
        });
      }
    }
    if (data.repentance_father_id !== undefined) updateData.repentance_father_id = data.repentance_father_id || null;
    if (data.repentance_deacon_id !== undefined) updateData.repentance_deacon_id = data.repentance_deacon_id || null;
    if (data.spiritual_father_id !== undefined) updateData.spiritual_father_id = data.spiritual_father_id || null;
    if (data.spiritual_mother_id !== undefined) updateData.spiritual_mother_id = data.spiritual_mother_id || null;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;
    if (data.academic_year !== undefined) updateData.academic_year = data.academic_year ? parseInt(data.academic_year, 10) : null;
    if (data.academic_dept !== undefined) updateData.academic_dept = data.academic_dept || null;
    if (data.phone_number !== undefined) updateData.phone_number = data.phone_number || null;
    if (data.dorm_block !== undefined) updateData.dorm_block = data.dorm_block || null;
    if (data.dorm_room !== undefined) updateData.dorm_room = data.dorm_room || null;

    const updated = await prisma.user.update({
      where: { id: memberId },
      data: updateData,
    });

    await prisma.membershipAuditLog.create({
      data: {
        member_id: memberId,
        action: 'UPDATED',
        old_value: { service_class_id: old.service_class_id, repentance_father_id: old.repentance_father_id },
        new_value: { service_class_id: updated.service_class_id, repentance_father_id: updated.repentance_father_id },
        performed_by: adminId,
      },
    });
    return updated;
  }

  // -------------------- SPIRITUAL ASSIGNMENTS --------------------
  async getUnassignedSpiritual() {
    return prisma.user.findMany({
      where: {
        system_role: 'MEMBER',
        OR: [
          { repentance_father_id: null },
          { spiritual_father_id: null },
          { spiritual_mother_id: null },
        ],
      },
      include: { service_classes: true },
    });
  }

  async getSpiritualCandidates(role: 'priest' | 'deacon' | 'spiritual') {
    if (role === 'priest') {
      return prisma.user.findMany({ where: { clerical_rank: 'PRIEST', system_role: 'MEMBER' } });
    }
    if (role === 'deacon') {
      return prisma.user.findMany({ where: { clerical_rank: 'DEACON', system_role: 'MEMBER' } });
    }
    return prisma.user.findMany({ where: { system_role: 'MEMBER' } });
  }

  async assignSpiritual(memberId: string, role: string, valueId: string) {
    const updateData: any = {};
    if (role === 'repentance_father_id') updateData.repentance_father_id = valueId;
    else if (role === 'repentance_deacon_id') updateData.repentance_deacon_id = valueId;
    else if (role === 'spiritual_father_id') updateData.spiritual_father_id = valueId;
    else if (role === 'spiritual_mother_id') updateData.spiritual_mother_id = valueId;
    else throw new BadRequestError('Invalid role');
    return prisma.user.update({ where: { id: memberId }, data: updateData });
  }

  // -------------------- BATCH ASSIGNMENT --------------------
  async batchAssignClass(memberIds: string[], serviceClassId: string) {
    return prisma.user.updateMany({
      where: { id: { in: memberIds }, system_role: 'MEMBER' },
      data: { service_class_id: serviceClassId },
    });
  }

  // -------------------- SUB‑CLASS MANAGEMENT --------------------
  async listSubClasses(serviceClassId: string) {
    return prisma.sub_classes.findMany({
      where: { parent_class_id: serviceClassId, status: 'APPROVED' },
      include: {
        users_sub_classes_sub_chair_idTousers: true,
        users_sub_classes_sub_secretary_idTousers: true,
        users_sub_classes_sub_vice_idTousers: true,
        members: { include: { user: true } },
      },
    });
  }

  async createSubClass(serviceClassId: string, data: any, requestedById: string, bypassApproval: boolean = false) {
    const { sub_class_name, sub_chair_id, sub_secretary_id, sub_vice_id } = data;

    if (!sub_class_name?.trim()) {
      throw new BadRequestError('sub_class_name is required');
    }

    // ✅ Validation 1: Check for duplicate sub-class names in same service class
    const existingSubClass = await prisma.sub_classes.findFirst({
      where: {
        parent_class_id: serviceClassId,
        sub_class_name: sub_class_name.trim(),
      },
    });
    if (existingSubClass) {
      throw new BadRequestError(`Sub-class "${sub_class_name}" already exists in this service class`);
    }

    // ✅ Validation 2: Check if leader/secretary is already assigned to another sub-class in same service class
    const leaderIds = [sub_chair_id, sub_secretary_id, sub_vice_id].filter(Boolean);
    if (leaderIds.length > 0) {
      const existingLeadership = await prisma.sub_classes.findFirst({
        where: {
          parent_class_id: serviceClassId,
          OR: [
            { sub_chair_id: { in: leaderIds } },
            { sub_secretary_id: { in: leaderIds } },
            { sub_vice_id: { in: leaderIds } },
          ],
        },
      });
      if (existingLeadership) {
        throw new BadRequestError('One or more selected leaders already hold leadership positions in other sub-classes of this service class');
      }
    }

    // ✅ Validation 3: Check that leaders are members of the same service class
    const serviceClass = await prisma.serviceClass.findUnique({ where: { id: serviceClassId } });
    if (!serviceClass) throw new NotFoundError('Service class not found');

    for (const leaderId of leaderIds) {
      const leader = await prisma.user.findUnique({ where: { id: leaderId } });
      if (!leader || leader.service_class_id !== serviceClassId) {
        throw new BadRequestError(`Selected leader must be a member of ${serviceClass.class_name_amharic}`);
      }
    }

    // If SECRETARIAT, create immediately without approval
    if (bypassApproval) {
      return prisma.sub_classes.create({
        data: {
          parent_class_id: serviceClassId,
          sub_class_name: sub_class_name.trim(),
          sub_chair_id,
          sub_secretary_id,
          sub_vice_id,
          status: 'APPROVED',
        },
        include: {
          users_sub_classes_sub_chair_idTousers: true,
          users_sub_classes_sub_secretary_idTousers: true,
          users_sub_classes_sub_vice_idTousers: true,
        },
      });
    }

    // For SERVICE_MANAGER, create with PENDING_APPROVAL status and send approval request
    const subClass = await prisma.sub_classes.create({
      data: {
        parent_class_id: serviceClassId,
        sub_class_name: sub_class_name.trim(),
        status: 'PENDING_APPROVAL',
      },
      include: {
        users_sub_classes_sub_chair_idTousers: true,
        users_sub_classes_sub_secretary_idTousers: true,
        users_sub_classes_sub_vice_idTousers: true,
      },
    });

    // Send approval request to chairman
    await approvalService.requestSubClassApproval(
      'CREATE',
      subClass.id,
      requestedById,
      data
    );

    return {
      ...subClass,
      _notice: 'Sub-class created with PENDING_APPROVAL status. Chairman notification sent.',
    };
  }

  async addMemberToSubClass(subClassId: string, userId: string) {
    return prisma.subClassMember.create({
      data: { sub_class_id: subClassId, user_id: userId },
    });
  }

  // ✅ NEW: Update sub-class with validation for duplicate names and leadership
  async updateSubClass(serviceClassId: string, subClassId: string, data: any) {
    const existing = await prisma.sub_classes.findUnique({ where: { id: subClassId } });
    if (!existing) throw new NotFoundError('Sub-class not found');

    const updateData: any = {};

    // ✅ Validation: Check for duplicate sub-class names (only if name is changing)
    if (data.sub_class_name !== undefined && data.sub_class_name.trim() !== existing.sub_class_name) {
      const duplicate = await prisma.sub_classes.findFirst({
        where: {
          parent_class_id: serviceClassId,
          sub_class_name: data.sub_class_name.trim(),
          NOT: { id: subClassId },
        },
      });
      if (duplicate) {
        throw new BadRequestError(`Sub-class \"${data.sub_class_name}\" already exists in this service class`);
      }
      updateData.sub_class_name = data.sub_class_name.trim();
    }

    // ✅ Validation: Check for duplicate leadership (only if leaders are changing)
    const newLeaderIds = [
      data.sub_chair_id !== undefined ? data.sub_chair_id : existing.sub_chair_id,
      data.sub_secretary_id !== undefined ? data.sub_secretary_id : existing.sub_secretary_id,
      data.sub_vice_id !== undefined ? data.sub_vice_id : existing.sub_vice_id,
    ].filter(Boolean);

    if (data.sub_chair_id !== undefined || data.sub_secretary_id !== undefined || data.sub_vice_id !== undefined) {
      const otherLeadership = await prisma.sub_classes.findFirst({
        where: {
          parent_class_id: serviceClassId,
          NOT: { id: subClassId },
          OR: [
            { sub_chair_id: { in: newLeaderIds } },
            { sub_secretary_id: { in: newLeaderIds } },
            { sub_vice_id: { in: newLeaderIds } },
          ],
        },
      });
      if (otherLeadership) {
        throw new BadRequestError('One or more selected leaders already hold leadership positions in other sub-classes of this service class');
      }
    }

    // ✅ Validation: Check that leaders are members of same service class
    const serviceClass = await prisma.serviceClass.findUnique({ where: { id: serviceClassId } });
    if (!serviceClass) throw new NotFoundError('Service class not found');

    const leaderIds = [data.sub_chair_id, data.sub_secretary_id, data.sub_vice_id].filter(id => id !== undefined && id !== null);
    for (const leaderId of leaderIds) {
      const leader = await prisma.user.findUnique({ where: { id: leaderId } });
      if (!leader || leader.service_class_id !== serviceClassId) {
        throw new BadRequestError(`Selected leader must be a member of ${serviceClass.class_name_amharic}`);
      }
    }

    if (data.sub_chair_id !== undefined) updateData.sub_chair_id = data.sub_chair_id || null;
    if (data.sub_secretary_id !== undefined) updateData.sub_secretary_id = data.sub_secretary_id || null;
    if (data.sub_vice_id !== undefined) updateData.sub_vice_id = data.sub_vice_id || null;

    return prisma.sub_classes.update({
      where: { id: subClassId },
      data: updateData,
      include: {
        users_sub_classes_sub_chair_idTousers: true,
        users_sub_classes_sub_secretary_idTousers: true,
        users_sub_classes_sub_vice_idTousers: true,
      },
    });
  }

  async removeMemberFromSubClass(subClassId: string, userId: string) {
    return prisma.subClassMember.deleteMany({
      where: { sub_class_id: subClassId, user_id: userId },
    });
  }

  // -------------------- DEPARTMENT DOCUMENTS --------------------
  async uploadDocument(serviceClassId: string, data: any, uploadedBy: string) {
    return prisma.departmentDocument.create({
      data: {
        service_class_id: serviceClassId,
        document_type: data.document_type,
        title: data.title,
        description: data.description,
        drive_url: data.drive_url,
        academic_year: data.academic_year,
        quarter: data.quarter,
        uploaded_by: uploadedBy,
      },
    });
  }

  async listDocuments(serviceClassId: string, type: 'PLAN' | 'REPORT') {
    return prisma.departmentDocument.findMany({
      where: { service_class_id: serviceClassId, document_type: type },
      orderBy: { created_at: 'desc' },
    });
  }

  async deleteDocument(documentId: string) {
    return prisma.departmentDocument.delete({ where: { id: documentId } });
  }
}

export const memberAffairsService = new MemberAffairsService();