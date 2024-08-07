/*
  Warnings:

  - You are about to drop the column `postFirebaseUid` on the `PostBookmark` table. All the data in the column will be lost.
  - You are about to drop the column `userFirebaseUid` on the `PostBookmark` table. All the data in the column will be lost.
  - Added the required column `postId` to the `PostBookmark` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `PostBookmark` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `PostBookmark_postFirebaseUid_idx` ON `PostBookmark`;

-- DropIndex
DROP INDEX `PostBookmark_postFirebaseUid_userFirebaseUid_key` ON `PostBookmark`;

-- DropIndex
DROP INDEX `PostBookmark_userFirebaseUid_idx` ON `PostBookmark`;

-- AlterTable
ALTER TABLE `PostBookmark` DROP COLUMN `postFirebaseUid`,
    DROP COLUMN `userFirebaseUid`,
    ADD COLUMN `postId` INTEGER NOT NULL,
    ADD COLUMN `userId` INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX `PostBookmark_postId_idx` ON `PostBookmark`(`postId`);

-- CreateIndex
CREATE INDEX `PostBookmark_userId_idx` ON `PostBookmark`(`userId`);
