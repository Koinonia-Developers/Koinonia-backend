import { Request, Response, NextFunction } from 'express';
import { classesService } from './classes.service';

export class ClassesController {
    async getAllClasses(req: Request, res: Response, next: NextFunction) {
        try {
            const classes = await classesService.getAllActiveClasses();
            res.status(200).json({ status: 'success', data: classes });
        } catch (error) {
            next(error);
        }
    }
}

export const classesController = new ClassesController();
