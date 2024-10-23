-- DropForeignKey
ALTER TABLE "job_alerts" DROP CONSTRAINT "job_alerts_userId_fkey";

-- AddForeignKey
ALTER TABLE "job_alerts" ADD CONSTRAINT "job_alerts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
