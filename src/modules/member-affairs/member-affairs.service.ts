// src/modules/member-affairs/member-affairs.controller.ts
import { PrismaClient } from '@prisma/client';
import { BadRequestError, NotFoundError, ForbiddenError, UnauthorizedError } from '../../utils/errors';
import { approvalService } from '../approvals/approval.service';
import { notificationsRepository } from '../notifications/notifications.repository';

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

    // ─── NOTIFICATIONS ───
    try {
      await notificationsRepository.spawnNotification({
        userID: userId,
        actorID: adminId,
        type: 'MEMBERSHIP',
        content: `Your membership has been approved! Welcome to the Enda Eyesus fellowship.`,
        linkTarget: '/dashboard/profile',
        notificationType: 'MEMBERSHIP',
        relatedEntityId: userId,
      });

      const assignedClass = await prisma.serviceClass.findUnique({
        where: { id: finalClassId },
        include: {
          users: {
            where: { system_role: 'SERVICE_MANAGER' },
            select: { id: true },
          },
        },
      });
      if (assignedClass && assignedClass.users.length > 0) {
        const managerIds = assignedClass.users.map(u => u.id);
        await notificationsRepository.spawnBulkNotifications(managerIds, {
          actorID: adminId,
          type: 'MEMBERSHIP',
          content: `A new member (${user.full_name_three_parts}) has been assigned to your class: ${assignedClass.class_name_amharic}.`,
          linkTarget: `/dashboard/member-affairs?tab=census&class=${assignedClass.id}`,
          notificationType: 'MEMBERSHIP',
          relatedEntityId: userId,
        });
      }
    } catch (notifError) {
      console.error('Failed to send approval notifications:', notifError);
    }

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

    try {
      await notificationsRepository.spawnNotification({
        userID: userId,
        actorID: userId,
        type: 'MEMBERSHIP',
        content: `Your membership application was not approved. Reason: ${reason || 'No reason provided'}. Please contact the Member Affairs office for more details.`,
        linkTarget: '/dashboard',
        notificationType: 'MEMBERSHIP',
        relatedEntityId: userId,
      });
    } catch (notifError) {
      console.error('Failed to send rejection notification:', notifError);
    }

    return updated;
  }

  // -------------------- MEMBER CENSUS --------------------
  async listMembers(filters: any, accessLevel?: string, userServiceClassId?: string) {
    const where: any = { system_role: 'MEMBER' };

    if (accessLevel === 'own-class-only' && userServiceClassId) {
      where.service_class_id = userServiceClassId;
    } else if (filters.serviceClassId) {
      where.service_class_id = filters.serviceClassId;
    }

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

  async updateMember(adminId: string, memberId: string, data: any) {
    const old = await prisma.user.findUnique({ where: { id: memberId } });
    if (!old) throw new NotFoundError('Member not found');

    const updateData: any = {};

    if (data.service_class_id !== undefined) {
      updateData.service_class_id = data.service_class_id || null;
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
    const subClasses = await prisma.sub_classes.findMany({
      where: { parent_class_id: serviceClassId, status: 'APPROVED' },
      include: {
        users_sub_classes_sub_chair_idTousers: true,
        users_sub_classes_sub_secretary_idTousers: true,
        users_sub_classes_sub_vice_idTousers: true,
        members: { include: { user: true } },
      },
    });
    return subClasses;
  }

  private async hasSufficientGraduation(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { graduated_phases: true },
    });
    if (!user) return false;
    let phases: string[] = [];
    try {
      phases = JSON.parse(user.graduated_phases as string);
      phases = phases.map(p => p.toLowerCase());
    } catch {
      phases = [];
    }
    return phases.includes('gubae_hawaryat') || phases.includes('gubae_eclessia');
  }

  private async validateLeaderGraduation(leaderId: string, roleName: string): Promise<void> {
    const hasGraduation = await this.hasSufficientGraduation(leaderId);
    if (!hasGraduation) {
      throw new BadRequestError(`${roleName} must have completed at least Gubae Hawaryat (or higher) to be assigned as sub‑class leader.`);
    }
  }

  async createSubClass(serviceClassId: string, data: any, requestedById: string, bypassApproval: boolean = false) {
    const { sub_class_name, sub_chair_id, sub_secretary_id, sub_vice_id } = data;
    if (!sub_class_name?.trim()) throw new BadRequestError('sub_class_name is required');

    const existingSubClass = await prisma.sub_classes.findFirst({
      where: { parent_class_id: serviceClassId, sub_class_name: sub_class_name.trim() },
    });
    if (existingSubClass) throw new BadRequestError(`Sub-class "${sub_class_name}" already exists in this service class`);

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
      if (existingLeadership) throw new BadRequestError('One or more selected leaders already hold leadership positions in other sub‑classes of this service class');
    }

    const serviceClass = await prisma.serviceClass.findUnique({ where: { id: serviceClassId } });
    if (!serviceClass) throw new NotFoundError('Service class not found');

    for (const leaderId of leaderIds) {
      const leader = await prisma.user.findUnique({ where: { id: leaderId } });
      if (!leader || leader.service_class_id !== serviceClassId) {
        throw new BadRequestError(`Selected leader must be a member of ${serviceClass.class_name_amharic}`);
      }
    }

    if (sub_chair_id) await this.validateLeaderGraduation(sub_chair_id, 'Sub‑chair');
    if (sub_secretary_id) await this.validateLeaderGraduation(sub_secretary_id, 'Sub‑secretary');
    if (sub_vice_id) await this.validateLeaderGraduation(sub_vice_id, 'Sub‑vice');

    const createData: any = {
      parent_class_id: serviceClassId,
      sub_class_name: sub_class_name.trim(),
      sub_chair_id: sub_chair_id || null,
      sub_secretary_id: sub_secretary_id || null,
      sub_vice_id: sub_vice_id || null,
    };
    if (bypassApproval) createData.status = 'APPROVED';
    else createData.status = 'PENDING_APPROVAL';

    const subClass = await prisma.sub_classes.create({
      data: createData,
      include: {
        users_sub_classes_sub_chair_idTousers: true,
        users_sub_classes_sub_secretary_idTousers: true,
        users_sub_classes_sub_vice_idTousers: true,
      },
    });

    if (!bypassApproval) {
      await approvalService.requestSubClassApproval('CREATE', subClass.id, requestedById, data);
      return { ...subClass, _notice: 'Sub-class created with PENDING_APPROVAL status. Chairman notification sent.' };
    }
    return subClass;
  }

  async addMemberToSubClass(subClassId: string, userId: string) {
    return prisma.subClassMember.create({ data: { sub_class_id: subClassId, user_id: userId } });
  }

  async updateSubClass(serviceClassId: string, subClassId: string, data: any) {
    const existing = await prisma.sub_classes.findUnique({ where: { id: subClassId } });
    if (!existing) throw new NotFoundError('Sub-class not found');

    const updateData: any = {};

    if (data.sub_class_name !== undefined && data.sub_class_name.trim() !== existing.sub_class_name) {
      const duplicate = await prisma.sub_classes.findFirst({
        where: {
          parent_class_id: serviceClassId,
          sub_class_name: data.sub_class_name.trim(),
          NOT: { id: subClassId },
        },
      });
      if (duplicate) throw new BadRequestError(`Sub-class "${data.sub_class_name}" already exists in this service class`);
      updateData.sub_class_name = data.sub_class_name.trim();
    }

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
      if (otherLeadership) throw new BadRequestError('One or more selected leaders already hold leadership positions in other sub‑classes of this service class');
    }

    const serviceClass = await prisma.serviceClass.findUnique({ where: { id: serviceClassId } });
    if (!serviceClass) throw new NotFoundError('Service class not found');

    const leaderIds = [data.sub_chair_id, data.sub_secretary_id, data.sub_vice_id].filter(id => id !== undefined && id !== null);
    for (const leaderId of leaderIds) {
      const leader = await prisma.user.findUnique({ where: { id: leaderId } });
      if (!leader || leader.service_class_id !== serviceClassId) {
        throw new BadRequestError(`Selected leader must be a member of ${serviceClass.class_name_amharic}`);
      }
    }

    if (data.sub_chair_id !== undefined && data.sub_chair_id !== existing.sub_chair_id && data.sub_chair_id) {
      await this.validateLeaderGraduation(data.sub_chair_id, 'Sub‑chair');
    }
    if (data.sub_secretary_id !== undefined && data.sub_secretary_id !== existing.sub_secretary_id && data.sub_secretary_id) {
      await this.validateLeaderGraduation(data.sub_secretary_id, 'Sub‑secretary');
    }
    if (data.sub_vice_id !== undefined && data.sub_vice_id !== existing.sub_vice_id && data.sub_vice_id) {
      await this.validateLeaderGraduation(data.sub_vice_id, 'Sub‑vice');
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
    return prisma.subClassMember.deleteMany({ where: { sub_class_id: subClassId, user_id: userId } });
  }

  async deleteSubClass(subClassId: string, userId: string) {
    if (!subClassId) throw new BadRequestError('Sub-class ID is required');
    const subClass = await prisma.sub_classes.findUnique({ where: { id: subClassId }, include: { members: true } });
    if (!subClass) throw new NotFoundError('Sub-class not found');
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedError('User not found');

    const secretariatRoles = ['SECRETARIAT_CHAIRMAN', 'SECRETARIAT_VICE', 'SECRETARIAT_SECRETARY', 'SUPER_ADMIN'];
    const isSecretariat = secretariatRoles.includes(user.system_role);
    const isServiceManagerOfClass = user.system_role === 'SERVICE_MANAGER' && user.service_class_id === subClass.parent_class_id;
    if (!isSecretariat && !isServiceManagerOfClass) throw new ForbiddenError('You do not have permission to delete this sub‑class');
    if (subClass.members.length > 0) throw new BadRequestError('Cannot delete sub‑class that has members. Remove members first.');
    return prisma.sub_classes.delete({ where: { id: subClassId } });
  }

  // -------------------- DOCUMENTS --------------------
  async uploadDocument(serviceClassId: string | null, data: any, uploadedBy: string, userRole: string) {
    const secretariatRoles = ['SECRETARIAT_CHAIRMAN', 'SECRETARIAT_VICE', 'SECRETARIAT_SECRETARY'];
    const isSecretariat = secretariatRoles.includes(userRole);
    
    let finalServiceClassId: string;
    
    if (serviceClassId && serviceClassId !== '') {
      finalServiceClassId = serviceClassId;
    } else if (isSecretariat) {
      let defaultClass = await prisma.serviceClass.findFirst({
        where: { class_name_amharic: 'General Assembly' },
      });
      
      if (!defaultClass) {
        defaultClass = await prisma.serviceClass.findFirst({
          orderBy: { created_at: 'asc' },
        });
        
        if (!defaultClass) {
          defaultClass = await prisma.serviceClass.create({
            data: {
              class_name_amharic: 'General Assembly',
              is_public_registration: false,
            },
          });
        }
      }
      
      finalServiceClassId = defaultClass.id;
    } else {
      throw new BadRequestError('Service class ID is required for non-secretariat users');
    }
    
    const doc = await prisma.departmentDocument.create({
      data: {
        service_class_id: finalServiceClassId,
        document_type: data.document_type,
        title: data.title,
        description: data.description,
        drive_url: data.drive_url,
        academic_year: data.academic_year,
        quarter: data.quarter,
        uploaded_by: uploadedBy,
        status: isSecretariat ? 'APPROVED' : 'PENDING',
      },
      include: { uploader: { select: { full_name_three_parts: true } } },
    });

    if (isSecretariat) {
      // Notify everyone except the uploader
      this.notifyDocumentApproved(doc.id, uploadedBy).catch(err => console.error('Failed to notify:', err));
    }

    return doc;
  }

