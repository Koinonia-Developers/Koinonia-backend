import { db } from '../../config/db';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../utils/errors';
import { JwtPayload } from '../../middleware/auth';
import { 
    CreateSubmissionInput, 
    UpdateSubmissionInput, 
    ListSubmissionsQuery,
    ReviewSubmissionInput,
    PublishSubmissionInput
} from './course-submissions.schema';

export class CourseSubmissionsService {
    // ─── Helpers ──────────────────────────────────────────────────
    
    private isEducationManager(user: JwtPayload): boolean {
        return user.role === 'SERVICE_MANAGER' && 
               user.serviceClassName === 'የትምህርት ክፍል';
    }

    private canModify(user: JwtPayload, submissionTeacherId: string): boolean {
        return user.userID === submissionTeacherId || this.isEducationManager(user);
    }

    private async getSubmissionById(id: string) {
        const submission = await db.course_submissions.findUnique({
            where: { id },
            include: {
                lms_batches: {
                    select: { 
                        id: true, 
                        course_track: true, 
                        batch_number: true, 
                        academic_year: true, 
                        status: true 
                    }
                },
                users_course_submissions_teacher_idTousers: {
                    select: { id: true, full_name_three_parts: true, email: true, profile_image_url: true }
                },
                users_course_submissions_created_byTousers: {
                    select: { id: true, full_name_three_parts: true, email: true, profile_image_url: true }
                }
            }
        });

        if (!submission) {
            throw new NotFoundError('Submission not found');
        }

        return submission;
    }

    // ─── CREATE ────────────────────────────────────────────────────

    async create(user: JwtPayload, data: CreateSubmissionInput) {
        // Validate batch exists
        const batch = await db.lms_batches.findUnique({
            where: { id: data.batch_id }
        });

        if (!batch) {
            throw new NotFoundError('Batch not found');
        }

        const status = data.submit_immediately ? 'SUBMITTED' : 'DRAFT';

        const submission = await db.course_submissions.create({
            data: {
                teacher_id: user.userID,
                created_by: user.userID,
                batch_id: data.batch_id,
                title: data.title,
                content_package: data.content_package,
                status: status,
                submitted_at: data.submit_immediately ? new Date() : null,
            },
            include: {
                lms_batches: {
                    select: { 
                        id: true, 
                        course_track: true, 
                        batch_number: true, 
                        academic_year: true, 
                        status: true 
                    }
                }
            }
        });

        return submission;
    }

    // ─── LIST ──────────────────────────────────────────────────────

    async list(user: JwtPayload, query: ListSubmissionsQuery) {
        // ✅ FIX: Parse page and limit as numbers
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 20;
        const skip = (page - 1) * limit;

        const { batch_id, status, teacher_id } = query;

        // Check roles explicitly
        const isEducationManager = this.isEducationManager(user);
        const isTeacher = user.role === 'TEACHER';

        // Build where clause
        const where: any = {};

        // Apply filters
        if (batch_id) where.batch_id = batch_id;
        if (status) where.status = status;

        // Data scoping:
        // - Education Managers can see ALL submissions (optionally filtered by teacher_id)
        // - Teachers see only their OWN submissions
        if (isEducationManager && teacher_id) {
            where.teacher_id = teacher_id;
        } else if (isTeacher && !isEducationManager) {
            where.teacher_id = user.userID;
        } else if (!isTeacher && !isEducationManager) {
            // User has NO access to submissions
            return {
                data: [],
                total: 0,
                page,
                limit,
                totalPages: 0
            };
        }

        // Fetch submissions
        const [data, total] = await Promise.all([
            db.course_submissions.findMany({
                where,
                include: {
                    lms_batches: {
                        select: { 
                            id: true, 
                            course_track: true, 
                            batch_number: true, 
                            academic_year: true, 
                            status: true 
                        }
                    },
                    users_course_submissions_teacher_idTousers: {
                        select: { id: true, full_name_three_parts: true, email: true, profile_image_url: true }
                    }
                },
                orderBy: { updated_at: 'desc' },
                skip: skip,
                take: limit,
            }),
            db.course_submissions.count({ where })
        ]);

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }

    // ─── GET BY ID ─────────────────────────────────────────────────

    async getById(user: JwtPayload, id: string) {
        const submission = await this.getSubmissionById(id);

        // Check permissions
        const isManager = this.isEducationManager(user);
        const isOwner = submission.teacher_id === user.userID;

        if (!isManager && !isOwner) {
            throw new ForbiddenError('You do not have permission to view this submission');
        }

        return submission;
    }

    // ─── UPDATE ────────────────────────────────────────────────────

