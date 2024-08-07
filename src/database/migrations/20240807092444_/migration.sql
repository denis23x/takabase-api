/*
  Warnings:

  - A unique constraint covering the columns `[postId,userFirebaseUid]` on the table `PostBookmark` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `PostBookmark_postId_userFirebaseUid_key` ON `PostBookmark`(`postId`, `userFirebaseUid`);
