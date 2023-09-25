/*
  Warnings:

  - Made the column `description` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `User` MODIFY `description` VARCHAR(255) NOT NULL DEFAULT 'No description';
