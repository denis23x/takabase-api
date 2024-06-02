/*
  Warnings:

  - Made the column `userFirebaseUid` on table `Category` required. This step will fail if there are existing NULL values in that column.
  - Made the column `userFirebaseUid` on table `Post` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `Category` MODIFY `userFirebaseUid` VARCHAR(255) NOT NULL;

-- AlterTable
ALTER TABLE `Post` MODIFY `userFirebaseUid` VARCHAR(255) NOT NULL;

-- CreateIndex
CREATE INDEX `Category_userFirebaseUid_idx` ON `Category`(`userFirebaseUid`);

-- CreateIndex
CREATE INDEX `Post_userFirebaseUid_idx` ON `Post`(`userFirebaseUid`);
