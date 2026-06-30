// src/modules/auth/auth.controller.ts
import { Request, Response, NextFunction, CookieOptions } from 'express';
import { authService } from './auth.service';

// Helper to determine environment-specific cookie settings
const getCookieOptions = (): CookieOptions => {
    const isProduction = process.env.NODE_ENV === 'production';
    return {
        httpOnly: true,
        secure: isProduction, // Must be true in production
        sameSite: isProduction ? 'none' : 'lax', // 'none' is required for cross-domain (Vercel -> Render)
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    };
};

export class AuthController {
    async register(req: Request, res: Response, next: NextFunction) {
        try {
            const { user, token } = await authService.register(req.body);
            res.cookie('token', token, getCookieOptions());
            res.status(201).json({ ...user, token });
        } catch (error) {
            next(error);
        }
    }

    async login(req: Request, res: Response, next: NextFunction) {
        try {
            const { user, token } = await authService.login(req.body);
            res.cookie('token', token, getCookieOptions());
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
            // clearCookie requires the exact same domain/path/secure/sameSite flags used to set it
            const clearOptions = getCookieOptions();
            res.clearCookie('token', clearOptions);
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