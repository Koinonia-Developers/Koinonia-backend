// src/modules/member-affairs/member-affairs.controller.ts
import { Request, Response } from 'express';
import { memberAffairsService } from './member-affairs.service';

// Helper to safely extract string from params/query
function getStringParam(param: unknown): string {
  if (!param) return '';
  if (typeof param === 'string') return param;
  if (Array.isArray(param)) return param.length > 0 ? String(param[0]) : '';
  return String(param);
}

export class MemberAffairsController {
  async getPending(req: Request, res: Response) {
    const pending = await memberAffairsService.getPendingMembers();
    res.json(pending);
  }

  async approve(req: Request, res: Response) {
    const userId = getStringParam(req.params.userId);
    const { preferredClassId } = req.body;
    const adminId = req.user?.userID;
    if (!adminId) return res.status(401).json({ error: 'Unauthorized' });
    const result = await memberAffairsService.approveMember(adminId, userId, preferredClassId);
    res.json(result);
  }

  async reject(req: Request, res: Response) {
    const userId = getStringParam(req.params.userId);
    const { reason } = req.body;
    const result = await memberAffairsService.rejectMember(userId, reason);
    res.json(result);
  }

  async listMembers(req: Request, res: Response) {
    const accessLevel = (req as any).accessLevel;
    const userServiceClassId = (req as any).userServiceClassId;
    const members = await memberAffairsService.listMembers(req.query, accessLevel, userServiceClassId);
    res.json(members);
  }

  async getMember(req: Request, res: Response) {
    const id = getStringParam(req.params.id);
    const member = await memberAffairsService.getMemberById(id);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    res.json(member);
  }

  async updateMember(req: Request, res: Response) {
    const id = getStringParam(req.params.id);
    const adminId = req.user?.userID;
    if (!adminId) return res.status(401).json({ error: 'Unauthorized' });
    const updated = await memberAffairsService.updateMember(adminId, id, req.body);
    res.json(updated);
  }

  async getUnassignedSpiritual(req: Request, res: Response) {
    const unassigned = await memberAffairsService.getUnassignedSpiritual();
    res.json(unassigned);
  }

  async getSpiritualCandidates(req: Request, res: Response) {
    const roleParam = req.query.role;
    const role = typeof roleParam === 'string' ? roleParam : Array.isArray(roleParam) ? roleParam[0] : '';
    const candidates = await memberAffairsService.getSpiritualCandidates(role as 'priest' | 'deacon' | 'spiritual');
    res.json(candidates);
  }

  async assignSpiritual(req: Request, res: Response) {
    const memberId = getStringParam(req.params.memberId);
    const { role, valueId } = req.body;
    const result = await memberAffairsService.assignSpiritual(memberId, role, valueId);
    res.json(result);
  }

