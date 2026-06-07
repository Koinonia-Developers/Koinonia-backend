-- CreateEnum
CREATE TYPE "batch_status" AS ENUM ('ACTIVE', 'GRADUATED');

-- CreateEnum
CREATE TYPE "course_track" AS ENUM ('GUBAE_ABEW', 'GUBAE_HAWARYAT', 'GUBAE_ECCLESIAE');

-- CreateEnum
CREATE TYPE "document_type" AS ENUM ('TEXTBOOK', 'PAST_EXAM');

-- CreateEnum
CREATE TYPE "library_category" AS ENUM ('SPIRITUAL', 'ACADEMIC', 'OTHER');

-- CreateEnum
CREATE TYPE "reaction_type" AS ENUM ('LIKE', 'STAR');

-- CreateEnum
CREATE TYPE "submission_status" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'IMPLEMENTATION_IN_PROGRESS', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "ClericalRank" AS ENUM ('NONE', 'DEACON', 'PRIEST', 'LECTOR', 'OTHER');

-- CreateEnum
CREATE TYPE "system_role" AS ENUM ('USER', 'MEMBER', 'TEACHER', 'CLASS_LEADER', 'SERVICE_MANAGER', 'SECRETARIAT_SECRETARY', 'SECRETARIAT_VICE', 'SECRETARIAT_CHAIRMAN');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "full_name_three_parts" VARCHAR(150) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "university_id" VARCHAR(50),
    "academic_dept" VARCHAR(100),
    "academic_year" INTEGER,
    "dorm_block" VARCHAR(20),
    "dorm_room" VARCHAR(20),
    "phone_number" VARCHAR(20),
    "profile_image_url" VARCHAR(255) DEFAULT '/assets/avatar.png',
    "bio" TEXT,
    "sex" "Sex",
    "clerical_rank" "ClericalRank" NOT NULL DEFAULT 'NONE',
    "system_role" "system_role" NOT NULL DEFAULT 'USER',
    "service_class_id" UUID,
    "pending_class_id" UUID,
    "repentance_father_id" UUID,
    "repentance_deacon_id" UUID,
    "spiritual_father_id" UUID,
    "spiritual_mother_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_classes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "class_name_amharic" VARCHAR(100) NOT NULL,
    "is_public_registration" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "target_class_id" UUID,
    "author_id" UUID NOT NULL,
    "published_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "announcement_id" UUID NOT NULL,
    "parent_comment_id" UUID,
    "author_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "target_route" VARCHAR(200),
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "action" VARCHAR(50) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID,
    "old_state" JSONB,
    "new_state" JSONB,
    "ip_address" INET,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "course_submissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "teacher_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content_package" TEXT NOT NULL,
    "status" "submission_status" NOT NULL DEFAULT 'DRAFT',
    "review_feedback" TEXT,
    "implemented_page_url" VARCHAR(500),
    "submitted_at" TIMESTAMPTZ(6),
    "reviewed_at" TIMESTAMPTZ(6),
    "implemented_at" TIMESTAMPTZ(6),
    "published_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "drive_url" VARCHAR(500) NOT NULL,
    "category" "library_category" NOT NULL,
    "academic_department" VARCHAR(100),
    "academic_year" INTEGER,
    "course_id" VARCHAR(50),
    "document_type" "document_type",
    "likes" INTEGER NOT NULL DEFAULT 0,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "is_link_broken" BOOLEAN NOT NULL DEFAULT false,
    "last_checked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "library_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms_batches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "course_track" "course_track" NOT NULL,
    "batch_number" INTEGER NOT NULL,
    "status" "batch_status" NOT NULL DEFAULT 'ACTIVE',
    "academic_year" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms_enrollments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "completed_lessons" JSONB NOT NULL DEFAULT '[]',
    "quiz_scores" JSONB NOT NULL DEFAULT '{}',
    "final_exam_score" DECIMAL(5,2),
    "is_passed" BOOLEAN NOT NULL DEFAULT false,
    "certificate_hash" VARCHAR(255),
    "enrolled_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "announcement_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "reaction_type" "reaction_type" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_classes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "parent_class_id" UUID NOT NULL,
    "sub_class_name" VARCHAR(100) NOT NULL,
    "sub_chair_id" UUID,
    "sub_vice_id" UUID,
    "sub_secretary_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sub_classes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "idx_users_email" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_university_id_key" ON "users"("university_id");

