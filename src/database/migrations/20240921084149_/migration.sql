/*
  Warnings:

  - You are about to drop the column `firebaseUid` on the `PostPassword` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name,userFirebaseUid]` on the table `PostPassword` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,userFirebaseUid]` on the table `PostPrivate` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `PostPassword_firebaseUid_idx` ON `PostPassword`;

-- DropIndex
DROP INDEX `PostPassword_firebaseUid_key` ON `PostPassword`;

-- DropIndex
DROP INDEX `PostPassword_name_key` ON `PostPassword`;

-- DropIndex
DROP INDEX `PostPrivate_name_key` ON `PostPrivate`;

-- AlterTable
ALTER TABLE `PostPassword` DROP COLUMN `firebaseUid`;

-- CreateIndex
CREATE UNIQUE INDEX `PostPassword_name_userFirebaseUid_key` ON `PostPassword`(`name`, `userFirebaseUid`);

-- CreateIndex
CREATE UNIQUE INDEX `PostPrivate_name_userFirebaseUid_key` ON `PostPrivate`(`name`, `userFirebaseUid`);
