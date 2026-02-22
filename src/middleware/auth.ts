import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';

export interface JwtPayload {
    userID: string;
    role: 'MEMBER' | 'CLASS_LEADER' | 'SUPER_ADMIN';
    serviceClassID: string;
    classLeaderOf?: string | null;
    status: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new UnauthorizedError('No token provided'));
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
        req.user = decoded;
        next();
    } catch (err: any) {
        if (err.name === 'TokenExpiredError') return next(new UnauthorizedError('Token expired'));
        return next(new UnauthorizedError('Invalid token'));
    }
};

export const requireRole = (allowedRoles: Array<'MEMBER' | 'CLASS_LEADER' | 'SUPER_ADMIN'>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) return next(new UnauthorizedError('Not authenticated'));
        if (!allowedRoles.includes(req.user.role)) {
            return next(new ForbiddenError(`Requires one of roles: ${allowedRoles.join(', ')}`));
        }
        next();
    };
};

export const requireActiveStatus = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return next(new UnauthorizedError('Not authenticated'));
    if (req.user.status === 'SUSPENDED') {
        return next(new ForbiddenError('Account is suspended'));
    }
    if (req.user.status === 'PENDING') {
        return next(new ForbiddenError('Account is pending approval'));
    }
    if (req.user.status === 'PENDING_OFFICE_APPROVAL') {
        return next(new ForbiddenError('Account is pending office approval'));
    }
    next();
};
