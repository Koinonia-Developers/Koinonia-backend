import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { Prisma } from '@prisma/client';

export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    console.error('🔥 Error Handler caught:', err);

    if (err instanceof ZodError || err.name === 'ZodError') {
        const issues = (err as any).issues ?? (err as any).errors ?? [];
        return res.status(400).json({
            status: 'fail',
            message: 'Validation Error',
            errors: issues.map((e: any) => ({ path: Array.isArray(e.path) ? e.path.join('.') : String(e.path), message: e.message }))
        });
    }

    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
        });
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
            return res.status(409).json({
                status: 'fail',
                message: 'A record with that unique field already exists.',
            });
        }
        if (err.code === 'P2025') {
            return res.status(404).json({
                status: 'fail',
                message: 'Record not found.',
            });
        }
    }

    if (err.name === 'MulterError') {
        return res.status(400).json({
            status: 'fail',
            message: err.message,
        });
    }

    return res.status(500).json({
        status: 'error',
        message: 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};
