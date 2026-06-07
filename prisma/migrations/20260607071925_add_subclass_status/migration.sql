-- CreateEnum
CREATE TYPE "sub_class_status" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "sub_classes" ADD COLUMN     "status" "sub_class_status" NOT NULL DEFAULT 'PENDING_APPROVAL';
