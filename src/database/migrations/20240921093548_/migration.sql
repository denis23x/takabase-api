/*
  Warnings:

  - You are about to drop the column `firebaseUid` on the `Post` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `Post_firebaseUid_idx` ON `Post`;

-- DropIndex
DROP INDEX `Post_firebaseUid_key` ON `Post`;

-- AlterTable
ALTER TABLE `Post` DROP COLUMN `firebaseUid`;
