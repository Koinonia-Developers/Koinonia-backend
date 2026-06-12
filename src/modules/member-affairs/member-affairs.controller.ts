// src/modules/member-affairs/member-affairs.controller.ts
import { Request, Response } from 'express';
import { memberAffairsService } from './member-affairs.service';

export class MemberAffairsController {
  async getPending(req: Request, res: Response) {
    const pending = await memberAffairsService.getPendingMembers();
    res.json(pending);
  }

  async approve(req: Request, res: Response) {
    const { userId } = req.params;
    const userIdStr = Array.isArray(userId) ? userId[0] : userId;
    const { preferredClassId } = req.body;
    const adminId = req.user?.userID;  // ✅ use userID
    if (!adminId) return res.status(401).json({ error: 'Unauthorized' });
    const result = await memberAffairsService.approveMember(adminId, userIdStr, preferredClassId);
    res.json(result);
  }

  async reject(req: Request, res: Response) {
    const { userId } = req.params;
    const userIdStr = Array.isArray(userId) ? userId[0] : userId;
    const { reason } = req.body;
    const result = await memberAffairsService.rejectMember(userIdStr, reason);
    res.json(result);
  }

  async listMembers(req: Request, res: Response) {
    const accessLevel = (req as any).accessLevel;
    const userServiceClassId = (req as any).userServiceClassId;
    const members = await memberAffairsService.listMembers(req.query, accessLevel, userServiceClassId);
    res.json(members);
  }

  async getMember(req: Request, res: Response) {
    const { id } = req.params;
    const memberIdStr = Array.isArray(id) ? id[0] : id;
    const member = await memberAffairsService.getMemberById(memberIdStr);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    res.json(member);
  }

  async updateMember(req: Request, res: Response) {
    const { id } = req.params;
    const memberIdStr = Array.isArray(id) ? id[0] : id;
    const adminId = req.user?.userID;
    if (!adminId) return res.status(401).json({ error: 'Unauthorized' });
    const updated = await memberAffairsService.updateMember(adminId, memberIdStr, req.body);
    res.json(updated);
  }

  async getUnassignedSpiritual(req: Request, res: Response) {
    const unassigned = await memberAffairsService.getUnassignedSpiritual();
    res.json(unassigned);
  }

  async getSpiritualCandidates(req: Request, res: Response) {
    const { role } = req.query;
    const roleStr = Array.isArray(role) ? role[0] : role;
    const candidates = await memberAffairsService.getSpiritualCandidates(roleStr as 'priest' | 'deacon' | 'spiritual');
    res.json(candidates);
  }

  async assignSpiritual(req: Request, res: Response) {
    const { memberId } = req.params;
    const memberIdStr = Array.isArray(memberId) ? memberId[0] : memberId;
    const { role, valueId } = req.body;
    const result = await memberAffairsService.assignSpiritual(memberIdStr, role, valueId);
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
    const { serviceClassId } = req.params;
    const serviceClassIdStr = Array.isArray(serviceClassId) ? serviceClassId[0] : serviceClassId;
    const subClasses = await memberAffairsService.listSubClasses(serviceClassIdStr);
    res.json(subClasses);
  }

  async createSubClass(req: Request, res: Response) {
    try {
      const { serviceClassId } = req.params;
      const serviceClassIdStr = Array.isArray(serviceClassId) ? serviceClassId[0] : serviceClassId;
      const userId = req.user?.userID;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const bypassApproval = (req as any).bypassApproval;
      const newSubClass = await memberAffairsService.createSubClass(serviceClassIdStr, req.body, userId, bypassApproval);
      res.json(newSubClass);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
async deleteSubClass(req: Request, res: Response) {
  const { subClassId } = req.params;
  
  // Debug logging (remove after fixing)
  console.log('DELETE request params:', req.params);
  
  if (!subClassId) {
    return res.status(400).json({ error: 'Sub-class ID is required' });
  }
  
  const subClassIdStr = Array.isArray(subClassId) ? subClassId[0] : subClassId;
  const userId = req.user?.userID;
  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const result = await memberAffairsService.deleteSubClass(subClassIdStr, userId);
  res.json(result);
}

  async addMemberToSubClass(req: Request, res: Response) {
    const { subClassId } = req.params;
    const subClassIdStr = Array.isArray(subClassId) ? subClassId[0] : subClassId;
    const { userId } = req.body;
    const result = await memberAffairsService.addMemberToSubClass(subClassIdStr, userId);
    res.json(result);
  }

  async removeMemberFromSubClass(req: Request, res: Response) {
    const { subClassId, userId } = req.params;
    const subClassIdStr = Array.isArray(subClassId) ? subClassId[0] : subClassId;
    const userIdStr = Array.isArray(userId) ? userId[0] : userId;
    const result = await memberAffairsService.removeMemberFromSubClass(subClassIdStr, userIdStr);
    res.json(result);
  }

  async listDocuments(req: Request, res: Response) {
    const { serviceClassId, type } = req.params;
    const serviceClassIdStr = Array.isArray(serviceClassId) ? serviceClassId[0] : serviceClassId;
    const validType = (type === 'PLAN' || type === 'REPORT') ? type : 'PLAN';
    const docs = await memberAffairsService.listDocuments(serviceClassIdStr, validType);
    res.json(docs);
  }

  async uploadDocument(req: Request, res: Response) {
    const { serviceClassId } = req.params;
    const serviceClassIdStr = Array.isArray(serviceClassId) ? serviceClassId[0] : serviceClassId;
    const uploadedBy = req.user?.userID;
    if (!uploadedBy) return res.status(401).json({ error: 'Unauthorized' });
    const doc = await memberAffairsService.uploadDocument(serviceClassIdStr, req.body, uploadedBy);
    res.json(doc);
  }

  async deleteDocument(req: Request, res: Response) {
    const { id } = req.params;
    const docIdStr = Array.isArray(id) ? id[0] : id;
    const result = await memberAffairsService.deleteDocument(docIdStr);
    res.json(result);
  }
}