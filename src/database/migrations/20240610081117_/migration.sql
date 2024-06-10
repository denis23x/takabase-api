/*
  Warnings:

  - You are about to drop the column `userId` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Post` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name,userFirebaseUid]` on the table `Category` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `Category_name_userId_key` ON `Category`;

-- DropIndex
DROP INDEX `Category_userId_idx` ON `Category`;

-- DropIndex
DROP INDEX `Post_userId_idx` ON `Post`;

-- AlterTable
ALTER TABLE `Category` DROP COLUMN `userId`;

-- AlterTable
ALTER TABLE `Post` DROP COLUMN `userId`;

-- CreateIndex
CREATE UNIQUE INDEX `Category_name_userFirebaseUid_key` ON `Category`(`name`, `userFirebaseUid`);
