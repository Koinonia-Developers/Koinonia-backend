import { Router } from 'express';
import { EducationController } from './education.controller';
import { requireAuth } from '../../middleware/auth';
import { requireEducationManager } from '../../middleware/educationGuard';

const router = Router();
const controller = new EducationController();

// Public (member) routes – require auth
router.use(requireAuth);
router.get('/batches', controller.listBatches);
router.get('/batches/:id/subjects', controller.getSubjectsWithLessons);
router.get('/enrollments/my/:phase', controller.getMyEnrollment);
router.post('/enrollments/request', controller.requestRegistration);
router.post('/exams/:id/submit', controller.submitExam);
router.get('/exams/:id', controller.getExam);

// Manager only routes
router.use(requireEducationManager);
router.post('/batches', controller.createBatch);
router.post('/subjects', controller.createSubject);
router.post('/lessons', controller.createLesson);
router.post('/lessons/:id/explanations', controller.addInlineExplanation);
router.post('/exams', controller.createExam);
router.get('/enrollments/pending', controller.getPendingEnrollments);
router.patch('/enrollments/:id', controller.updateEnrollmentStatus);
router.get('/enrollments/:batchId/students', controller.getEnrolledStudents);
router.get('/results', controller.getStudentResults);
router.post('/results/:enrollmentId/subject/:subjectId/override', controller.overrideSubjectScore);
router.post('/results/:enrollmentId/exit/override', controller.overrideExitScore);
router.post('/enrollments/:id/graduate', controller.graduateMember);

export default router;