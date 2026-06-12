import { PrismaClient, course_track } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../../utils/errors';

const prisma = new PrismaClient();

// ✅ GBI Gubae graduation phases
const GUBAE_PHASES = ['gubae_abew', 'gubae_hawaryat', 'gubae_eclessia'];
const GUBAE_NAMES = {
  gubae_abew: 'Gubae Abew',
  gubae_hawaryat: 'Gubae Hawaryat',
  gubae_eclessia: 'Gubae Eclessia',
};

export class EducationService {
  // -------------------- BATCHES --------------------
  async listBatches(phase?: string) {
    const where: any = {};
    if (phase) where.course_track = phase;
    return prisma.lms_batches.findMany({
      where,
      orderBy: [{ course_track: 'asc' }, { batch_number: 'desc' }],
      include: { _count: { select: { lms_enrollments: true } } },
    });
  }

  async createBatch(data: { course_track: course_track; batch_number: number; academic_year: number }) {
    return prisma.lms_batches.create({ data });
  }

  // -------------------- SUBJECTS & LESSONS --------------------
  async getSubjectsWithProgress(batchId: string, userId?: string) {
    const subjects = await prisma.subject.findMany({
      where: { batchId },
      include: {
        lessons: { orderBy: { order: 'asc' } },
        exam: true,
      },
      orderBy: { order: 'asc' },
    });

    if (!userId) return subjects;

    const enrollment = await prisma.lms_enrollments.findUnique({
      where: { user_id_batch_id: { user_id: userId, batch_id: batchId } },
    });

    const progressMap = (enrollment?.quiz_scores as any) || {};
    return subjects.map(sub => ({
      ...sub,
      userProgress: progressMap[sub.id] || { passed: false, score: null },
    }));
  }

  async createSubject(data: { batchId: string; title: string; description?: string; order: number }) {
    return prisma.subject.create({ data });
  }

