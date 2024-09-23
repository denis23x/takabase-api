/*
  Warnings:

  - You are about to drop the column `image` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `image` on the `PostPassword` table. All the data in the column will be lost.
  - You are about to drop the column `image` on the `PostPrivate` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Post` DROP COLUMN `image`;

-- AlterTable
ALTER TABLE `PostPassword` DROP COLUMN `image`;

-- AlterTable
ALTER TABLE `PostPrivate` DROP COLUMN `image`;
