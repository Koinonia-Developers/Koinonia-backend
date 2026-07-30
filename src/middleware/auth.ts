import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';

export interface JwtPayload {
    userID: string;
    role: 'USER' | 'MEMBER' | 'TEACHER' | 'SERVICE_MANAGER' | 'SECRETARIAT_SECRETARY' | 'SECRETARIAT_VICE' | 'SECRETARIAT_CHAIRMAN' | 'SUPER_ADMIN' | 'CLASS_LEADER';
    serviceClassID: string | null;
    serviceClassName?: string | null;
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
    let token = req.cookies?.token;

    if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }
    }

    if (!token) {
        return next(new UnauthorizedError('No token provided'));
    }
    try {
        const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
        req.user = decoded;
        next();
    } catch (err: any) {
        if (err.name === 'TokenExpiredError') return next(new UnauthorizedError('Token expired'));
        return next(new UnauthorizedError('Invalid token'));
    }
};

export const requireRole = (allowedRoles: Array<string>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) return next(new UnauthorizedError('Not authenticated'));
        
        const userRole = req.user.role;

        // SECRETARIAT_CHAIRMAN and SUPER_ADMIN bypass all role checks
        if (userRole === 'SECRETARIAT_CHAIRMAN' || userRole === 'SUPER_ADMIN') {
            return next();
        }

        // ✅ FIX: SERVICE_MANAGER (Education Manager) has full TEACHER privileges
        // This allows Education Managers to create, edit, submit, and delete submissions
        if (allowedRoles.includes('TEACHER') && userRole === 'SERVICE_MANAGER') {
            return next();
        }

        // Map roles for backward compatibility with the existing codebase
        const effectiveAllowed = [...allowedRoles];
        if (allowedRoles.includes('SUPER_ADMIN')) {
            effectiveAllowed.push('SECRETARIAT_VICE', 'SECRETARIAT_SECRETARY');
        }
        if (allowedRoles.includes('CLASS_LEADER')) {
            effectiveAllowed.push('SERVICE_MANAGER');
        }

        if (!effectiveAllowed.includes(userRole)) {
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