import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';

export class AuthController {
    async register(req: Request, res: Response, next: NextFunction) {
        try {
            const { user, token } = await authService.register(req.body);
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });
            res.status(201).json({ ...user, token });
        } catch (error) {
            next(error);
        }
    }

    async login(req: Request, res: Response, next: NextFunction) {
        try {
            const { user, token } = await authService.login(req.body);
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });
            res.status(200).json({
                id: user.id,
                system_role: user.system_role,
                token: token
            });
        } catch (error) {
            next(error);
        }
    }

    async logout(req: Request, res: Response, next: NextFunction) {
        try {
            res.clearCookie('token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
            });
            res.status(200).send();
        } catch (error) {
            next(error);
        }
    }

    async getCurrentUser(req: Request, res: Response, next: NextFunction) {
        try {
            const userID = (req as any).user?.userID;
            if (!userID) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            
            const user = await authService.getUserById(userID);
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            
            res.status(200).json(user);
        } catch (error) {
            next(error);
        }
    }

    async updateProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const userID = (req as any).user?.userID;
            if (!userID) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            
            const user = await authService.updateProfile(userID, req.body);
            res.status(200).json({ data: user });
        } catch (error) {
            next(error);
        }
    }
}

export const authController = new AuthController();
