-- CreateTable
CREATE TABLE `Feedback` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` VARCHAR(255) NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `deletedAt` DATETIME(6) NULL,

    INDEX `Feedback_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `theme` VARCHAR(255) NOT NULL DEFAULT 'auto',
    `themePrism` VARCHAR(255) NOT NULL DEFAULT 'default',
    `themeBackground` VARCHAR(255) NOT NULL DEFAULT 'slanted-gradient',
    `language` VARCHAR(255) NOT NULL DEFAULT 'en-US',
    `pageScrollToTop` BOOLEAN NOT NULL DEFAULT false,
    `pageScrollInfinite` BOOLEAN NOT NULL DEFAULT true,
    `pageRedirectHome` BOOLEAN NOT NULL DEFAULT true,
    `windowButtonPosition` VARCHAR(255) NOT NULL DEFAULT 'left',
    `markdownMonospace` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    UNIQUE INDEX `Settings_userId_key`(`userId`),
    INDEX `Settings_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `googleId` VARCHAR(255) NULL,
    `firebaseId` VARCHAR(255) NOT NULL,
    `facebookId` VARCHAR(255) NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` VARCHAR(255) NULL,
    `avatar` VARCHAR(255) NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `deletedAt` DATETIME(6) NULL,
    `githubId` VARCHAR(255) NULL,
    `terms` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `User_firebaseId_key`(`firebaseId`),
    UNIQUE INDEX `User_name_key`(`name`),
    FULLTEXT INDEX `User_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Category` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` VARCHAR(255) NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `deletedAt` DATETIME(6) NULL,

    INDEX `Category_userId_idx`(`userId`),
    UNIQUE INDEX `Category_name_userId_key`(`name`, `userId`),
    FULLTEXT INDEX `Category_name_description_idx`(`name`, `description`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Post` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `description` VARCHAR(255) NOT NULL,
    `markdown` TEXT NOT NULL,
    `image` VARCHAR(255) NULL,
    `userId` INTEGER NOT NULL,
    `categoryId` INTEGER NOT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `deletedAt` DATETIME(6) NULL,

    INDEX `Post_categoryId_idx`(`categoryId`),
    INDEX `Post_userId_idx`(`userId`),
    UNIQUE INDEX `Post_name_categoryId_key`(`name`, `categoryId`),
    FULLTEXT INDEX `Post_name_description_idx`(`name`, `description`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
