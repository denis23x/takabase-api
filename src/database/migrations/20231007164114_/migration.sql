/*
  Warnings:

  - A unique constraint covering the columns `[name,categoryId]` on the table `Post` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[firebaseId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `Post_name_userId_categoryId_key` ON `Post`;

-- CreateIndex
CREATE UNIQUE INDEX `Post_name_categoryId_key` ON `Post`(`name`, `categoryId`);

-- CreateIndex
CREATE UNIQUE INDEX `User_firebaseId_key` ON `User`(`firebaseId`);
