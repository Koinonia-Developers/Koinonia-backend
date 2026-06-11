import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors';

export const requireMemberAffairsAccess = async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return next(new ForbiddenError('Unauthorized'));

    // Secretariat and Super Admin bypass
    if (['SECRETARIAT_CHAIRMAN', 'SECRETARIAT_VICE', 'SECRETARIAT_SECRETARY', 'SUPER_ADMIN'].includes(user.role)) {
        return next();
    }

    // Must be SERVICE_MANAGER and belong to Member Affairs class
    if (user.role === 'SERVICE_MANAGER' && user.serviceClassName === 'የአባልነት ጉዳይ ክፍል') {
        return next();
    }

    return next(new ForbiddenError('Access denied. Member Affairs privileges required.'));
};