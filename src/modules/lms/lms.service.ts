import { lmsRepository } from './lms.repository';
import { NotFoundError } from '../../utils/errors';

export class LMSService {
    private repo = lmsRepository;

    async getBatches(query: { course_track?: string; status?: string; limit?: number; offset?: number }) {
        const limit = query.limit ? parseInt(query.limit.toString()) : 10;
        const offset = query.offset ? parseInt(query.offset.toString()) : 0;

        const filters: { course_track?: string; status?: string } = {};
        if (query.course_track) filters.course_track = query.course_track;
        if (query.status) filters.status = query.status;

        return this.repo.getBatches(filters, limit, offset);
    }

    async getBatchById(id: string) {
        const batch = await this.repo.getBatchById(id);
        if (!batch) throw new NotFoundError('Batch not found');
        return batch;
    }

    async getBatchEnrollments(batchId: string) {
        const batch = await this.repo.getBatchById(batchId);
        if (!batch) throw new NotFoundError('Batch not found');
        return this.repo.getEnrollmentsByBatch(batchId);
    }

    async getUserEnrollments(userId: string) {
        return this.repo.getUserEnrollments(userId);
    }
}

export const lmsService = new LMSService();
