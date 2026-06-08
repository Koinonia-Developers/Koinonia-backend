-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "deleted_at" TIMESTAMPTZ(6),
ADD COLUMN     "related_entity_id" UUID,
ADD COLUMN     "type" VARCHAR(50),
ALTER COLUMN "message" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "idx_notifications_unread" ON "notifications"("user_id", "is_read");
