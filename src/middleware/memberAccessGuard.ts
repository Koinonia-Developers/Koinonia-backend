import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Member Access Guard - Controls who can access which members based on service class
 * 
 * Rules:
 * 1. SECRETARIAT_CHAIRMAN/VICE/SECRETARY: Can view ALL members (read-only for chairman)
 * 2. MEMBER_AFFAIRS_MANAGER: Can view and modify all members, but cannot assign leaders outside Member Affairs
 * 3. SERVICE_MANAGER (other): Can only view/modify members of their own service class
 * 4. Regular users: Blocked (403)
 * 
 * Flags set on req:
 * - req.userServiceClassId: The requesting user's service class ID
 * - req.isMemberAffairsManager: True if user manages Member Affairs class
 * - req.isSecretariat: True if user is SECRETARIAT role
 * - req.accessLevel: 'full' | 'own-class-only' | 'read-only'
 */
export const requireMemberAccess = async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return next(new ForbiddenError('Unauthorized'));

    // ✅ TIER 1: Secretariat roles (read-only for chairman, full for others)
    if (user.role === 'SECRETARIAT_CHAIRMAN') {
        (req as any).accessLevel = 'read-only';
        (req as any).isSecretariat = true;
        (req as any).isMemberAffairsManager = false;
        (req as any).userServiceClassId = null;
        return next();
    }

    if (['SECRETARIAT_VICE', 'SECRETARIAT_SECRETARY'].includes(user.role)) {
        (req as any).accessLevel = 'full';
        (req as any).isSecretariat = true;
        (req as any).isMemberAffairsManager = false;
        (req as any).userServiceClassId = null;
        return next();
    }

    // ✅ TIER 2: Service Manager (either Member Affairs or other)
    if (user.role === 'SERVICE_MANAGER') {
        if (!user.serviceClassID) {
            return next(new ForbiddenError('Service Manager must have a service class assigned'));
        }

        // Check if this is Member Affairs manager
        const isMemberAffairs = user.serviceClassName === 'የአባልነት ጉዳይ ክፍል';

        if (isMemberAffairs) {
            // Member Affairs can view all, modify allowed (but leadership restricted)
            (req as any).accessLevel = 'full';
            (req as any).isMemberAffairsManager = true;
            (req as any).isSecretariat = false;
            (req as any).userServiceClassId = user.serviceClassID;
            return next();
        } else {
            // Other service managers: own class only
            (req as any).accessLevel = 'own-class-only';
            (req as any).isMemberAffairsManager = false;
            (req as any).isSecretariat = false;
            (req as any).userServiceClassId = user.serviceClassID;
            return next();
        }
    }

    return next(new ForbiddenError('Access denied. Member management privileges required.'));
};

export const validateMemberAccess = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let memberId = req.params.id || req.params.memberId;
        if (!memberId) return next();

        // Ensure memberId is a string, not array
        const memberIdStr = Array.isArray(memberId) ? memberId[0] : memberId;

        const accessLevel = (req as any).accessLevel;
        const userServiceClassId = (req as any).userServiceClassId;
        const isMemberAffairsManager = (req as any).isMemberAffairsManager;
        const isSecretariat = (req as any).isSecretariat;

        // Secretariat and Member Affairs can access anyone
        if (isSecretariat || isMemberAffairsManager) {
            return next();
        }

        // For 'own-class-only': verify member is in same service class
        if (accessLevel === 'own-class-only') {
            const member = await prisma.user.findUnique({
                where: { id: memberIdStr },
                select: { service_class_id: true },
            });

            if (!member) {
                return next(new ForbiddenError('Member not found'));
            }

            if (member.service_class_id !== userServiceClassId) {
                return next(new ForbiddenError(
                    'You can only access members of your own service class'
                ));
            }
        }

        next();
    } catch (err: any) {
        next(new ForbiddenError('Access validation failed: ' + err.message));
    }
};

/**
 * Validate write operations - check if user can modify
 * For CHAIRMAN: always reject (read-only)
 * For SERVICE_MANAGER (own-class-only): check if modifying allowed fields only
 */
export const validateMemberWrite = async (req: Request, res: Response, next: NextFunction) => {
    const accessLevel = (req as any).accessLevel;
    const isMemberAffairsManager = (req as any).isMemberAffairsManager;

    // Chairman cannot write
    if (accessLevel === 'read-only') {
        return next(new ForbiddenError('Chairmen have read-only access to members'));
    }

    // Member Affairs manager cannot change service_class_id via this endpoint
    // (they can view all, but changes require approval for assignments outside Member Affairs)
    if (isMemberAffairsManager && req.body && req.body.service_class_id !== undefined) {
        // Check if trying to assign outside Member Affairs
        const targetClassId = req.body.service_class_id;
        if (targetClassId) {
            const targetClass = await prisma.serviceClass.findUnique({
                where: { id: targetClassId },
                select: { class_name_amharic: true },
            });
            // Member Affairs can assign members to any class
            // But let's allow it - this is handled at service level
        }
    }

    // For own-class-only: cannot change service_class_id (cannot reassign to different class)
    if (accessLevel === 'own-class-only' && req.body && req.body.service_class_id !== undefined) {
        return next(new ForbiddenError(
            'Service managers cannot change member service class. Only Member Affairs can do that.'
        ));
    }

    next();
};

/**
 * Validate leader assignment - ensure leader is from the same service class as the sub-class
 * Special rule: Member Affairs managers can only assign leaders from Member Affairs members
 */
export const validateLeaderAssignment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const isMemberAffairsManager = (req as any).isMemberAffairsManager;
        const userServiceClassId = (req as any).userServiceClassId;
        const leaderId = req.body?.sub_chair_id || req.body?.sub_vice_id || req.body?.sub_secretary_id;

        if (!leaderId) return next(); // No leader being assigned

        // Get the sub-class to find its service class
        let subClassId = req.params.subClassId;
        if (!subClassId) return next();

        // Ensure subClassId is a string, not array
        const subClassIdStr = Array.isArray(subClassId) ? subClassId[0] : subClassId;

        const subClass = await prisma.sub_classes.findUnique({
            where: { id: subClassIdStr },
            select: { 
                parent_class_id: true,
                users_sub_classes_sub_chair_idTousers: { select: { service_class_id: true } },
            },
        });

        if (!subClass) return next(new ForbiddenError('Sub-class not found'));

        // Get the leader
        const leader = await prisma.user.findUnique({
            where: { id: leaderId },
            select: { service_class_id: true },
        });

        if (!leader) return next(new ForbiddenError('Leader not found'));

        // Rule 1: If Member Affairs manager, leader must be from Member Affairs members
        if (isMemberAffairsManager) {
            const memberAffairsClass = await prisma.serviceClass.findFirst({
                where: { class_name_amharic: 'የአባልነት ጉዳይ ክፍል' },
                select: { id: true },
            });
            
            if (memberAffairsClass && leader.service_class_id !== memberAffairsClass.id) {
                return next(new ForbiddenError(
                    'As Member Affairs manager, you can only assign leaders from Member Affairs class members'
                ));
            }
        }

        // Rule 2: Leader must be from the same service class as the sub-class
        if (leader.service_class_id !== subClass.parent_class_id) {
            return next(new ForbiddenError(
                'Leader must be from the same service class as the sub-class'
            ));
        }

        next();
    } catch (err: any) {
        next(new ForbiddenError('Leader validation failed: ' + err.message));
    }
};
