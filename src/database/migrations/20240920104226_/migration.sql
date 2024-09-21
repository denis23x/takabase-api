/*
  Warnings:

  - You are about to drop the column `firebaseUid` on the `PostPrivate` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `PostPrivate_firebaseUid_idx` ON `PostPrivate`;

-- DropIndex
DROP INDEX `PostPrivate_firebaseUid_key` ON `PostPrivate`;

-- AlterTable
ALTER TABLE `PostPrivate` DROP COLUMN `firebaseUid`;
