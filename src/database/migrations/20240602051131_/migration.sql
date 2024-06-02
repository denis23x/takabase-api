/*
  Warnings:

  - A unique constraint covering the columns `[id,firebaseUid]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `Category` ADD COLUMN `userFirebaseUid` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `Post` ADD COLUMN `userFirebaseUid` VARCHAR(255) NULL;

-- CreateIndex
CREATE INDEX `Post_firebaseUid_idx` ON `Post`(`firebaseUid`);

-- CreateIndex
CREATE INDEX `User_firebaseUid_idx` ON `User`(`firebaseUid`);

-- CreateIndex
CREATE UNIQUE INDEX `User_id_firebaseUid_key` ON `User`(`id`, `firebaseUid`);
