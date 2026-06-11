import { PrismaClient } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../../utils/errors';

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
  async listMembers(filters: any) {
    const where: any = { system_role: 'MEMBER' };
    if (filters.serviceClassId) where.service_class_id = filters.serviceClassId;
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

    if (data.service_class_id !== undefined) updateData.service_class_id = data.service_class_id || null;
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
        members: { include: { user: true } },
      },
    });
  }

  async createSubClass(serviceClassId: string, data: any) {
    return prisma.sub_classes.create({
      data: {
        parent_class_id: serviceClassId,
        sub_class_name: data.sub_class_name,
        sub_chair_id: data.sub_chair_id,
        sub_secretary_id: data.sub_secretary_id,
        status: 'APPROVED',
      },
    });
  }

  async addMemberToSubClass(subClassId: string, userId: string) {
    return prisma.subClassMember.create({
      data: { sub_class_id: subClassId, user_id: userId },
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