// src/modules/member-affairs/member-affairs.service.ts
import { Request, Response, NextFunction } from 'express';
import { membershipService } from './membership.service';
import { JwtPayload } from '../../middleware/auth';
import { db } from '../../config/db';
import { ForbiddenError } from '../../utils/errors';

async function verifyMemberAffairsLock(user: JwtPayload) {
    if (user.role === 'SERVICE_MANAGER') {
        if (!user.serviceClassID) {
            throw new ForbiddenError('Service class ID is required for SERVICE_MANAGER');
        }
        const cls = await db.serviceClass.findUnique({ where: { id: user.serviceClassID } });
        if (cls?.class_name_amharic !== 'አባላት ጉዳይ ክፍል') {
            throw new ForbiddenError('Only the Member Affairs Manager can access this queue');
        }
    }
}

export class MembershipController {

    // POST /apply — user submits membership application
    async apply(req: Request, res: Response, next: NextFunction) {
        try {
            const user = (req as any).user as JwtPayload;
            const result = await membershipService.apply(user.userID, req.body);
            res.status(200).json(result);
        } catch (e) {
            next(e);
        }
    }

    // GET /pending — list users awaiting membership approval
    async getPendingApplications(req: Request, res: Response, next: NextFunction) {
        try {
            await verifyMemberAffairsLock((req as any).user);
            const data = await membershipService.getPendingApplications();
            res.status(200).json({ status: 'success', data });
        } catch (e) {
            next(e);
        }
    }

    // GET /pending-class — list users who are members but await class assignment
    async getPendingClassAssignments(req: Request, res: Response, next: NextFunction) {
        try {
            await verifyMemberAffairsLock((req as any).user);
            const data = await membershipService.getPendingClassAssignments();
            res.status(200).json({ status: 'success', data });
        } catch (e) {
            next(e);
        }
    }

    // PATCH /:id/approve — upgrade to MEMBER, optional: confirm class
    async approveMembership(req: Request, res: Response, next: NextFunction) {
        try {
            await verifyMemberAffairsLock((req as any).user);
            const admin = (req as any).user as JwtPayload;
            await membershipService.approveMembership(admin.userID, req.params.id as string);
            res.status(200).json({ status: 'success', message: 'Membership approved' });
        } catch (e) {
            next(e);
        }
    }

    // PATCH /:id/reject — reject application entirely
    async rejectMembership(req: Request, res: Response, next: NextFunction) {
        try {
            await verifyMemberAffairsLock((req as any).user);
            const admin = (req as any).user as JwtPayload;
            await membershipService.rejectMembership(admin.userID, req.params.id as string, req.body.reason);
            res.status(200).json({ status: 'success', message: 'Membership application rejected' });
        } catch (e) {
            next(e);
        }
    }

    // PATCH /:id/confirm-class — confirm class assignment
    async confirmClassAssignment(req: Request, res: Response, next: NextFunction) {
        try {
            await verifyMemberAffairsLock((req as any).user);
            const admin = (req as any).user as JwtPayload;
            await membershipService.confirmClassAssignment(admin.userID, req.params.id as string);
            res.status(200).json({ status: 'success', message: 'Class assignment confirmed' });
        } catch (e) {
            next(e);
        }
    }

    // PATCH /:id/reject-class — clear pending_class_id
    async rejectClassAssignment(req: Request, res: Response, next: NextFunction) {
        try {
            await verifyMemberAffairsLock((req as any).user);
            const admin = (req as any).user as JwtPayload;
            await membershipService.rejectClassAssignment(admin.userID, req.params.id as string, req.body.reason);
            res.status(200).json({ status: 'success', message: 'Class assignment rejected' });
        } catch (e) {
            next(e);
        }
    }
}

export const membershipController = new MembershipController();
