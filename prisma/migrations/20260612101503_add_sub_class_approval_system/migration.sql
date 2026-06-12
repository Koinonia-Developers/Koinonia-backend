-- CreateTable
CREATE TABLE "sub_class_approval_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sub_class_id" UUID NOT NULL,
    "request_type" VARCHAR(50) NOT NULL,
    "requested_by_id" UUID NOT NULL,
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "approved_by_id" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "rejection_reason" TEXT,
    "request_data" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sub_class_approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sub_class_approval_requests_status_idx" ON "sub_class_approval_requests"("status");

-- CreateIndex
CREATE INDEX "sub_class_approval_requests_sub_class_id_idx" ON "sub_class_approval_requests"("sub_class_id");

-- CreateIndex
CREATE INDEX "sub_class_approval_requests_requested_by_id_idx" ON "sub_class_approval_requests"("requested_by_id");

-- AddForeignKey
ALTER TABLE "sub_class_approval_requests" ADD CONSTRAINT "sub_class_approval_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_class_approval_requests" ADD CONSTRAINT "sub_class_approval_requests_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
