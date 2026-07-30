import { Request, Response, NextFunction } from 'express';
import { courseSubmissionsService } from './course-submissions.service';
import { 
    CreateSubmissionInput,
    UpdateSubmissionInput,
    ListSubmissionsQuery,
    ReviewSubmissionInput,
    PublishSubmissionInput
} from './course-submissions.schema';

export class CourseSubmissionsController {
    // POST /submissions
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const user = req.user!;
            const data = req.body as CreateSubmissionInput;
            const result = await courseSubmissionsService.create(user, data);
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    }

    // GET /submissions
    async list(req: Request, res: Response, next: NextFunction) {
        try {
            const user = req.user!;
            const query = req.query as unknown as ListSubmissionsQuery;
            const result = await courseSubmissionsService.list(user, query);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    // GET /submissions/:id
    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const user = req.user!;
            const id = req.params.id as string; // ✅ Cast to string
            const result = await courseSubmissionsService.getById(user, id);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    // PUT /submissions/:id
    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const user = req.user!;
            const id = req.params.id as string; // ✅ Cast to string
            const data = req.body as UpdateSubmissionInput;
            const result = await courseSubmissionsService.update(user, id, data);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    // PATCH /submissions/:id/submit
    async submit(req: Request, res: Response, next: NextFunction) {
        try {
            const user = req.user!;
            const id = req.params.id as string; // ✅ Cast to string
            const result = await courseSubmissionsService.submit(user, id);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    // PATCH /submissions/:id/review
    async review(req: Request, res: Response, next: NextFunction) {
        try {
            const user = req.user!;
            const id = req.params.id as string; // ✅ Cast to string
            const data = req.body as ReviewSubmissionInput;
            const result = await courseSubmissionsService.review(user, id, data);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    // PATCH /submissions/:id/publish
    async publish(req: Request, res: Response, next: NextFunction) {
        try {
            const user = req.user!;
            const id = req.params.id as string; // ✅ Cast to string
            const data = req.body as PublishSubmissionInput;
            const result = await courseSubmissionsService.publish(user, id, data);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    // DELETE /submissions/:id
    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const user = req.user!;
            const id = req.params.id as string; // ✅ Cast to string
            const result = await courseSubmissionsService.delete(user, id);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }
}

export const courseSubmissionsController = new CourseSubmissionsController();