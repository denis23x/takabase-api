/*
  Warnings:

  - You are about to drop the column `redirectFromHome` on the `Settings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Settings` DROP COLUMN `redirectFromHome`,
    ADD COLUMN `pageRedirectHome` BOOLEAN NOT NULL DEFAULT true;
