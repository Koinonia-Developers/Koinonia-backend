import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors';

export const requireMemberAffairsAccess = async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return next(new ForbiddenError('Unauthorized'));

    // ✅ TIER 1: Secretariat roles (absolute access - they can manage everything)
    if (['SECRETARIAT_CHAIRMAN', 'SECRETARIAT_VICE', 'SECRETARIAT_SECRETARY'].includes(user.role)) {
        return next();
    }

    // ✅ TIER 2: Member Affairs Service Manager (primary custodian)
    if (user.role === 'SERVICE_MANAGER' && user.serviceClassName === 'የአባልነት ጉዳይ ክፍል') {
        return next();
    }

    // ✅ TIER 3: Any SERVICE_MANAGER can read, but cannot write (for development/cross-dept visibility)
    // Remove this in production and uncomment the strict version below
    if (user.role === 'SERVICE_MANAGER') {
        // Allow GET requests (read operations) for all service managers
        if (req.method === 'GET') {
            return next();
        }
        // Only Member Affairs SERVICE_MANAGER can write
        return next(new ForbiddenError('Only Member Affairs Service Manager can modify data.'));
    }

    return next(new ForbiddenError('Access denied. Member Affairs privileges required. Required role: SERVICE_MANAGER or SECRETARIAT.'));
};