import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../middleware/validate';
import { loginSchema, registerSchema } from './auth.schema';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiter for login - 5 attempts per 15 minutes
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50, // Relaxed for development
    message: 'Too many login attempts, please try again after 15 minutes'
});

router.post(
    '/register',
    validate(registerSchema),
    authController.register
);

router.post(
    '/login',
    loginLimiter,
    validate(loginSchema),
    authController.login
);

export default router;
