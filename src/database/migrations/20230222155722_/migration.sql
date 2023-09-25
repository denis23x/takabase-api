-- AlterTable
ALTER TABLE `Settings` MODIFY `theme` VARCHAR(255) NOT NULL DEFAULT 'light',
    MODIFY `language` VARCHAR(255) NOT NULL DEFAULT 'en',
    MODIFY `buttons` VARCHAR(255) NOT NULL DEFAULT 'left',
    MODIFY `monospace` BOOLEAN NOT NULL DEFAULT true,
    MODIFY `background` VARCHAR(255) NOT NULL DEFAULT 'slanted-gradient';

-- AlterTable
ALTER TABLE `User` MODIFY `description` VARCHAR(255) NULL;
