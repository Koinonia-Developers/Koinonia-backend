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
            const users = await adminService.getAllUsers();
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
            const user = await adminService.suspendUser(req.user!.userID, req.params.id as string, req.body, getIp(req));
            res.status(200).json({ status: 'success', data: user });
        } catch (e) { next(e); }
    }

    async promoteRole(req: Request, res: Response, next: NextFunction) {
        try {
            const user = await adminService.promoteRole(req.user!.userID, req.params.id as string, req.body, getIp(req));
            res.status(200).json({ status: 'success', data: user });
        } catch (e) { next(e); }
    }

    async changeUserClass(req: Request, res: Response, next: NextFunction) {
        try {
            const user = await adminService.changeUserClass(req.user!.userID, req.params.id as string, req.body, getIp(req));
            res.status(200).json({ status: 'success', data: user });
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
}

export const adminController = new AdminController();
