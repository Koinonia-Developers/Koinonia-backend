-- AlterTable
ALTER TABLE "users" ADD COLUMN     "approved_at" TIMESTAMPTZ(6),
ADD COLUMN     "approved_by" UUID,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "preferred_class_id" UUID,
ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "verification_status" VARCHAR(20) DEFAULT 'PENDING_REVIEW';

-- CreateTable
CREATE TABLE "sub_class_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sub_class_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sub_class_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "department_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_class_id" UUID NOT NULL,
    "document_type" VARCHAR(20) NOT NULL,
    "title" VARCHAR(200),
    "description" TEXT,
    "drive_url" VARCHAR(500) NOT NULL,
    "academic_year" INTEGER,
    "quarter" INTEGER,
    "uploaded_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "department_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "member_id" UUID NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "performed_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sub_class_members_sub_class_id_user_id_key" ON "sub_class_members"("sub_class_id", "user_id");

-- CreateIndex
CREATE INDEX "department_documents_service_class_id_document_type_idx" ON "department_documents"("service_class_id", "document_type");

-- CreateIndex
CREATE INDEX "membership_audit_logs_member_id_idx" ON "membership_audit_logs"("member_id");

-- CreateIndex
CREATE INDEX "membership_audit_logs_created_at_idx" ON "membership_audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "users_verification_status_idx" ON "users"("verification_status");

-- CreateIndex
CREATE INDEX "users_preferred_class_id_idx" ON "users"("preferred_class_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_preferred_class_id_fkey" FOREIGN KEY ("preferred_class_id") REFERENCES "service_classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_class_members" ADD CONSTRAINT "sub_class_members_sub_class_id_fkey" FOREIGN KEY ("sub_class_id") REFERENCES "sub_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_class_members" ADD CONSTRAINT "sub_class_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_documents" ADD CONSTRAINT "department_documents_service_class_id_fkey" FOREIGN KEY ("service_class_id") REFERENCES "service_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_documents" ADD CONSTRAINT "department_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_audit_logs" ADD CONSTRAINT "membership_audit_logs_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_audit_logs" ADD CONSTRAINT "membership_audit_logs_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
