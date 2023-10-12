/*
  Warnings:

  - You are about to drop the `Session` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX `Category_name_idx` ON `Category`;

-- DropTable
DROP TABLE `Session`;

-- CreateIndex
CREATE FULLTEXT INDEX `Category_name_description_idx` ON `Category`(`name`, `description`);
