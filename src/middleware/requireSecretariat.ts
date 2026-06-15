import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors';

export const requireSecretariat = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user;
  if (!user) return next(new ForbiddenError('Unauthorized'));
  const role = user.role || (user as any).system_role;
  const secretariatRoles = ['SECRETARIAT_CHAIRMAN', 'SECRETARIAT_VICE', 'SECRETARIAT_SECRETARY', 'SUPER_ADMIN'];
  if (secretariatRoles.includes(role)) {
    return next();
  }
  return next(new ForbiddenError('Secretariat privileges required'));
};