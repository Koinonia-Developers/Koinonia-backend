import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';

export class AuthController {
    async register(req: Request, res: Response, next: NextFunction) {
        try {
            const { user, token } = await authService.register(req.body);
            res.status(201).json({
                status: 'success',
                data: { user, token }
            });
        } catch (error) {
            next(error);
        }
    }

    async login(req: Request, res: Response, next: NextFunction) {
        try {
            const { user, token } = await authService.login(req.body);
            res.status(200).json({
                status: 'success',
                data: { user, token }
            });
        } catch (error) {
            next(error);
        }
    }
}

export const authController = new AuthController();