-- CreateIndex
CREATE INDEX "idx_users_created_at" ON "users"("created_at");

-- CreateIndex
CREATE INDEX "idx_users_repentance_father_id" ON "users"("repentance_father_id");

-- CreateIndex
CREATE INDEX "idx_users_service_class_id" ON "users"("service_class_id");

-- CreateIndex
CREATE INDEX "idx_users_system_role" ON "users"("system_role");

-- CreateIndex
CREATE INDEX "idx_users_university_id" ON "users"("university_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_classes_class_name_amharic_key" ON "service_classes"("class_name_amharic");

-- CreateIndex
CREATE INDEX "idx_announcements_is_public_published_at" ON "announcements"("is_public", "published_at");

-- CreateIndex
CREATE INDEX "idx_announcements_target_class_id" ON "announcements"("target_class_id");

-- CreateIndex
CREATE INDEX "idx_comments_announcement_id" ON "comments"("announcement_id");

-- CreateIndex
CREATE INDEX "idx_notifications_user_id_is_read_created_at" ON "notifications"("user_id", "is_read", "created_at");

-- CreateIndex
CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "idx_audit_logs_entity" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "idx_course_submissions_batch_id_status" ON "course_submissions"("batch_id", "status");

-- CreateIndex
CREATE INDEX "idx_course_submissions_teacher_id" ON "course_submissions"("teacher_id");

-- CreateIndex
CREATE INDEX "idx_library_items_academic_department" ON "library_items"("academic_department");

-- CreateIndex
CREATE INDEX "idx_library_items_category" ON "library_items"("category");

-- CreateIndex
CREATE UNIQUE INDEX "lms_enrollments_certificate_hash_key" ON "lms_enrollments"("certificate_hash");

-- CreateIndex
CREATE INDEX "idx_lms_enrollments_batch_id" ON "lms_enrollments"("batch_id");

-- CreateIndex
CREATE INDEX "idx_lms_enrollments_is_passed" ON "lms_enrollments"("is_passed");

-- CreateIndex
CREATE INDEX "idx_lms_enrollments_user_id" ON "lms_enrollments"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "lms_enrollments_user_id_batch_id_key" ON "lms_enrollments"("user_id", "batch_id");

-- CreateIndex
CREATE INDEX "idx_reactions_announcement_id_user_id" ON "reactions"("announcement_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "reactions_announcement_id_user_id_key" ON "reactions"("announcement_id", "user_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_repentance_deacon_id_fkey" FOREIGN KEY ("repentance_deacon_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_repentance_father_id_fkey" FOREIGN KEY ("repentance_father_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_service_class_id_fkey" FOREIGN KEY ("service_class_id") REFERENCES "service_classes"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_spiritual_father_id_fkey" FOREIGN KEY ("spiritual_father_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_spiritual_mother_id_fkey" FOREIGN KEY ("spiritual_mother_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_target_class_id_fkey" FOREIGN KEY ("target_class_id") REFERENCES "service_classes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "course_submissions" ADD CONSTRAINT "course_submissions_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "lms_batches"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "course_submissions" ADD CONSTRAINT "course_submissions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "course_submissions" ADD CONSTRAINT "course_submissions_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lms_enrollments" ADD CONSTRAINT "lms_enrollments_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "lms_batches"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lms_enrollments" ADD CONSTRAINT "lms_enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sub_classes" ADD CONSTRAINT "sub_classes_parent_class_id_fkey" FOREIGN KEY ("parent_class_id") REFERENCES "service_classes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sub_classes" ADD CONSTRAINT "sub_classes_sub_chair_id_fkey" FOREIGN KEY ("sub_chair_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sub_classes" ADD CONSTRAINT "sub_classes_sub_secretary_id_fkey" FOREIGN KEY ("sub_secretary_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sub_classes" ADD CONSTRAINT "sub_classes_sub_vice_id_fkey" FOREIGN KEY ("sub_vice_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
