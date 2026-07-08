-- AlterTable
ALTER TABLE "users" ADD COLUMN "emailVerificationToken" TEXT,
ADD COLUMN "emailVerificationTokenExpiry" TIMESTAMP(3);