async listDocuments(serviceClassId: string | null, type: 'PLAN' | 'REPORT', userId: string, userRole: string) {
  const isSecretariat = ['SECRETARIAT_CHAIRMAN', 'SECRETARIAT_VICE', 'SECRETARIAT_SECRETARY', 'SUPER_ADMIN'].includes(userRole);
  const isChairman = userRole === 'SECRETARIAT_CHAIRMAN';

  let where: any = { document_type: type };

  if (isChairman || isSecretariat) {
    // Secretariat sees all documents (no filters)
  } else {
    // Service manager: see ALL APPROVED documents (cross‑class) + their own PENDING
    where.status = 'APPROVED';
    // ❌ Remove class filter – we want to see all approved docs, not just own class
    // if (serviceClassId) where.service_class_id = serviceClassId; // <-- REMOVE this
  }

  const docs = await prisma.departmentDocument.findMany({
    where,
    include: {
      uploader: { select: { full_name_three_parts: true, email: true } },
      approver: { select: { full_name_three_parts: true } },
      comments: { include: { user: { select: { full_name_three_parts: true, profile_image_url: true } } }, orderBy: { created_at: 'asc' } },
      reactions: true,
      service_class: { select: { class_name_amharic: true } },
    },
    orderBy: { created_at: 'desc' },
  });

  // If service manager, also add their own pending documents (regardless of class)
  if (!isChairman && !isSecretariat) {
    const userPending = await prisma.departmentDocument.findMany({
      where: {
        document_type: type,
        status: 'PENDING',
        uploaded_by: userId,
        // No class filter – include pending docs from any class
      },
      include: {
        uploader: { select: { full_name_three_parts: true, email: true } },
        approver: { select: { full_name_three_parts: true } },
        comments: { include: { user: { select: { full_name_three_parts: true, profile_image_url: true } } }, orderBy: { created_at: 'asc' } },
        reactions: true,
        service_class: { select: { class_name_amharic: true } },
      },
    });
    return [...userPending, ...docs];
  }

  return docs;
}

  async getDocumentById(documentId: string, userId: string, userRole: string) {
    const doc = await prisma.departmentDocument.findUnique({
      where: { id: documentId },
      include: {
        uploader: { select: { full_name_three_parts: true, email: true } },
        approver: { select: { full_name_three_parts: true } },
        comments: { include: { user: { select: { full_name_three_parts: true, profile_image_url: true } } }, orderBy: { created_at: 'asc' } },
        reactions: true,
        service_class: { select: { class_name_amharic: true } },
      },
    });
    if (!doc) throw new NotFoundError('Document not found');
    const isChairman = userRole === 'SECRETARIAT_CHAIRMAN';
    const isUploader = doc.uploaded_by === userId;
    if (!isChairman && !isUploader && doc.status !== 'APPROVED') {
      throw new ForbiddenError('You do not have permission to view this document');
    }
    return doc;
  }

  async approveDocument(documentId: string, approvedBy: string) {
    const doc = await prisma.departmentDocument.findUnique({
      where: { id: documentId },
      include: { uploader: { select: { full_name_three_parts: true } } },
    });
    if (!doc) throw new NotFoundError('Document not found');
    if (doc.status !== 'PENDING') throw new BadRequestError('Document is not pending approval');

    const updated = await prisma.departmentDocument.update({
      where: { id: documentId },
      data: { status: 'APPROVED', approved_by: approvedBy, approved_at: new Date() },
    });

    try {
      await this.notifyDocumentApproved(documentId, approvedBy);
    } catch (notifError) {
      console.error('Failed to send approval notifications:', notifError);
    }

    return updated;
  }

  async rejectDocument(documentId: string, approvedBy: string, reason: string) {
    const doc = await prisma.departmentDocument.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundError('Document not found');
    if (doc.status !== 'PENDING') throw new BadRequestError('Document is not pending approval');
    const updated = await prisma.departmentDocument.update({
      where: { id: documentId },
      data: { status: 'REJECTED', approved_by: approvedBy, approved_at: new Date(), rejection_reason: reason },
    });
    if (doc.uploaded_by) {
      await prisma.notification.create({
        data: {
          user_id: doc.uploaded_by,
          title: 'Document Rejected ❌',
          message: `Your document "${doc.title}" was rejected. Reason: ${reason}`,
          target_route: `/dashboard/member-affairs?tab=documents&type=${doc.document_type.toLowerCase()}`,
          type: 'DOCUMENT_APPROVAL',
          related_entity_id: documentId,
        },
      });
    }
    return updated;
  }

  // ============ COMMENTS ============
  async addComment(documentId: string, userId: string, content: string, parentId?: string) {
    const doc = await prisma.departmentDocument.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundError('Document not found');
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const isChairman = user?.system_role === 'SECRETARIAT_CHAIRMAN';
    const isUploader = doc.uploaded_by === userId;
    if (doc.status !== 'APPROVED' && !isChairman && !isUploader) {
      throw new ForbiddenError('Cannot comment on this document');
    }
    return prisma.documentComment.create({
      data: { document_id: documentId, user_id: userId, content, parent_id: parentId },
      include: { user: { select: { full_name_three_parts: true, profile_image_url: true } } },
    });
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await prisma.documentComment.findUnique({
      where: { id: commentId },
      include: { document: true },
    });
    if (!comment) throw new NotFoundError('Comment not found');
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const isChairman = user?.system_role === 'SECRETARIAT_CHAIRMAN';
    const isOwner = comment.user_id === userId;
    if (!isOwner && !isChairman) throw new ForbiddenError('You can only delete your own comments');
    return prisma.documentComment.delete({ where: { id: commentId } });
  }

  // ============ REACTIONS ============
  async addReaction(documentId: string, userId: string, reactionType: 'LIKE' | 'STAR') {
    const doc = await prisma.departmentDocument.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundError('Document not found');
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const isChairman = user?.system_role === 'SECRETARIAT_CHAIRMAN';
    const isUploader = doc.uploaded_by === userId;
    if (doc.status !== 'APPROVED' && !isChairman && !isUploader) {
      throw new ForbiddenError('Cannot react to this document');
    }
    return prisma.documentReaction.upsert({
      where: { document_id_user_id: { document_id: documentId, user_id: userId } },
      update: { reaction_type: reactionType },
      create: { document_id: documentId, user_id: userId, reaction_type: reactionType },
    });
  }

  async removeReaction(documentId: string, userId: string) {
    return prisma.documentReaction.delete({
      where: { document_id_user_id: { document_id: documentId, user_id: userId } },
    });
  }

  // ============ NOTIFICATION HELPERS ============
  public async notifyDocumentApproved(documentId: string, excludeUserId: string) {
    const doc = await prisma.departmentDocument.findUnique({
      where: { id: documentId },
      include: { uploader: { select: { full_name_three_parts: true } } },
    });
    if (!doc) return;

    const recipients: string[] = [];

    // 1. Service managers of this class
    const managers = await prisma.user.findMany({
      where: {
        system_role: 'SERVICE_MANAGER',
        service_class_id: doc.service_class_id,
      },
      select: { id: true },
    });
    recipients.push(...managers.map(m => m.id));

    // 2. All secretariat members
    const secretariat = await prisma.user.findMany({
      where: {
        system_role: { in: ['SECRETARIAT_CHAIRMAN', 'SECRETARIAT_VICE', 'SECRETARIAT_SECRETARY'] },
      },
      select: { id: true },
    });
    recipients.push(...secretariat.map(s => s.id));

    const uniqueRecipients = [...new Set(recipients)].filter(id => id !== excludeUserId);

    if (uniqueRecipients.length === 0) return;

    await prisma.$transaction(
      uniqueRecipients.map(userId =>
        prisma.notification.create({
          data: {
            user_id: userId,
            title: 'New Document Added 📄',
            message: `New file added by ${doc.uploader?.full_name_three_parts || 'Unknown'}: "${doc.title}"`,
            target_route: `/dashboard/member-affairs?tab=documents&type=${doc.document_type.toLowerCase()}`,
            type: 'DOCUMENT_APPROVED',
            related_entity_id: documentId,
          },
        })
      )
    );
  }

  async notifyChairmanOfPendingDocument(uploadedById: string) {
    try {
      const chairmen = await prisma.user.findMany({
        where: { system_role: 'SECRETARIAT_CHAIRMAN' },
        select: { id: true },
      });
      for (const chairman of chairmen) {
        await prisma.notification.create({
          data: {
            user_id: chairman.id,
            title: 'New Document Pending Approval',
            message: 'A new document has been uploaded and is waiting for your approval',
            type: 'DOCUMENT_PENDING',
            target_route: '/dashboard/member-affairs?tab=documents',
          },
        });
      }
    } catch (error) {
      console.error('Error notifying chairman:', error);
    }
  }

  async notifyDocumentRejected(userId: string, documentTitle: string, reason: string) {
    try {
      await prisma.notification.create({
        data: {
          user_id: userId,
          title: 'Document Rejected',
          message: `"${documentTitle}" has been rejected${reason ? `: ${reason}` : ''}`,
          type: 'DOCUMENT_REJECTED',
          target_route: '/dashboard/member-affairs?tab=documents',
        },
      });
    } catch (error) {
      console.error('Error notifying document rejection:', error);
    }
  }

  async notifyCommentAdded(userId: string, documentTitle: string) {
    try {
      await prisma.notification.create({
        data: {
          user_id: userId,
          title: 'New Comment',
          message: `Someone has commented on "${documentTitle}"`,
          type: 'COMMENT_ADDED',
          target_route: '/dashboard/member-affairs?tab=documents',
        },
      });
    } catch (error) {
      console.error('Error notifying comment:', error);
    }
  }

  async notifyReactionAdded(userId: string, documentTitle: string) {
    try {
      await prisma.notification.create({
        data: {
          user_id: userId,
          title: 'New Reaction',
          message: `Someone reacted to "${documentTitle}"`,
          type: 'REACTION_ADDED',
          target_route: '/dashboard/member-affairs?tab=documents',
        },
      });
    } catch (error) {
      console.error('Error notifying reaction:', error);
    }
  }
  // ============ UPDATE DOCUMENT ============
