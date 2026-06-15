import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors';

export const requireMemberAffairsAccess = async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return next(new ForbiddenError('Unauthorized'));

    const role = user.role || (user as any).system_role;

    // ✅ Allowed roles: all service managers, secretariat, chairman, vice, secretary, super admin
    const allowedRoles = [
        'SERVICE_MANAGER',               // any service manager
        'SECRETARIAT_CHAIRMAN',
        'SECRETARIAT_VICE',
        'SECRETARIAT_SECRETARY',
        'SUPER_ADMIN'
    ];
    if (allowedRoles.includes(role)) {
        return next();
    }

    return next(new ForbiddenError('Access denied. Required role: SERVICE_MANAGER or SECRETARIAT.'));
};