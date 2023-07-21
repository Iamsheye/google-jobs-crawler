/*
  Warnings:

  - You are about to drop the column `isVerified` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "isVerified",
ADD COLUMN     "isPremium" BOOLEAN NOT NULL DEFAULT false;
