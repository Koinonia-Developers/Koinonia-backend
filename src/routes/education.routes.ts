import { Router } from 'express';
import { EducationController } from '../modules/education/education.controller';
import { requireAuth } from '../middleware/auth';
import { requireEducationManager } from '../middleware/educationGuard';

const router = Router();
const controller = new EducationController();

router.use(requireAuth);

// ✅ Public (any authenticated user) routes
router.get('/batches', controller.listBatches);
router.get('/batches/:id/subjects', controller.getSubjectsWithLessons);
router.get('/enrollments/my/:phase', controller.getMyEnrollment);
router.post('/enrollments/request', controller.requestRegistration);
router.post('/exams/:id/submit', controller.submitExam);
router.get('/exams/:id', controller.getExam);
router.get('/phases', controller.getGubaePhases);
router.get('/lessons/:id/explanations', controller.getLessonExplanations); // ✅ Moved here

// Manager only routes (requireEducationManager)
router.use(requireEducationManager);
router.get('/class-members', controller.getEducationClassMembers);
router.get('/enrolled-members', controller.getEnrolledMembers);
router.post('/members/graduate', controller.markMemberGraduated);
router.post('/members/ungraduate', controller.removeMemberGraduation);
router.post('/batches', controller.createBatch);
router.post('/subjects', controller.createSubject);
router.post('/lessons', controller.createLesson);
router.post('/lessons/:id/explanations', controller.addInlineExplanation); // Add explanation (manager only)
router.post('/exams', controller.createExam);
router.get('/enrollments/pending', controller.getPendingEnrollments);
router.patch('/enrollments/:id', controller.updateEnrollmentStatus);
router.get('/enrollments/:batchId/students', controller.getEnrolledStudents);
router.get('/results', controller.getStudentResults);
router.post('/results/:enrollmentId/subject/:subjectId/override', controller.overrideSubjectScore);
router.post('/results/:enrollmentId/exit/override', controller.overrideExitScore);
router.post('/enrollments/:id/graduate', controller.graduateMember);
// ... inside requireEducationManager block
router.patch('/explanations/:id', controller.updateExplanation);
router.delete('/explanations/:id', controller.deleteExplanation);

export default router;