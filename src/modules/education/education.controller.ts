import { Request, Response } from 'express';
import { educationService } from './education.service';

export class EducationController {
  // Batches
  async listBatches(req: Request, res: Response) {
    const { phase } = req.query;
    const batches = await educationService.listBatches(typeof phase === 'string' ? phase : undefined);
    res.json(batches);
  }
  async createBatch(req: Request, res: Response) {
    const batch = await educationService.createBatch(req.body);
    res.json(batch);
  }

  // Subjects & Lessons
  async getSubjectsWithLessons(req: Request, res: Response) {
    const { id } = req.params;
    const idStr = Array.isArray(id) ? id[0] : id;
    const userId = req.user?.userID;
    const subjects = await educationService.getSubjectsWithProgress(idStr, userId);
    res.json(subjects);
  }
  async createSubject(req: Request, res: Response) {
    const subject = await educationService.createSubject(req.body);
    res.json(subject);
  }
  async createLesson(req: Request, res: Response) {
    const lesson = await educationService.createLesson(req.body);
    res.json(lesson);
  }
  async addInlineExplanation(req: Request, res: Response) {
    const { id } = req.params;
    const idStr = Array.isArray(id) ? id[0] : id;
    const { quotedText, explanation } = req.body;
    try {
      const result = await educationService.addInlineExplanation(idStr, quotedText, explanation);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async getLessonExplanations(req: Request, res: Response) {
    const { id } = req.params;
    const idStr = Array.isArray(id) ? id[0] : id;
    const explanations = await educationService.getLessonExplanations(idStr);
    res.json(explanations);
  }

  // Exams
  async createExam(req: Request, res: Response) {
    const exam = await educationService.createExam(req.body);
    res.json(exam);
  }
  async getExam(req: Request, res: Response) {
    const { id } = req.params;
    const idStr = Array.isArray(id) ? id[0] : id;
    const exam = await educationService.getExam(idStr);
    res.json(exam);
  }
  async submitExam(req: Request, res: Response) {
    const { id } = req.params;
    const idStr = Array.isArray(id) ? id[0] : id;
    const { answers } = req.body;
    const userId = req.user!.userID;
    const result = await educationService.submitExam(idStr, userId, answers);
    res.json(result);
  }

  // Enrollments (member)
  async getMyEnrollment(req: Request, res: Response) {
    const userId = req.user!.userID;
    const { phase } = req.params;
    const phaseStr = Array.isArray(phase) ? phase[0] : phase;
    const enrollment = await educationService.getMyEnrollment(userId, phaseStr);
    res.json(enrollment);
  }
  async requestRegistration(req: Request, res: Response) {
    const userId = req.user!.userID;
    const { phase, batchId } = req.body;
    const phaseStr = Array.isArray(phase) ? phase[0] : phase;
    const batchIdStr = Array.isArray(batchId) ? batchId[0] : batchId;
    const enrollment = await educationService.requestRegistration(userId, phaseStr, batchIdStr);
    res.json(enrollment);
  }

  // Manager enrollment actions
  async getPendingEnrollments(req: Request, res: Response) {
    const pending = await educationService.getPendingEnrollments();
    res.json(pending);
  }
  async updateEnrollmentStatus(req: Request, res: Response) {
    const { id } = req.params;
    const idStr = Array.isArray(id) ? id[0] : id;
    const { status, reason } = req.body;
    const result = await educationService.updateEnrollmentStatus(idStr, status, reason);
    res.json(result);
  }
  async getEnrolledStudents(req: Request, res: Response) {
    const { batchId } = req.params;
    const batchIdStr = Array.isArray(batchId) ? batchId[0] : batchId;
    const students = await educationService.getEnrolledStudents(batchIdStr);
    res.json(students);
  }

  // Results & graduation
  async getStudentResults(req: Request, res: Response) {
    const results = await educationService.getStudentResults(req.query);
    res.json(results);
  }

  async getEducationClassMembers(req: Request, res: Response) {
    const members = await educationService.getEducationClassMembers();
    res.json(members);
  }

  async getEnrolledMembers(req: Request, res: Response) {
    const members = await educationService.getEnrolledMembers();
    res.json(members);
  }

  async markMemberGraduated(req: Request, res: Response) {
    try {
      const { memberId, phase } = req.body;
      if (!memberId || !phase) {
        return res.status(400).json({ error: 'memberId and phase are required' });
      }
      const result = await educationService.markMemberGraduated(memberId, phase);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async removeMemberGraduation(req: Request, res: Response) {
    try {
      const { memberId, phase } = req.body;
      if (!memberId || !phase) {
        return res.status(400).json({ error: 'memberId and phase are required' });
      }
      const result = await educationService.removeMemberGraduation(memberId, phase);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async getGubaePhases(req: Request, res: Response) {
    const phases = educationService.getGubaePhases();
    res.json(phases);
  }

  async overrideSubjectScore(req: Request, res: Response) {
    const { enrollmentId, subjectId } = req.params;
    const enrollmentIdStr = Array.isArray(enrollmentId) ? enrollmentId[0] : enrollmentId;
    const subjectIdStr = Array.isArray(subjectId) ? subjectId[0] : subjectId;
    const { passed, score } = req.body;
    const result = await educationService.overrideSubjectScore(enrollmentIdStr, subjectIdStr, passed, score);
    res.json(result);
  }
  async overrideExitScore(req: Request, res: Response) {
    const { enrollmentId } = req.params;
    const enrollmentIdStr = Array.isArray(enrollmentId) ? enrollmentId[0] : enrollmentId;
    const { passed, score } = req.body;
    const result = await educationService.overrideExitScore(enrollmentIdStr, passed, score);
    res.json(result);
  }
  async graduateMember(req: Request, res: Response) {
    const { id } = req.params;
    const idStr = Array.isArray(id) ? id[0] : id;
    const result = await educationService.graduateMember(idStr);
    res.json(result);
  }
  async updateExplanation(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { quotedText, explanation } = req.body;
    const idStr = Array.isArray(id) ? id[0] : id;
    const result = await educationService.updateExplanation(idStr, quotedText, explanation);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

async deleteExplanation(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const idStr = Array.isArray(id) ? id[0] : id;
    const result = await educationService.deleteExplanation(idStr);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}
}