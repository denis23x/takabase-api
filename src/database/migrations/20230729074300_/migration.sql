/*
  Warnings:

  - You are about to drop the column `buttons` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the column `monospace` on the `Settings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Settings` DROP COLUMN `buttons`,
    DROP COLUMN `monospace`,
    ADD COLUMN `markdownMonospace` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `windowButtonPosition` VARCHAR(255) NOT NULL DEFAULT 'left';
