import { db } from '../../config/db';
import { Prisma } from '@prisma/client';

export class LMSRepository {
    async getBatches(filters: { course_track?: string; status?: string }, limit: number = 10, offset: number = 0) {
        const where: Prisma.lms_batchesWhereInput = {};
        
        if (filters.course_track) {
            where.course_track = filters.course_track as any;
        }
        
        if (filters.status) {
            where.status = filters.status as any;
        }

        const [batches, total] = await Promise.all([
            db.lms_batches.findMany({
                where,
                take: limit,
                skip: offset,
                orderBy: { created_at: 'desc' }
            }),
            db.lms_batches.count({ where })
        ]);

        return { batches, total };
    }

    async getBatchById(id: string) {
        return db.lms_batches.findUnique({
            where: { id },
            include: {
                lms_enrollments: {
                    include: {
                        users: {
                            select: {
                                id: true,
                                full_name_three_parts: true,
                                email: true,
                                profile_image_url: true
                            }
                        }
                    }
                }
            }
        });
    }

    async getEnrollmentsByBatch(batchId: string) {
        return db.lms_enrollments.findMany({
            where: { batch_id: batchId },
            include: {
                users: {
                    select: {
                        id: true,
                        full_name_three_parts: true,
                        email: true,
                        profile_image_url: true
                    }
                }
            }
        });
    }

    async getUserEnrollments(userId: string) {
        return db.lms_enrollments.findMany({
            where: { user_id: userId },
            include: {
                lms_batches: true
            }
        });
    }
}

export const lmsRepository = new LMSRepository();
