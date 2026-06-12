-- AddForeignKey
ALTER TABLE "sub_class_approval_requests" ADD CONSTRAINT "sub_class_approval_requests_sub_class_id_fkey" FOREIGN KEY ("sub_class_id") REFERENCES "sub_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
