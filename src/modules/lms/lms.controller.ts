import { Request, Response, NextFunction } from 'express';
import { lmsService } from './lms.service';

export class LMSController {
    async getBatches(req: Request, res: Response, next: NextFunction) {
        try {
            const { course_track, status, limit, offset } = req.query;
            const result = await lmsService.getBatches({
                course_track: course_track as string,
                status: status as string,
                limit: limit ? Number(limit) : undefined,
                offset: offset ? Number(offset) : undefined
            });
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    async getBatchById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const batch = await lmsService.getBatchById(id as string);
            res.json(batch);
        } catch (error) {
            next(error);
        }
    }

    async getBatchEnrollments(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const enrollments = await lmsService.getBatchEnrollments(id as string);
            res.json(enrollments);
        } catch (error) {
            next(error);
        }
    }

    async getUserEnrollments(req: Request, res: Response, next: NextFunction) {
        try {
            const user = (req as any).user;
            const enrollments = await lmsService.getUserEnrollments(user.userID);
            res.json(enrollments);
        } catch (error) {
            next(error);
        }
    }
}

export const lmsController = new LMSController();
