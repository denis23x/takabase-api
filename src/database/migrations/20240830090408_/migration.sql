-- CreateTable
CREATE TABLE `Insights` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `categories` INTEGER NOT NULL,
    `posts` INTEGER NOT NULL,
    `users` INTEGER NOT NULL,
    `unix` BIGINT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` DATETIME(6) NULL,

    UNIQUE INDEX `Insights_unix_key`(`unix`),
    INDEX `Insights_unix_idx`(`unix`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
