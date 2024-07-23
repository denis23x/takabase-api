-- CreateTable
CREATE TABLE `PostPrivate` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `firebaseUid` VARCHAR(255) NOT NULL,
    `description` VARCHAR(255) NOT NULL,
    `markdown` TEXT NOT NULL,
    `image` VARCHAR(255) NULL,
    `userFirebaseUid` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` DATETIME(6) NULL,

    UNIQUE INDEX `PostPrivate_name_key`(`name`),
    UNIQUE INDEX `PostPrivate_firebaseUid_key`(`firebaseUid`),
    INDEX `PostPrivate_firebaseUid_idx`(`firebaseUid`),
    INDEX `PostPrivate_userFirebaseUid_idx`(`userFirebaseUid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