  // ✅ NEW: Get all members of education class to mark graduation status
  async getAllEducationMembers(accessLevel?: string, userServiceClassId?: string) {
    const where: any = { system_role: 'MEMBER' };
    
    // Get the education class service ID
    const educationClass = await prisma.serviceClass.findFirst({
      where: { class_name_amharic: 'የትምህርት ክፍል' },
    });
    
    if (!educationClass) throw new NotFoundError('Education service class not found');
    where.service_class_id = educationClass.id;

    return prisma.user.findMany({
      where,
      select: {
        id: true,
        full_name_three_parts: true,
        email: true,
        university_id: true,
        graduated_phases: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  // ✅ NEW: Mark member as graduated from a Gubae phase
  async markMemberGraduated(memberId: string, phase: string) {
    if (!GUBAE_PHASES.includes(phase)) {
      throw new BadRequestError(`Invalid phase. Must be one of: ${GUBAE_PHASES.join(', ')}`);
    }

    const user = await prisma.user.findUnique({ where: { id: memberId } });
    if (!user) throw new NotFoundError('Member not found');

    // Parse graduated_phases JSON
    let graduatedPhases: string[] = [];
    if (user.graduated_phases) {
      try {
        graduatedPhases = JSON.parse(user.graduated_phases as string);
      } catch {
        graduatedPhases = [];
      }
    }

    // Add phase if not already graduated
    if (!graduatedPhases.includes(phase)) {
      graduatedPhases.push(phase);
    }

    return prisma.user.update({
      where: { id: memberId },
      data: { graduated_phases: JSON.stringify(graduatedPhases) },
      select: {
        id: true,
        full_name_three_parts: true,
        graduated_phases: true,
      },
    });
  }

  // ✅ NEW: Remove graduation status from a phase
  async removeMemberGraduation(memberId: string, phase: string) {
    if (!GUBAE_PHASES.includes(phase)) {
      throw new BadRequestError(`Invalid phase. Must be one of: ${GUBAE_PHASES.join(', ')}`);
    }

    const user = await prisma.user.findUnique({ where: { id: memberId } });
    if (!user) throw new NotFoundError('Member not found');

    let graduatedPhases: string[] = [];
    if (user.graduated_phases) {
      try {
        graduatedPhases = JSON.parse(user.graduated_phases as string);
      } catch {
        graduatedPhases = [];
      }
    }

    // Remove phase
    graduatedPhases = graduatedPhases.filter(p => p !== phase);

    return prisma.user.update({
      where: { id: memberId },
      data: { graduated_phases: JSON.stringify(graduatedPhases) },
      select: {
        id: true,
        full_name_three_parts: true,
        graduated_phases: true,
      },
    });
  }

  // ✅ NEW: Get graduation phase names for display
  getGubaePhases() {
    return GUBAE_PHASES.map(phase => ({
      id: phase,
      name: GUBAE_NAMES[phase as keyof typeof GUBAE_NAMES],
    }));
  }

  async createLesson(data: { subjectId: string; title: string; content: string; order: number }) {
    return prisma.lesson.create({ data });
  }

  async addInlineExplanation(lessonId: string, quotedText: string, explanation: string) {
    return prisma.inlineExplanation.create({
      data: { lessonId, quotedText, explanation },
    });
  }

  // -------------------- EXAMS --------------------
  async createExam(data: any) {
    const { subjectId, batchId, title, description, questions, passingScore, isExitExam } = data;
    return prisma.exam.create({
      data: {
        subjectId,
        batchId,
        title,
        description,
        questions,
        passingScore,
        isExitExam,
      },
    });
  }

  async getExam(examId: string) {
    return prisma.exam.findUnique({ where: { id: examId } });
  }

  async submitExam(examId: string, userId: string, answers: Record<string, string>) {
    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) throw new NotFoundError('Exam not found');

    let totalPoints = 0;
    let earnedPoints = 0;
    for (const q of exam.questions as any[]) {
      totalPoints += q.points;
      if (answers[q.id] === q.correctAnswer) earnedPoints += q.points;
    }
    const score = (earnedPoints / totalPoints) * 100;
    const passed = score >= exam.passingScore;

    const enrollment = await prisma.lms_enrollments.findFirst({
      where: { user_id: userId, batch_id: exam.batchId },
    });
    if (!enrollment) throw new BadRequestError('Not enrolled in this batch');

    const quizScores = (enrollment.quiz_scores as any) || {};
    if (exam.subjectId) {
      quizScores[exam.subjectId] = { score, passed, attempts: (quizScores[exam.subjectId]?.attempts || 0) + 1 };
      await prisma.lms_enrollments.update({
        where: { id: enrollment.id },
        data: { quiz_scores: quizScores },
      });
    } else {
      await prisma.lms_enrollments.update({
        where: { id: enrollment.id },
        data: { final_exam_score: score, is_passed: passed },
      });
    }

    return { score, passed };
  }

  // -------------------- ENROLLMENTS (Member) --------------------
  async getMyEnrollment(userId: string, phase: string) {
    const batch = await prisma.lms_batches.findFirst({
      where: { course_track: phase as any },
      orderBy: { batch_number: 'desc' },
    });
    if (!batch) return null;
    return prisma.lms_enrollments.findUnique({
      where: { user_id_batch_id: { user_id: userId, batch_id: batch.id } },
    });
  }

  async requestRegistration(userId: string, phase: string, batchId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const graduatedPhases = (user?.graduated_phases as any) || [];
    const phaseOrder: Record<string, number> = { GUBAE_ABEW: 0, GUBAE_HAWARYAT: 1, GUBAE_ECCLESIAE: 2 };
    const currentLevel = phaseOrder[phase];
    if (currentLevel === undefined) {
      throw new BadRequestError('Invalid phase');
    }
    if (currentLevel > 0) {
      const prevPhase = Object.keys(phaseOrder).find(p => phaseOrder[p] === currentLevel - 1);
      if (!graduatedPhases.includes(prevPhase)) {
        throw new BadRequestError(`You must complete ${prevPhase} first.`);
      }
    }

    const existing = await prisma.lms_enrollments.findUnique({
      where: { user_id_batch_id: { user_id: userId, batch_id: batchId } },
    });
    if (existing) throw new BadRequestError('Already registered or pending.');

    return prisma.lms_enrollments.create({
      data: { user_id: userId, batch_id: batchId, status: 'PENDING' },
    });
  }

  // -------------------- MANAGER ENROLLMENT ACTIONS --------------------
  async getPendingEnrollments() {
    return prisma.lms_enrollments.findMany({
      where: { status: 'PENDING' },
      include: { users: true, lms_batches: true },
    });
  }

  async updateEnrollmentStatus(enrollmentId: string, status: string, reason?: string) {
    return prisma.lms_enrollments.update({
      where: { id: enrollmentId },
      data: { status: status as any },
    });
  }

  async getEnrolledStudents(batchId: string) {
    return prisma.lms_enrollments.findMany({
      where: { batch_id: batchId, status: 'ACTIVE' },
      include: { users: true },
    });
  }

  // -------------------- RESULTS & GRADUATION --------------------
  async getStudentResults(filters: any) {
    const where: any = {};
    if (filters.batchId) where.batch_id = filters.batchId;
    if (filters.phase) {
      const batches = await prisma.lms_batches.findMany({ where: { course_track: filters.phase as any } });
      where.batch_id = { in: batches.map(b => b.id) };
    }
    return prisma.lms_enrollments.findMany({
      where,
      include: { users: true, lms_batches: true },
    });
  }

  async overrideSubjectScore(enrollmentId: string, subjectId: string, passed: boolean, score?: number) {
    const enrollment = await prisma.lms_enrollments.findUnique({ where: { id: enrollmentId } });
    if (!enrollment) throw new NotFoundError('Enrollment not found');
    const quizScores = (enrollment.quiz_scores as any) || {};
    quizScores[subjectId] = { ...quizScores[subjectId], passed, score, overridden: true };
    return prisma.lms_enrollments.update({
      where: { id: enrollmentId },
      data: { quiz_scores: quizScores },
    });
  }

  async overrideExitScore(enrollmentId: string, passed: boolean, score?: number) {
    return prisma.lms_enrollments.update({
      where: { id: enrollmentId },
      data: { final_exam_score: score, is_passed: passed },
    });
  }

  async graduateMember(enrollmentId: string) {
    const enrollment = await prisma.lms_enrollments.findUnique({
      where: { id: enrollmentId },
      include: { lms_batches: true, users: true },
    });
    if (!enrollment) throw new NotFoundError('Enrollment not found');
    if (!enrollment.is_passed) throw new BadRequestError('Member has not passed exit exam');

    const phase = enrollment.lms_batches.course_track;
    const user = enrollment.users;
    const graduatedPhases = (user.graduated_phases as any) || [];
    if (!graduatedPhases.includes(phase)) {
      graduatedPhases.push(phase);
      await prisma.user.update({
        where: { id: user.id },
        data: { graduated_phases: graduatedPhases },
      });
    }
    return prisma.lms_enrollments.update({
      where: { id: enrollmentId },
      data: { status: 'GRADUATED' },
    });
  }
}

export const educationService = new EducationService();