async updateDocument(
  documentId: string,
  userId: string,
  userRole: string,
  data: {
    title?: string;
    description?: string;
    drive_url?: string;
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  }
) {
  const doc = await prisma.departmentDocument.findUnique({ where: { id: documentId } });
  if (!doc) throw new NotFoundError('Document not found');

  const isChairman = userRole === 'SECRETARIAT_CHAIRMAN';
  const isUploader = doc.uploaded_by === userId;

  // Permission check
  if (!isChairman && !isUploader) {
    throw new ForbiddenError('You do not have permission to edit this document');
  }

  // Uploader can only edit title, description, drive_url – NOT status
  if (!isChairman && (data.status !== undefined)) {
    throw new ForbiddenError('Only the chairman can change document status');
  }

  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.drive_url !== undefined) updateData.drive_url = data.drive_url;

  // Chairman can update status and set approval fields if status changes
  if (isChairman && data.status !== undefined) {
    updateData.status = data.status;
    if (data.status === 'APPROVED') {
      updateData.approved_by = userId;
      updateData.approved_at = new Date();
    } else if (data.status === 'REJECTED') {
      // Optionally set rejection reason; we'll keep it simple
      // Could add rejection_reason in data if needed
    }
  }

  const updated = await prisma.departmentDocument.update({
    where: { id: documentId },
    data: updateData,
    include: {
      uploader: { select: { full_name_three_parts: true, email: true } },
      approver: { select: { full_name_three_parts: true } },
      service_class: { select: { class_name_amharic: true } },
    },
  });

  // If status changed to APPROVED by chairman, send notifications
  if (isChairman && data.status === 'APPROVED' && doc.status !== 'APPROVED') {
    // Notify all managers except the chairman (the approver)
    this.notifyDocumentApproved(documentId, userId).catch(err => console.error('Failed to notify:', err));
  }

  return updated;
}

// Modify deleteDocument to check permissions
async deleteDocument(documentId: string, userId: string, userRole: string) {
  const doc = await prisma.departmentDocument.findUnique({ where: { id: documentId } });
  if (!doc) throw new NotFoundError('Document not found');

  const isChairman = userRole === 'SECRETARIAT_CHAIRMAN';
  const isUploader = doc.uploaded_by === userId;

  if (!isChairman && !isUploader) {
    throw new ForbiddenError('You do not have permission to delete this document');
  }

  return prisma.departmentDocument.delete({ where: { id: documentId } });
}
}

export const memberAffairsService = new MemberAffairsService();