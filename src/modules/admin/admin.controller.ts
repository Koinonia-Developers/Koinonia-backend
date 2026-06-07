import { Request, Response, NextFunction } from 'express';
import { adminService } from './admin.service';

const getIp = (req: Request): string | undefined => {
    const fwd = req.headers['x-forwarded-for'];
    if (fwd) return Array.isArray(fwd) ? fwd[0] : (fwd as string);
    return req.ip ?? (req.socket.remoteAddress as string | undefined);
};

export class AdminController {
    async getDashboardStats(req: Request, res: Response, next: NextFunction) {
        try {
            const stats = await adminService.getDashboardStats();
            res.status(200).json({ status: 'success', data: stats });
        } catch (e) { next(e); }
    }

    async getAllUsers(req: Request, res: Response, next: NextFunction) {
        try {
            const users = await adminService.getAllUsers(req.user!);
            res.status(200).json({ status: 'success', data: users });
        } catch (e) { next(e); }
    }

    async approveUser(req: Request, res: Response, next: NextFunction) {
        try {
            const user = await adminService.approveUser(req.user!.userID, req.params.id as string, getIp(req));
            res.status(200).json({ status: 'success', data: user });
        } catch (e) { next(e); }
    }

    async rejectUser(req: Request, res: Response, next: NextFunction) {
        try {
            const user = await adminService.rejectUser(req.user!.userID, req.params.id as string, getIp(req));
            res.status(200).json({ status: 'success', data: user });
        } catch (e) { next(e); }
    }

    async suspendUser(req: Request, res: Response, next: NextFunction) {
        try {
            const user = await adminService.suspendUser(req.user!.userID, req.user!, req.params.id as string, req.body, getIp(req));
            res.status(200).json({ status: 'success', data: user });
        } catch (e) { next(e); }
    }

    async promoteRole(req: Request, res: Response, next: NextFunction) {
        try {
            const user = await adminService.promoteRole(req.user!.userID, req.user!, req.params.id as string, req.body, getIp(req));
            res.status(200).json({ status: 'success', data: user });
        } catch (e) { next(e); }
    }

    async changeUserClass(req: Request, res: Response, next: NextFunction) {
        try {
            const user = await adminService.changeUserClass(req.user!.userID, req.params.id as string, req.body, getIp(req));
            res.status(200).json({ status: 'success', data: user });
        } catch (e) { next(e); }
    }

    // ─── Sub-Class Management ───────────────────────────────────────

    async getSubClasses(req: Request, res: Response, next: NextFunction) {
        try {
            const data = await adminService.getSubClasses(req.user!);
            res.status(200).json({ status: 'success', data });
        } catch (e) { next(e); }
    }

    async createSubClass(req: Request, res: Response, next: NextFunction) {
        try {
            const subClass = await adminService.createSubClass(req.user!.userID, req.user!, req.body, getIp(req));
            res.status(201).json({ status: 'success', data: subClass });
        } catch (e) { next(e); }
    }

    async updateSubClassRoles(req: Request, res: Response, next: NextFunction) {
        try {
            const updated = await adminService.updateSubClassRoles(req.user!.userID, req.user!, req.params.id as string, req.body, getIp(req));
            res.status(200).json({ status: 'success', data: updated });
        } catch (e) { next(e); }
    }

    // ─── Leader ────────────────────────────────────────────────────
    async promoteLeader(req: Request, res: Response, next: NextFunction) {
        try {
            const user = await adminService.promoteLeader(req.user!.userID, req.params.id as string, req.body, getIp(req));
            res.status(200).json({ status: 'success', data: user });
        } catch (e) { next(e); }
    }

    async demoteLeader(req: Request, res: Response, next: NextFunction) {
        try {
            const user = await adminService.demoteLeader(req.user!.userID, req.params.id as string, getIp(req));
            res.status(200).json({ status: 'success', data: user });
        } catch (e) { next(e); }
    }

    // ─── Office ────────────────────────────────────────────────────
    async getOffice(req: Request, res: Response, next: NextFunction) {
        try {
            const data = await adminService.getOfficeData();
            res.status(200).json({ status: 'success', data });
        } catch (e) { next(e); }
    }

    async getPendingOffice(req: Request, res: Response, next: NextFunction) {
        try {
            const data = await adminService.getPendingOfficeRequests();
            res.status(200).json({ status: 'success', data });
        } catch (e) { next(e); }
    }

    async approveOffice(req: Request, res: Response, next: NextFunction) {
        try {
            const user = await adminService.approveOfficeRequest(req.user!.userID, req.params.id as string, getIp(req));
            res.status(200).json({ status: 'success', data: user });
        } catch (e) { next(e); }
    }

    async disapproveOffice(req: Request, res: Response, next: NextFunction) {
        try {
            const user = await adminService.disapproveOfficeRequest(req.user!.userID, req.params.id as string, getIp(req));
            res.status(200).json({ status: 'success', data: user });
        } catch (e) { next(e); }
    }

    // ─── Chairman Role Management ───────────────────────────────────────
    async assignRole(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await adminService.assignRole(req.user!.userID, req.user!, req.body, getIp(req));
            res.status(200).json({ status: 'success', data: result });
        } catch (e) { next(e); }
    }

    async revokeRole(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await adminService.revokeRole(req.user!.userID, req.user!, req.params.id as string, getIp(req));
            res.status(200).json({ status: 'success', data: result });
        } catch (e) { next(e); }
    }

    async transferChairman(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await adminService.transferChairman(req.user!.userID, req.body.targetUserId, getIp(req));
            res.status(200).json({ status: 'success', data: result });
        } catch (e) { next(e); }
    }

    // ─── Sub-Class Approvals ─────────────────────────────────────────────
    async getPendingSubClassApprovals(req: Request, res: Response, next: NextFunction) {
        try {
            const approvals = await adminService.getPendingSubClassApprovals();
            res.status(200).json({ status: 'success', data: approvals });
        } catch (e) { next(e); }
    }

    async approveSubClass(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await adminService.approveSubClass(req.user!.userID, req.params.id as string, getIp(req));
            res.status(200).json({ status: 'success', data: result });
        } catch (e) { next(e); }
    }

    async rejectSubClass(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await adminService.rejectSubClass(req.user!.userID, req.params.id as string, getIp(req));
            res.status(200).json({ status: 'success', data: result });
        } catch (e) { next(e); }
    }

    // ─── Audit Logs ─────────────────────────────────────────────────────
    async getAuditLogs(req: Request, res: Response, next: NextFunction) {
        try {
            const logs = await adminService.getAuditLogs(req.query);
            res.status(200).json({ status: 'success', data: logs });
        } catch (e) { next(e); }
    }

    // ─── Member Census ───────────────────────────────────────────────────
    async getMemberCensus(req: Request, res: Response, next: NextFunction) {
        try {
            const census = await adminService.getMemberCensus();
            res.status(200).json({ status: 'success', data: census });
        } catch (e) { next(e); }
    }
}

export const adminController = new AdminController();
