/*
  Warnings:

  - Added the required column `businessId` to the `survey_responses` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "survey_responses" ADD COLUMN     "businessId" TEXT NOT NULL;
