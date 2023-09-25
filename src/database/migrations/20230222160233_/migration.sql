/*
  Warnings:

  - You are about to drop the column `background` on the `Settings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Settings` DROP COLUMN `background`,
    ADD COLUMN `themeBackground` VARCHAR(255) NOT NULL DEFAULT 'slanted-gradient';
