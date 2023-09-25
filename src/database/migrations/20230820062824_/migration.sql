-- CreateIndex
CREATE FULLTEXT INDEX `Post_name_description_idx` ON `Post`(`name`, `description`);