    async update(user: JwtPayload, id: string, data: UpdateSubmissionInput) {
        const submission = await this.getSubmissionById(id);

        // Check permissions
        if (!this.canModify(user, submission.teacher_id)) {
            throw new ForbiddenError('You do not have permission to update this submission');
        }

        // Only DRAFT or REJECTED can be edited
        if (submission.status !== 'DRAFT' && submission.status !== 'REJECTED') {
            throw new BadRequestError('Only draft or rejected submissions can be edited');
        }

        // Build update data
        const updateData: any = {
            updated_at: new Date(),
        };

        if (data.title !== undefined) updateData.title = data.title;
        if (data.content_package !== undefined) updateData.content_package = data.content_package;

        const updated = await db.course_submissions.update({
            where: { id },
            data: updateData,
            include: {
                lms_batches: {
                    select: { 
                        id: true, 
                        course_track: true, 
                        batch_number: true, 
                        academic_year: true, 
                        status: true 
                    }
                }
            }
        });

        return updated;
    }

    // ─── SUBMIT ────────────────────────────────────────────────────

    async submit(user: JwtPayload, id: string) {
        const submission = await this.getSubmissionById(id);

        // Check permissions
        if (!this.canModify(user, submission.teacher_id)) {
            throw new ForbiddenError('You do not have permission to submit this submission');
        }

        // Only DRAFT can be submitted
        if (submission.status !== 'DRAFT') {
            throw new BadRequestError('Only draft submissions can be submitted for review');
        }

        const updated = await db.course_submissions.update({
            where: { id },
            data: {
                status: 'SUBMITTED',
                submitted_at: new Date(),
                updated_at: new Date(),
            },
            include: {
                lms_batches: {
                    select: { 
                        id: true, 
                        course_track: true, 
                        batch_number: true, 
                        academic_year: true, 
                        status: true 
                    }
                }
            }
        });

        return updated;
    }

    // ─── REVIEW ────────────────────────────────────────────────────

    async review(user: JwtPayload, id: string, data: ReviewSubmissionInput) {
        const submission = await this.getSubmissionById(id);

        // Only Education Manager can review
        if (!this.isEducationManager(user)) {
            throw new ForbiddenError('Only Education Managers can review submissions');
        }

        // Valid status transitions
        const allowedCurrentStatuses = ['SUBMITTED', 'UNDER_REVIEW'];
        if (!allowedCurrentStatuses.includes(submission.status)) {
            throw new BadRequestError('Submission must be in SUBMITTED or UNDER_REVIEW status to review');
        }

        const updated = await db.course_submissions.update({
            where: { id },
            data: {
                status: data.status,
                review_feedback: data.review_feedback || null,
                reviewed_at: new Date(),
                updated_at: new Date(),
            },
            include: {
                lms_batches: {
                    select: { 
                        id: true, 
                        course_track: true, 
                        batch_number: true, 
                        academic_year: true, 
                        status: true 
                    }
                }
            }
        });

        return updated;
    }

    // ─── PUBLISH ───────────────────────────────────────────────────

    async publish(user: JwtPayload, id: string, data: PublishSubmissionInput) {
        const submission = await this.getSubmissionById(id);

        // Only Education Manager can publish
        if (!this.isEducationManager(user)) {
            throw new ForbiddenError('Only Education Managers can publish submissions');
        }

        // Only APPROVED can be published
        if (submission.status !== 'APPROVED') {
            throw new BadRequestError('Only approved submissions can be published');
        }

        const updateData: any = {
            status: data.status,
            updated_at: new Date(),
        };

        if (data.implemented_page_url) {
            updateData.implemented_page_url = data.implemented_page_url;
        }

        if (data.status === 'IMPLEMENTATION_IN_PROGRESS') {
            updateData.implemented_at = new Date();
        }

        if (data.status === 'PUBLISHED') {
            updateData.published_at = new Date();
            if (!submission.implemented_at) {
                updateData.implemented_at = new Date();
            }
        }

        const updated = await db.course_submissions.update({
            where: { id },
            data: updateData,
            include: {
                lms_batches: {
                    select: { 
                        id: true, 
                        course_track: true, 
                        batch_number: true, 
                        academic_year: true, 
                        status: true 
                    }
                }
            }
        });

        return updated;
    }

    // ─── DELETE ────────────────────────────────────────────────────

    async delete(user: JwtPayload, id: string) {
        const submission = await this.getSubmissionById(id);

        const isManager = this.isEducationManager(user);
        const isOwner = submission.teacher_id === user.userID;

        // Check permissions
        if (!isManager && !isOwner) {
            throw new ForbiddenError('You do not have permission to delete this submission');
        }

        // If owner (not manager), only DRAFT or REJECTED can be deleted
        if (!isManager && submission.status !== 'DRAFT' && submission.status !== 'REJECTED') {
            throw new BadRequestError('Only draft or rejected submissions can be deleted');
        }

        await db.course_submissions.delete({
            where: { id }
        });

        return { success: true };
    }
}

export const courseSubmissionsService = new CourseSubmissionsService();