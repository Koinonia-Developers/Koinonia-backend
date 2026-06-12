import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors';

export const requireEducationManager = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user;
  if (!user) return next(new ForbiddenError('Unauthorized'));

  // Secretariat bypass
  if (['SECRETARIAT_CHAIRMAN', 'SECRETARIAT_VICE', 'SECRETARIAT_SECRETARY', 'SUPER_ADMIN'].includes(user.role)) {
    return next();
  }

  // Must be SERVICE_MANAGER and belong to Education department
  if (user.role === 'SERVICE_MANAGER' && user.serviceClassName === 'የትምህርት ክፍል') {
    return next();
  }

  return next(new ForbiddenError('Education Manager privileges required.'));
};