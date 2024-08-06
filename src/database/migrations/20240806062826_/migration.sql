/*
  Warnings:

  - A unique constraint covering the columns `[postFirebaseUid,userFirebaseUid]` on the table `PostBookmark` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `PostBookmark_postFirebaseUid_userFirebaseUid_key` ON `PostBookmark`(`postFirebaseUid`, `userFirebaseUid`);
