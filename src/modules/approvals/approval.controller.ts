// src/modules/approvals/approval.controller.ts
import { Request, Response } from 'express';
import { approvalService } from './approval.service';

export class ApprovalController {
  /**
   * Get all pending approval requests
   * Only SECRETARIAT can access
   */
  async getPendingApprovals(req: Request, res: Response) {
    try {
      const { requestType } = req.query;
      const approvals = await approvalService.getPendingApprovals({
        requestType: requestType as string | undefined
      });
      res.json(approvals);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  /**
   * Approve a sub-class operation
   * Only SECRETARIAT can access
   */
  async approveRequest(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const approvedById = req.user?.userID;
      if (!approvedById) return res.status(401).json({ error: 'Unauthorized' });

      const { applyChanges = true } = req.body;
      const result = await approvalService.approveRequest(id, approvedById, applyChanges);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  /**
   * Reject a sub-class operation
   * Only SECRETARIAT can access
   */
  async rejectRequest(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const approvedById = req.user?.userID;
      if (!approvedById) return res.status(401).json({ error: 'Unauthorized' });

      const { rejectionReason } = req.body;
      if (!rejectionReason) {
        return res.status(400).json({ error: 'Rejection reason is required' });
      }

      const result = await approvalService.rejectRequest(id, approvedById, rejectionReason);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  /**
   * Get approval history for a sub-class
   */
  async getApprovalHistory(req: Request, res: Response) {
    try {
      const subClassId = Array.isArray(req.params.subClassId) ? req.params.subClassId[0] : req.params.subClassId;
      const history = await approvalService.getApprovalHistory(subClassId);
      res.json(history);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}

export const approvalController = new ApprovalController();
