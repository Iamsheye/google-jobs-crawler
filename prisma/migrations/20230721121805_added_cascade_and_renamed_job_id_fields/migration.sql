/*
  Warnings:

  - You are about to drop the column `usersId` on the `job_alerts` table. All the data in the column will be lost.
  - You are about to drop the column `jobAlertsId` on the `jobs` table. All the data in the column will be lost.
  - Added the required column `userId` to the `job_alerts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `jobAlertId` to the `jobs` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "job_alerts" DROP CONSTRAINT "job_alerts_usersId_fkey";

-- DropForeignKey
ALTER TABLE "jobs" DROP CONSTRAINT "jobs_jobAlertsId_fkey";

-- AlterTable
ALTER TABLE "job_alerts" DROP COLUMN "usersId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "jobs" DROP COLUMN "jobAlertsId",
ADD COLUMN     "jobAlertId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "job_alerts" ADD CONSTRAINT "job_alerts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_jobAlertId_fkey" FOREIGN KEY ("jobAlertId") REFERENCES "job_alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