  async batchAssign(req: Request, res: Response) {
    const { memberIds, serviceClassId } = req.body;
    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ error: 'Invalid memberIds' });
    }
    if (!serviceClassId) return res.status(400).json({ error: 'serviceClassId required' });
    const result = await memberAffairsService.batchAssignClass(memberIds, serviceClassId);
    res.json(result);
  }

  async listSubClasses(req: Request, res: Response) {
    const serviceClassId = getStringParam(req.params.serviceClassId);
    const subClasses = await memberAffairsService.listSubClasses(serviceClassId);
    res.json(subClasses);
  }

  async createSubClass(req: Request, res: Response) {
    try {
      const serviceClassId = getStringParam(req.params.serviceClassId);
      const userId = req.user?.userID;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const bypassApproval = (req as any).bypassApproval;
      const newSubClass = await memberAffairsService.createSubClass(serviceClassId, req.body, userId, bypassApproval);
      res.json(newSubClass);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async deleteSubClass(req: Request, res: Response) {
    const subClassId = getStringParam(req.params.subClassId);
    if (!subClassId) return res.status(400).json({ error: 'Sub-class ID is required' });
    const userId = req.user?.userID;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const result = await memberAffairsService.deleteSubClass(subClassId, userId);
    res.json(result);
  }

  async addMemberToSubClass(req: Request, res: Response) {
    const subClassId = getStringParam(req.params.subClassId);
    const { userId } = req.body;
    const result = await memberAffairsService.addMemberToSubClass(subClassId, userId);
    res.json(result);
  }

  async removeMemberFromSubClass(req: Request, res: Response) {
    const subClassId = getStringParam(req.params.subClassId);
    const userId = getStringParam(req.params.userId);
    const result = await memberAffairsService.removeMemberFromSubClass(subClassId, userId);
    res.json(result);
  }

  // ============ DOCUMENTS ============
  async uploadSecretariatDocument(req: Request, res: Response) {
    const uploadedBy = req.user?.userID;
    if (!uploadedBy) return res.status(401).json({ error: 'Unauthorized' });
    // Try to get system_role first, then fall back to role
    const userRole = (req.user as any)?.system_role || req.user?.role;
    if (!userRole) return res.status(400).json({ error: 'User role not found' });
    const doc = await memberAffairsService.uploadDocument(null, req.body, uploadedBy, userRole);
    res.json(doc);
  }

  async listSecretariatDocuments(req: Request, res: Response) {
    const type = req.params.type as 'PLAN' | 'REPORT';
    const userId = req.user?.userID || '';
    const userRole = req.user?.role || (req.user as any).system_role;
    const docs = await memberAffairsService.listDocuments(null, type, userId, userRole);
    res.json(docs);
  }

  async uploadDocument(req: Request, res: Response) {
    const serviceClassIdParam = req.params.serviceClassId;
    let serviceClassId: string | null = null;
    if (serviceClassIdParam && serviceClassIdParam !== 'null') {
      serviceClassId = Array.isArray(serviceClassIdParam) ? serviceClassIdParam[0] : serviceClassIdParam;
    }
    const uploadedBy = req.user?.userID;
    if (!uploadedBy) return res.status(401).json({ error: 'Unauthorized' });
    const userRole = req.user?.role || (req.user as any).system_role;
    const doc = await memberAffairsService.uploadDocument(serviceClassId, req.body, uploadedBy, userRole);
    res.json(doc);
  }

  async listDocuments(req: Request, res: Response) {
    const serviceClassIdParam = req.params.serviceClassId;
    let serviceClassId: string | null = null;
    if (serviceClassIdParam && serviceClassIdParam !== 'null') {
      serviceClassId = Array.isArray(serviceClassIdParam) ? serviceClassIdParam[0] : serviceClassIdParam;
    }
    const type = req.params.type as 'PLAN' | 'REPORT';
    const userId = req.user?.userID || '';
    const userRole = req.user?.role || (req.user as any).system_role;
    const docs = await memberAffairsService.listDocuments(serviceClassId, type, userId, userRole);
    res.json(docs);
  }

 async deleteDocument(req: Request, res: Response) {
  const id = getStringParam(req.params.id);
  const userId = req.user?.userID;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const userRole = req.user?.role || (req.user as any).system_role || '';
  const result = await memberAffairsService.deleteDocument(id, userId, userRole);
  res.json(result);
}
  async getDocument(req: Request, res: Response) {
    const id = getStringParam(req.params.id);
    const userId = req.user?.userID || '';
    const userRole = req.user?.role || '';
    const doc = await memberAffairsService.getDocumentById(id, userId, userRole);
    res.json(doc);
  }

  async approveDocument(req: Request, res: Response) {
    const id = getStringParam(req.params.id);
    const userId = req.user?.userID;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const result = await memberAffairsService.approveDocument(id, userId);
    res.json(result);
  }

  async rejectDocument(req: Request, res: Response) {
    const id = getStringParam(req.params.id);
    const { reason } = req.body;
    const userId = req.user?.userID;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const result = await memberAffairsService.rejectDocument(id, userId, reason);
    res.json(result);
  }

  // ============ COMMENTS ============
  async addComment(req: Request, res: Response) {
    const id = getStringParam(req.params.id);
    const { content, parentId } = req.body;
    const userId = req.user?.userID;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const comment = await memberAffairsService.addComment(id, userId, content, parentId);
    res.json(comment);
  }

  async deleteComment(req: Request, res: Response) {
    const commentId = getStringParam(req.params.commentId);
    const userId = req.user?.userID;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    await memberAffairsService.deleteComment(commentId, userId);
    res.status(204).send();
  }

  // ============ REACTIONS ============
  async addReaction(req: Request, res: Response) {
    const id = getStringParam(req.params.id);
    const { reactionType } = req.body;
    const userId = req.user?.userID;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const reaction = await memberAffairsService.addReaction(id, userId, reactionType);
    res.json(reaction);
  }

  async removeReaction(req: Request, res: Response) {
    const id = getStringParam(req.params.id);
    const userId = req.user?.userID;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    await memberAffairsService.removeReaction(id, userId);
    res.status(204).send();
  }

  // ============ NOTIFICATIONS ============
  async notifyChairmanOfPendingDocument(req: Request, res: Response) {
    const uploadedBy = req.user?.userID;
    if (!uploadedBy) return res.status(401).json({ error: 'Unauthorized' });
    try {
      await memberAffairsService.notifyChairmanOfPendingDocument(uploadedBy);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

async notifyDocumentApproved(req: Request, res: Response) {
  const { documentId, excludeUserId } = req.body;
  if (!documentId) {
    return res.status(400).json({ error: 'documentId is required' });
  }
  try {
    await memberAffairsService.notifyDocumentApproved(documentId, excludeUserId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}
  async notifyDocumentRejected(req: Request, res: Response) {
    const { userId, documentTitle, reason } = req.body;
    if (!userId || !documentTitle) {
      return res.status(400).json({ error: 'userId and documentTitle are required' });
    }
    try {
      await memberAffairsService.notifyDocumentRejected(userId, documentTitle, reason || '');
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async notifyCommentAdded(req: Request, res: Response) {
    const { userId, documentTitle } = req.body;
    if (!userId || !documentTitle) {
      return res.status(400).json({ error: 'userId and documentTitle are required' });
    }
    try {
      await memberAffairsService.notifyCommentAdded(userId, documentTitle);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async notifyReactionAdded(req: Request, res: Response) {
    const { userId, documentTitle } = req.body;
    if (!userId || !documentTitle) {
      return res.status(400).json({ error: 'userId and documentTitle are required' });
    }
    try {
      await memberAffairsService.notifyReactionAdded(userId, documentTitle);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
  // ============ UPDATE DOCUMENT ============
async updateDocument(req: Request, res: Response) {
  const id = getStringParam(req.params.id);
  const userId = req.user?.userID;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const userRole = req.user?.role || (req.user as any).system_role || '';
  
  const { title, description, drive_url, status } = req.body;
  const result = await memberAffairsService.updateDocument(id, userId, userRole, {
    title,
    description,
    drive_url,
    status,
  });
  res.json(result);
}
}