-- CreateTable
CREATE TABLE `PostBookmark` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `postFirebaseUid` VARCHAR(255) NOT NULL,
    `userFirebaseUid` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` DATETIME(6) NULL,

    INDEX `PostBookmark_postFirebaseUid_idx`(`postFirebaseUid`),
    INDEX `PostBookmark_userFirebaseUid_idx`(`userFirebaseUid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
