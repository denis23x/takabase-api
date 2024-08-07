/*
  Warnings:

  - You are about to drop the column `userId` on the `PostBookmark` table. All the data in the column will be lost.
  - Added the required column `userFirebaseUid` to the `PostBookmark` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `PostBookmark_userId_idx` ON `PostBookmark`;

-- AlterTable
ALTER TABLE `PostBookmark` DROP COLUMN `userId`,
    ADD COLUMN `userFirebaseUid` VARCHAR(255) NOT NULL;

-- CreateIndex
CREATE INDEX `PostBookmark_userFirebaseUid_idx` ON `PostBookmark`(`userFirebaseUid`);
